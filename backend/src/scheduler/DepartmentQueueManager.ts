import { Patient, HospitalDepartment } from '../types/patient';
import { validatePatientInput, ValidationResult } from '../patients/patientValidator';
import { calculateDynamicPriorityScore, sortPatientQueueByPriority } from './PriorityEngine';

export class DepartmentQueueManager {
  private queues: Map<HospitalDepartment, Patient[]> = new Map();

  constructor() {
    this.initializeQueues();
  }

  private initializeQueues(): void {
    const departments: HospitalDepartment[] = [
      'CARDIOLOGY',
      'NEUROLOGY',
      'ORTHOPEDICS',
      'GENERAL_SURGERY',
      'EMERGENCY_ER',
      'PULMONOLOGY',
      'PEDIATRICS',
    ];

    for (const dept of departments) {
      this.queues.set(dept, []);
    }
  }

  /**
   * Enqueues a patient into their department-specific queue.
   * Performs validation first. If invalid, rejects and returns errors.
   */
  public enqueuePatient(
    patientInput: Partial<Patient>,
    currentSimTimeMinutes: number = 0
  ): { success: boolean; patient?: Patient; errors?: string[] } {
    // 1. Validate Input Payload
    const validation: ValidationResult = validatePatientInput(patientInput);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // 2. Build full Patient entity with defaults
    const dept = patientInput.department!;
    const fullPatient: Patient = {
      id: patientInput.id!,
      name: patientInput.name!,
      age: patientInput.age!,
      department: dept,
      vitals: patientInput.vitals,
      cardiologySymptoms: patientInput.cardiologySymptoms,
      neurologySymptoms: patientInput.neurologySymptoms,
      pulmonologySymptoms: patientInput.pulmonologySymptoms,
      traumaSymptoms: patientInput.traumaSymptoms,
      criticalLevel: patientInput.criticalLevel ?? 0,
      deteriorationRate: patientInput.deteriorationRate ?? 15,
      treatmentDuration: patientInput.treatmentDuration ?? 0,
      arrivalTime: patientInput.arrivalTime ?? currentSimTimeMinutes,
      waitingStartTime: patientInput.waitingStartTime ?? currentSimTimeMinutes,
      requiredResources: patientInput.requiredResources ?? [],
      status: 'WAITING',
      priorityScore: 0,
    };

    // 3. Compute dynamic priority score
    calculateDynamicPriorityScore(fullPatient, currentSimTimeMinutes);

    // 4. Insert into Department Queue & Sort
    const deptQueue = this.queues.get(dept) ?? [];
    deptQueue.push(fullPatient);
    sortPatientQueueByPriority(deptQueue, currentSimTimeMinutes);
    this.queues.set(dept, deptQueue);

    return { success: true, patient: fullPatient };
  }

  /**
   * Recalculates dynamic priority scores for all waiting patients across all department queues.
   * Updates wait time penalties Ws and deterioration D, then re-sorts queues.
   */
  public recalculateAndSortAll(currentSimTimeMinutes: number): void {
    for (const [dept, queue] of this.queues.entries()) {
      if (queue.length > 0) {
        sortPatientQueueByPriority(queue, currentSimTimeMinutes);
      }
    }
  }

  /**
   * Peeks the top priority patient for a specific department queue.
   */
  public peekNextPatientForDepartment(dept: HospitalDepartment): Patient | undefined {
    const queue = this.queues.get(dept);
    return queue && queue.length > 0 ? queue[0] : undefined;
  }

  /**
   * Scans all department queues to find the globally highest priority patient.
   */
  public peekHighestPriorityGlobal(): Patient | undefined {
    let topPatient: Patient | undefined = undefined;

    for (const queue of this.queues.values()) {
      if (queue.length > 0) {
        const candidate = queue[0];
        if (!topPatient || candidate.priorityScore > topPatient.priorityScore) {
          topPatient = candidate;
        }
      }
    }

    return topPatient;
  }

  /**
   * Removes a patient from their department queue once allocated or cancelled.
   */
  public dequeuePatient(patientId: string): Patient | undefined {
    for (const [dept, queue] of this.queues.entries()) {
      const index = queue.findIndex((p) => p.id === patientId);
      if (index !== -1) {
        const [removed] = queue.splice(index, 1);
        return removed;
      }
    }
    return undefined;
  }

  /**
   * Returns all patients in a specific department queue.
   */
  public getDepartmentQueue(dept: HospitalDepartment): Patient[] {
    return this.queues.get(dept) ?? [];
  }

  /**
   * Returns complete detailed live queue contents for ALL 7 departments.
   * Formatted for Socket.IO broadcast payload to Frontend UI.
   */
  public getAllDepartmentQueuesFull(currentSimTimeMinutes: number = 0): Record<string, any[]> {
    const state: Record<string, any[]> = {};

    for (const [dept, queue] of this.queues.entries()) {
      state[dept] = queue.map((p) => {
        const waitingMinutes = p.waitingStartTime !== undefined ? currentSimTimeMinutes - p.waitingStartTime : 0;
        return {
          id: p.id,
          name: p.name,
          age: p.age,
          department: p.department,
          criticalLevel: p.criticalLevel,
          deteriorationRate: p.deteriorationRate,
          treatmentDuration: p.treatmentDuration,
          priorityScore: p.priorityScore,
          arrivalTime: p.arrivalTime,
          waitingStartTime: p.waitingStartTime,
          waitingMinutes: Math.max(0, waitingMinutes),
          status: p.status,
          requiredResources: p.requiredResources,
        };
      });
    }

    return state;
  }

  /**
   * Returns queue summary statistics across all departments.
   */
  public getAllQueuesSummary(): Record<string, { count: number; topPriority: number }> {
    const summary: Record<string, { count: number; topPriority: number }> = {};
    for (const [dept, queue] of this.queues.entries()) {
      summary[dept] = {
        count: queue.length,
        topPriority: queue.length > 0 ? queue[0].priorityScore : 0,
      };
    }
    return summary;
  }
}
