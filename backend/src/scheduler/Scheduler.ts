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
  completedPatientsCount: number;
}

export class Scheduler {
  private queueManager: DepartmentQueueManager;
  private allocator: ResourceAllocator;
  private activeTreatments: Patient[] = [];
  private completedTreatments: Patient[] = [];

  constructor(queueManager: DepartmentQueueManager, allocator: ResourceAllocator) {
    this.queueManager = queueManager;
    this.allocator = allocator;
  }

  /**
   * Checks active treatments and releases resources for any patient whose treatment end time has been reached.
   * Returns array of departments that had treatments completed in this cycle.
   */
  public checkAndReleaseCompletedTreatments(currentSimTimeMinutes: number): HospitalDepartment[] {
    const releasedDepts = new Set<HospitalDepartment>();

    this.activeTreatments = this.activeTreatments.filter((patient) => {
      const endTime = patient.treatmentEndTime ?? (patient.treatmentStartTime ?? currentSimTimeMinutes) + (patient.treatmentDuration || 30);
      if (currentSimTimeMinutes >= endTime) {
        patient.status = 'COMPLETED';
        this.allocator.releasePatientResources(patient.id);
        releasedDepts.add(patient.department);
        this.completedTreatments.push(patient);
        return false;
      }
      return true;
    });

    return Array.from(releasedDepts);
  }

  /**
   * Executes event-driven scheduling & resource allocation cycle at simulation time t.
   */
  public runAllocationCycle(
    currentSimTimeMinutes: number,
    targetDepartments?: HospitalDepartment[]
  ): CycleSummary {
    // 1. Recalculate Priority Scores & Re-sort Queues
    this.queueManager.recalculateAndSortAll(currentSimTimeMinutes);

    const successfulAllocations: CycleAllocationRecord[] = [];
    let failedCount = 0;

    // Determine departments to scan
    const deptsToScan: HospitalDepartment[] = targetDepartments && targetDepartments.length > 0
      ? [...targetDepartments]
      : [
          'EMERGENCY_ER',
          'CARDIOLOGY',
          'NEUROLOGY',
          'ORTHOPEDICS',
          'GENERAL_SURGERY',
          'PULMONOLOGY',
          'PEDIATRICS'
        ];

    // Sort departments by highest priority top waiting patient (descending) for event-driven fairness
    deptsToScan.sort((a, b) => {
      const qA = this.queueManager.getDepartmentQueue(a);
      const qB = this.queueManager.getDepartmentQueue(b);
      const topScoreA = qA.length > 0 ? qA[0].priorityScore : -1;
      const topScoreB = qB.length > 0 ? qB[0].priorityScore : -1;

      if (topScoreB !== topScoreA) {
        return topScoreB - topScoreA;
      }

      const arrivalA = qA.length > 0 ? (qA[0].arrivalTime ?? 0) : Infinity;
      const arrivalB = qB.length > 0 ? (qB[0].arrivalTime ?? 0) : Infinity;
      return arrivalA - arrivalB;
    });

    // Scan target department queues from Highest to Lowest Priority
    for (const dept of deptsToScan) {
      const deptQueue = this.queueManager.getDepartmentQueue(dept);
      if (!deptQueue || deptQueue.length === 0) continue;

      // Scan waiting queue sequentially (High to Low Priority)
      for (const candidate of [...deptQueue]) {
        const result: AllocationResult = this.allocator.allocateAtomic(candidate, currentSimTimeMinutes);

        if (result.allocated) {
          // Remove from waiting queue and move to Active Treatments
          this.queueManager.dequeuePatient(candidate.id);
          candidate.status = 'IN_TREATMENT';
          candidate.treatmentStartTime = currentSimTimeMinutes;
          candidate.treatmentEndTime = currentSimTimeMinutes + (candidate.treatmentDuration || 30);
          (candidate as any).allocatedResourceIds = result.allocatedResourceIds;
          this.activeTreatments.push(candidate);

          successfulAllocations.push({
            patientId: candidate.id,
            patientName: candidate.name,
            department: candidate.department,
            priorityScore: candidate.priorityScore,
            allocatedResourceIds: result.allocatedResourceIds,
            startTime: candidate.treatmentStartTime,
            estimatedEndTime: candidate.treatmentEndTime,
          });
        } else {
          failedCount++;
        }
      }
    }

    const queuesSummary = this.queueManager.getAllQueuesSummary();
    const totalWaiting = Object.values(queuesSummary).reduce((acc, curr) => acc + curr.count, 0);

    return {
      simTimeMinutes: currentSimTimeMinutes,
      totalWaitingPatients: totalWaiting,
      successfulAllocations,
      failedAllocationsCount: failedCount,
      completedPatientsCount: this.completedTreatments.length,
    };
  }

  public getActiveTreatments(): Patient[] {
    return this.activeTreatments;
  }

  public getCompletedTreatments(): Patient[] {
    return this.completedTreatments;
  }

  public reset(): void {
    this.activeTreatments = [];
    this.completedTreatments = [];
  }
}
