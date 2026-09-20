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
  public hasPatient(patientId: string): boolean {
    for (const queue of this.queues.values()) {
      if (queue.some((p) => p.id === patientId)) return true;
    }
    return false;
  }

  /**
   * Enqueues a patient into their department-specific queue.
   * Performs validation first. If invalid, rejects and returns errors.
   * Prevents duplicate patient entries and preserves original waitingStartTime.
   */
  public enqueuePatient(
    patientInput: Partial<Patient>,
    currentSimTimeMinutes: number = 0
  ): { success: boolean; patient?: Patient; errors?: string[] } {
    // 1. Check if patient already exists in queue -> update in-place without resetting waitingStartTime
    const dept = patientInput.department!;
    for (const queue of this.queues.values()) {
      const existingIndex = queue.findIndex((p) => p.id === patientInput.id);
      if (existingIndex !== -1) {
        const existing = queue[existingIndex];
        // Preserve original timestamps
        const originalWaitingStart = existing.waitingStartTime ?? patientInput.waitingStartTime ?? currentSimTimeMinutes;
        const originalArrival = existing.arrivalTime ?? patientInput.arrivalTime ?? currentSimTimeMinutes;

        Object.assign(existing, {
          ...patientInput,
          arrivalTime: originalArrival,
          waitingStartTime: originalWaitingStart,
          status: 'WAITING',
        });
        calculateDynamicPriorityScore(existing, currentSimTimeMinutes);
        sortPatientQueueByPriority(queue, currentSimTimeMinutes);
        return { success: true, patient: existing };
      }
    }

    // 2. Validate Input Payload for new patient
    const validation: ValidationResult = validatePatientInput(patientInput);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const pAny = patientInput as any;
    const initialBase = patientInput.baseCriticalLevel ?? pAny.base_critical_level ?? patientInput.priorityScore ?? pAny.priority_score ?? patientInput.criticalLevel ?? pAny.critical_level;

    // 3. Build full Patient entity with defaults
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
      baseCriticalLevel: initialBase,
      criticalLevel: patientInput.criticalLevel ?? initialBase ?? 0,
      deteriorationRate: patientInput.deteriorationRate ?? 15,
      treatmentDuration: patientInput.treatmentDuration ?? 0,
      arrivalTime: patientInput.arrivalTime ?? currentSimTimeMinutes,
      waitingStartTime: patientInput.waitingStartTime ?? currentSimTimeMinutes,
      requiredResources: patientInput.requiredResources ?? [],
      status: 'WAITING',
      priorityScore: patientInput.priorityScore ?? initialBase ?? 0,
    };

    // 4. Compute dynamic priority score
    calculateDynamicPriorityScore(fullPatient, currentSimTimeMinutes);

    // 5. Insert into Department Queue & Sort
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
