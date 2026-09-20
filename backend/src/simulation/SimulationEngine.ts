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
   * Buffers patients in RAM to be injected into the simulation at their specified arrivalTime.
   */
  public async schedulePatients(patients: any[]): Promise<void> {
    const formatted = patients.map(p => ({
      ...p,
      id: p.id,
      name: p.name,
      age: p.age,
      department: p.department,
      vitals: typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {}),
      criticalLevel: p.criticalLevel ?? p.critical_level ?? 50,
      deteriorationRate: p.deteriorationRate ?? p.deterioration_rate ?? 15,
      treatmentDuration: p.treatmentDuration ?? p.treatment_duration ?? 30,
      arrivalTime: p.arrivalTime ?? p.arrival_time ?? 0,
      priorityScore: p.priorityScore ?? p.priority_score ?? 50,
      status: p.status || 'REGISTERED',
      requiredResources: p.requiredResources ?? (typeof p.required_resources === 'string' ? JSON.parse(p.required_resources) : p.required_resources) ?? []
    }));

    this.scheduledPatients.push(...formatted);
    console.log(`[SimulationEngine] Buffered ${formatted.length} patients in RAM for future arrival injection.`);
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
      this.onCycleCallback(summary, this.queueManager.getAllDepartmentQueuesFull(currentSimTime));
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
      const symptomsJson = typeof patient.symptoms === 'string' ? JSON.parse(patient.symptoms) : (patient.symptoms || {});
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
        criticalLevel: patient.criticalLevel ?? patient.critical_level ?? 50,
        deteriorationRate: patient.deteriorationRate ?? patient.deterioration_rate ?? 15,
        treatmentDuration: patient.treatmentDuration ?? patient.treatment_duration ?? 30,
        arrivalTime: patient.arrivalTime ?? patient.arrival_time ?? 0,
        priorityScore: patient.priorityScore ?? patient.priority_score ?? 50,
        status: 'WAITING',
      };
      this.queueManager.enqueuePatient(patientData, simTimeMinutes);
    }

    // 1. Recalculate Dynamic Priority Scores & Re-Sort Queues in RAM
    this.queueManager.recalculateAndSortAll(simTimeMinutes);

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
