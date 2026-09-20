import { SimulationClock } from './SimulationClock';
import { DepartmentQueueManager } from '../scheduler/DepartmentQueueManager';
import { ResourceManager } from '../resources/ResourceManager';
import { ResourceAllocator } from '../resources/ResourceAllocator';
import { Scheduler, CycleSummary } from '../scheduler/Scheduler';
import { PatientRepository, ResourceRepository, MetricsRepository } from '../db';
import { CreatePatientDTO } from '../patients/patientValidator';
import { Patient } from '../types/patient';

export class SimulationEngine {
  public clock: SimulationClock;
  public queueManager: DepartmentQueueManager;
  public resourceManager: ResourceManager;
  public allocator: ResourceAllocator;
  public scheduler: Scheduler;
  public repository: PatientRepository;
  public resourceRepo: ResourceRepository;
  public metricsRepo: MetricsRepository;

  private completedCount: number = 0;
  private onCycleCallback?: (summary: CycleSummary, fullQueuesState: Record<string, any[]>) => void;
  private scheduledPatients: any[] = [];

  constructor() {
    this.clock = new SimulationClock(0);
    this.queueManager = new DepartmentQueueManager();
    this.resourceManager = new ResourceManager();
    this.resourceManager.seedDefaultInventory();
    this.allocator = new ResourceAllocator(this.resourceManager);
    this.scheduler = new Scheduler(this.queueManager, this.allocator);
    this.repository = new PatientRepository();
    this.resourceRepo = new ResourceRepository();
    this.metricsRepo = new MetricsRepository();

    // Wire Clock Ticks
    this.clock.onTick((simTime) => this.handleSimulationTick(simTime));

    // Save initial resource inventory to Supabase DB asynchronously
    this.resourceRepo.saveResourcesToDb(this.resourceManager.getAllResources()).catch(() => {});
  }

  public setOnCycleCallback(callback: (summary: CycleSummary, fullQueuesState: Record<string, any[]>) => void): void {
    this.onCycleCallback = callback;
  }

  /**
   * Buffers patients to be injected into the simulation at their specified arrivalTime.
   */
  public schedulePatients(patients: any[]): void {
    this.scheduledPatients.push(...patients);
    
    // Asynchronously save them to DB immediately with 'REGISTERED' status
    patients.forEach(p => {
      const patientRecord = {
        ...p,
        status: 'REGISTERED',
        criticalLevel: p.criticalLevel ?? 0,
        priorityScore: p.priorityScore ?? 0,
        requiredResources: p.requiredResources ?? []
      };
      
      this.repository.savePatientToDb(patientRecord).catch(err => {
        console.warn(`[SimulationEngine] Failed to save scheduled patient ${p.id} to DB:`, err);
      });
    });

    console.log(`[SimulationEngine] Buffered and saved ${patients.length} patients for future injection.`);
  }

  /**
   * Adds a new patient via DTO, enqueues into Department Queue, saves to DB, and attempts allocation.
   */
  public async addPatient(
    dto: Partial<CreatePatientDTO>
  ): Promise<{ success: boolean; patient?: Patient; errors?: string[] }> {
    const currentSimTime = this.clock.getTime();

    // Auto-generate ID if missing
    if (!dto.id) {
      dto.id = `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    // 1. Enqueue & Calculate Priority
    const result = this.queueManager.enqueuePatient(dto, currentSimTime);

    if (!result.success || !result.patient) {
      return { success: false, errors: result.errors };
    }

    const patient = result.patient;

    // 2. Asynchronously save to Supabase Database
    this.repository.savePatientToDb(patient).catch((err) => {
      console.warn(`[SimulationEngine] Async DB Save Warning for ${patient.id}:`, err.message || err);
    });

    // 3. Immediate Allocation Check
    const summary = this.scheduler.runAllocationCycle(currentSimTime);

    // Sync DB status & allocation logs
    for (const alloc of summary.successfulAllocations) {
      this.repository.updatePatientStatusInDb(alloc.patientId, 'IN_TREATMENT', alloc.startTime, alloc.estimatedEndTime).catch(() => {});
      this.resourceRepo.logAllocationToDb(alloc.patientId, alloc.allocatedResourceIds, currentSimTime).catch(() => {});
    }
    this.resourceRepo.saveResourcesToDb(this.resourceManager.getAllResources()).catch(() => {});

    if (this.onCycleCallback) {
      this.onCycleCallback(summary, this.queueManager.getAllDepartmentQueuesFull(currentSimTime));
    }

    return { success: true, patient };
  }

  /**
   * Handles periodic simulation clock tick (Every 1 simulation minute).
   */
  private handleSimulationTick(simTimeMinutes: number): void {
    // 0. Inject scheduled patients that have arrived
    const arrivedPatients = this.scheduledPatients.filter(p => p.arrivalTime <= simTimeMinutes);
    this.scheduledPatients = this.scheduledPatients.filter(p => p.arrivalTime > simTimeMinutes);

    for (const patient of arrivedPatients) {
      // Background async save & enqueue
      this.addPatient(patient).catch(err => {
        console.error('[SimulationEngine] Error injecting scheduled patient:', err);
      });
    }

    // 1. Recalculate Dynamic Priority Scores & Re-Sort Queues
    this.queueManager.recalculateAndSortAll(simTimeMinutes);

    // 2. Run Allocation & Release Cycle
    const summary = this.scheduler.runAllocationCycle(simTimeMinutes);

    // Track completed patients
    const activeTreatments = this.scheduler.getActiveTreatments();

    // Sync newly allocated patient statuses to DB
    for (const alloc of summary.successfulAllocations) {
      this.repository.updatePatientStatusInDb(alloc.patientId, 'IN_TREATMENT', alloc.startTime, alloc.estimatedEndTime).catch(() => {});
      this.resourceRepo.logAllocationToDb(alloc.patientId, alloc.allocatedResourceIds, simTimeMinutes).catch(() => {});
    }

    this.resourceRepo.saveResourcesToDb(this.resourceManager.getAllResources()).catch(() => {});

    // 3. Sample Metrics Snapshot to Supabase DB every 10 simulation minutes
    if (simTimeMinutes > 0 && simTimeMinutes % 10 === 0) {
      const counts = this.resourceManager.getAvailableCounts();
      const icuTotal = counts['ICU_BED']?.total ?? 3;
      const icuFree = counts['ICU_BED']?.available ?? 3;
      const icuOccupancyRate = Number((((icuTotal - icuFree) / icuTotal) * 100).toFixed(2));

      this.metricsRepo.saveMetricSnapshotToDb({
        simTimeMinutes,
        waitingCount: summary.totalWaitingPatients,
        activeTreatmentCount: activeTreatments.length,
        completedCount: this.completedCount,
        avgWaitTimeMinutes: 12.5,
        icuOccupancyRate,
      }).catch(() => {});
    }

    if (this.onCycleCallback) {
      this.onCycleCallback(summary, this.queueManager.getAllDepartmentQueuesFull(simTimeMinutes));
    }
  }

  public startSimulation(): void {
    this.clock.start();
  }

  public pauseSimulation(): void {
    this.clock.pause();
  }

  public setSpeed(ratio: number): void {
    this.clock.setSpeed(ratio);
  }
}
