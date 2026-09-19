import { DepartmentQueueManager } from './DepartmentQueueManager';
import { ResourceAllocator, AllocationResult } from '../resources/ResourceAllocator';
import { Patient, HospitalDepartment } from '../types/patient';

export interface CycleAllocationRecord {
  patientId: string;
  patientName: string;
  department: HospitalDepartment;
  priorityScore: number;
  allocatedResourceIds: string[];
  startTime: number;
  estimatedEndTime: number;
}

export interface CycleSummary {
  simTimeMinutes: number;
  totalWaitingPatients: number;
  successfulAllocations: CycleAllocationRecord[];
  failedAllocationsCount: number;
}

export class Scheduler {
  private queueManager: DepartmentQueueManager;
  private allocator: ResourceAllocator;
  private activeTreatments: Patient[] = [];

  constructor(queueManager: DepartmentQueueManager, allocator: ResourceAllocator) {
    this.queueManager = queueManager;
    this.allocator = allocator;
  }

  /**
   * Executes a scheduling & resource allocation cycle at simulation time t.
   */
  public runAllocationCycle(currentSimTimeMinutes: number): CycleSummary {
    // 1. Recalculate Priority Scores & Re-sort Queues
    this.queueManager.recalculateAndSortAll(currentSimTimeMinutes);

    // 2. Check for Completed Treatments & Release Resources
    this.checkAndReleaseCompletedTreatments(currentSimTimeMinutes);

    const successfulAllocations: CycleAllocationRecord[] = [];
    let failedCount = 0;

    // 3. Global Allocation Scan: Repeatedly attempt allocation for highest priority waiting patient
    let candidate = this.queueManager.peekHighestPriorityGlobal();

    while (candidate) {
      const result: AllocationResult = this.allocator.allocateAtomic(candidate, currentSimTimeMinutes);

      if (result.allocated) {
        // Remove from Queue
        this.queueManager.dequeuePatient(candidate.id);
        this.activeTreatments.push(candidate);

        successfulAllocations.push({
          patientId: candidate.id,
          patientName: candidate.name,
          department: candidate.department,
          priorityScore: candidate.priorityScore,
          allocatedResourceIds: result.allocatedResourceIds,
          startTime: candidate.treatmentStartTime!,
          estimatedEndTime: candidate.treatmentEndTime!,
        });

        // Peek next highest global priority patient after allocation
        candidate = this.queueManager.peekHighestPriorityGlobal();
      } else {
        // If allocation failed for highest priority candidate, try next patients in queue without starvation
        failedCount++;
        break; // Stop batch cycle to allow resources to free up or next tick
      }
    }

    const queuesSummary = this.queueManager.getAllQueuesSummary();
    const totalWaiting = Object.values(queuesSummary).reduce((acc, curr) => acc + curr.count, 0);

    return {
      simTimeMinutes: currentSimTimeMinutes,
      totalWaitingPatients: totalWaiting,
      successfulAllocations,
      failedAllocationsCount: failedCount,
    };
  }

  /**
   * Checks active treatments and releases resources for any patient whose treatment end time has been reached.
   */
  public checkAndReleaseCompletedTreatments(currentSimTimeMinutes: number): Patient[] {
    const completed: Patient[] = [];

    this.activeTreatments = this.activeTreatments.filter((patient) => {
      if (patient.treatmentEndTime && currentSimTimeMinutes >= patient.treatmentEndTime) {
        patient.status = 'COMPLETED';
        this.allocator.releasePatientResources(patient.id);
        completed.push(patient);
        return false;
      }
      return true;
    });

    return completed;
  }

  public getActiveTreatments(): Patient[] {
    return this.activeTreatments;
  }
}
