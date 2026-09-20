import { SimulationClock } from './SimulationClock';
import { DepartmentQueueManager } from '../scheduler/DepartmentQueueManager';
import { ResourceManager } from '../resources/ResourceManager';
import { ResourceAllocator } from '../resources/ResourceAllocator';
import { Scheduler, CycleSummary } from '../scheduler/Scheduler';
import { PatientRepository, ResourceRepository, MetricsRepository } from '../db';
import { CreatePatientDTO } from '../patients/patientValidator';
import { Patient, HospitalDepartment } from '../types/patient';
import { calculateDynamicPriorityScore } from '../scheduler/PriorityEngine';

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
  private onCycleCallback?: (
    summary: CycleSummary,
    fullQueuesState: Record<string, any[]>,
    activeTreatments: Patient[],
    completedTreatments: Patient[]
  ) => void;
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

  public setOnCycleCallback(
    callback: (
      summary: CycleSummary,
      fullQueuesState: Record<string, any[]>,
      activeTreatments: Patient[],
      completedTreatments: Patient[]
    ) => void
  ): void {
    this.onCycleCallback = callback;
  }

  /**
   * Buffers patients in RAM to be injected into the simulation at their specified arrivalTime.
   */
  public async schedulePatients(patients: any[]): Promise<void> {
    const activeTreatments = this.scheduler.getActiveTreatments();
    const completedTreatments = this.scheduler.getCompletedTreatments();

    const newPatients = patients.filter((p) => {
      const pid = p.id;
      if (!pid) return false;
      if (this.scheduledPatients.some((sp) => sp.id === pid)) return false;
      if (this.queueManager.hasPatient(pid)) return false;
      if (activeTreatments.some((ap) => ap.id === pid)) return false;
      if (completedTreatments.some((cp) => cp.id === pid)) return false;
      return true;
    });

    if (newPatients.length === 0) return;

    const formatted = newPatients.map(p => {
      const pAny = p as any;
      const initialScore = p.priorityScore ?? pAny.priority_score ?? p.criticalLevel ?? pAny.critical_level ?? p.baseCriticalLevel ?? pAny.base_critical_level;
      return {
        ...p,
        id: p.id,
        name: p.name,
        age: p.age,
        department: p.department,
        vitals: typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {}),
        baseCriticalLevel: p.baseCriticalLevel ?? pAny.base_critical_level ?? initialScore,
        criticalLevel: p.criticalLevel ?? pAny.critical_level ?? initialScore,
        deteriorationRate: p.deteriorationRate ?? pAny.deterioration_rate ?? 15,
        treatmentDuration: p.treatmentDuration ?? pAny.treatment_duration ?? 30,
        arrivalTime: p.arrivalTime ?? pAny.arrival_time ?? 0,
        priorityScore: initialScore,
        status: p.status || 'REGISTERED',
        requiredResources: p.requiredResources ?? (typeof pAny.required_resources === 'string' ? JSON.parse(pAny.required_resources) : pAny.required_resources) ?? []
      };
    });

    this.scheduledPatients.push(...formatted);
    console.log(`[SimulationEngine] Buffered ${formatted.length} new unique patients in RAM for future arrival injection.`);
  }

  /**
   * Adds a new patient via DTO, enqueues into Department Queue, and attempts allocation.
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

    // 2. Immediate Allocation Check
    const summary = this.scheduler.runAllocationCycle(currentSimTime, [patient.department]);

    if (this.onCycleCallback) {
      this.onCycleCallback(
        summary,
        this.queueManager.getAllDepartmentQueuesFull(currentSimTime),
        this.scheduler.getActiveTreatments(),
        this.scheduler.getCompletedTreatments()
      );
    }

    return { success: true, patient };
  }

  /**
   * Handles periodic simulation clock tick (Every 1 simulation minute).
   */
  private handleSimulationTick(simTimeMinutes: number): void {
    // 0. Inject scheduled patients that have arrived (Pure RAM enqueue)
    const arrivedPatients = this.scheduledPatients.filter(p => (p.arrivalTime ?? p.arrival_time ?? 0) <= simTimeMinutes);
    this.scheduledPatients = this.scheduledPatients.filter(p => (p.arrivalTime ?? p.arrival_time ?? 0) > simTimeMinutes);

    for (const patient of arrivedPatients) {
      const pAny = patient as any;
      const symptomsJson = typeof patient.symptoms === 'string' ? JSON.parse(patient.symptoms) : (patient.symptoms || {});
      const initialScore = patient.priorityScore ?? pAny.priority_score ?? patient.criticalLevel ?? pAny.critical_level ?? patient.baseCriticalLevel ?? pAny.base_critical_level;
      const patientData = {
        ...patient,
        id: patient.id,
        name: patient.name,
        age: patient.age,
        department: patient.department,
        vitals: typeof patient.vitals === 'string' ? JSON.parse(patient.vitals) : (patient.vitals || {}),
        cardiologySymptoms: patient.cardiologySymptoms ?? symptomsJson.cardiology,
        neurologySymptoms: patient.neurologySymptoms ?? symptomsJson.neurology,
        pulmonologySymptoms: patient.pulmonologySymptoms ?? symptomsJson.pulmonology,
        traumaSymptoms: patient.traumaSymptoms ?? symptomsJson.trauma,
        baseCriticalLevel: patient.baseCriticalLevel ?? pAny.base_critical_level ?? initialScore,
        criticalLevel: patient.criticalLevel ?? pAny.critical_level ?? initialScore,
        deteriorationRate: patient.deteriorationRate ?? pAny.deterioration_rate ?? 15,
        treatmentDuration: patient.treatmentDuration ?? pAny.treatment_duration ?? 30,
        arrivalTime: patient.arrivalTime ?? pAny.arrival_time ?? 0,
        priorityScore: initialScore,
        status: 'WAITING',
      };
      this.queueManager.enqueuePatient(patientData, simTimeMinutes);
    }

    // 1. Recalculate Dynamic Priority Scores & Re-Sort Queues in RAM
    this.queueManager.recalculateAndSortAll(simTimeMinutes);
    this.queueManager.logAllQueues(simTimeMinutes);

    // 2. Check for Completed Treatments & Release Resources
    const freedDepartments = this.scheduler.checkAndReleaseCompletedTreatments(simTimeMinutes);

    // 3. Event-Driven Scheduling Scan: Trigger allocation scan if new arrivals, start, or freed resources
    const shouldScan = arrivedPatients.length > 0 || simTimeMinutes === 1 || freedDepartments.length > 0;
    
    let summary: CycleSummary;
    if (shouldScan) {
      const targetDepts = freedDepartments.length > 0 ? freedDepartments : undefined;
      summary = this.scheduler.runAllocationCycle(simTimeMinutes, targetDepts);
    } else {
      const queuesSummary = this.queueManager.getAllQueuesSummary();
      const totalWaiting = Object.values(queuesSummary).reduce((acc, curr) => acc + curr.count, 0);
      summary = {
        simTimeMinutes,
        totalWaitingPatients: totalWaiting,
        successfulAllocations: [],
        failedAllocationsCount: 0,
        completedPatientsCount: this.scheduler.getCompletedTreatments().length,
      };
    }

    if (this.onCycleCallback) {
      this.onCycleCallback(
        summary,
        this.queueManager.getAllDepartmentQueuesFull(simTimeMinutes),
        this.scheduler.getActiveTreatments(),
        this.scheduler.getCompletedTreatments()
      );
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

  public resetSimulation(): void {
    this.clock.pause();
    this.clock = new SimulationClock(0);
    this.clock.onTick((simTime) => this.handleSimulationTick(simTime));
    this.queueManager = new DepartmentQueueManager();
    this.resourceManager = new ResourceManager();
    this.resourceManager.seedDefaultInventory();
    this.allocator = new ResourceAllocator(this.resourceManager);
    this.scheduler = new Scheduler(this.queueManager, this.allocator);
    this.scheduledPatients = [];
  }
}
