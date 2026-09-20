import { ResourceManager } from './ResourceManager';
import { Patient } from '../types/patient';
import { ResourceRequirement, Resource } from '../types/resource';

export interface AllocationResult {
  allocated: boolean;
  allocatedResourceIds: string[];
  missingRequirementTypes: string[];
}

export class ResourceAllocator {
  private resourceManager: ResourceManager;

  constructor(resourceManager: ResourceManager) {
    this.resourceManager = resourceManager;
  }

  /**
   * Attempts Atomic (All-or-Nothing) resource allocation for a Patient.
   * If ALL required resources are available simultaneously, locks them and returns allocated: true.
   * If any single resource requirement cannot be fulfilled, does 0 partial locking.
   */
  public allocateAtomic(
    patient: Patient,
    currentSimTimeMinutes: number
  ): AllocationResult {
    const requirements: ResourceRequirement[] = patient.requiredResources;

    // Fallback: If no custom resource requirements specified, infer default based on department & critical score
    const effectiveReqs = requirements.length > 0 ? requirements : this.getDefaultRequirementsForPatient(patient);

    const candidatesToLock: Resource[] = [];
    const missingTypes: string[] = [];

    // 1. Dry Run / Capability Check across all requirements
    for (const req of effectiveReqs) {
      const available = this.resourceManager.getAvailableResources(req.resourceType, req.specialization);

      // Filter out candidates already provisionally picked for a previous requirement in this batch
      const filtered = available.filter(
        (cand) => !candidatesToLock.some((picked) => picked.id === cand.id)
      );

      if (filtered.length >= req.quantity) {
        // Pick required quantity
        for (let i = 0; i < req.quantity; i++) {
          candidatesToLock.push(filtered[i]);
        }
      } else {
        missingTypes.push(`${req.resourceType}${req.specialization ? ` (${req.specialization})` : ''}`);
      }
    }

    // 2. Atomic All-or-Nothing Decision
    if (missingTypes.length > 0) {
      // Rejection / Failed allocation -> Zero partial locks applied
      return {
        allocated: false,
        allocatedResourceIds: [],
        missingRequirementTypes: missingTypes,
      };
    }

    // 3. Lock all picked resources simultaneously
    const lockedIds: string[] = [];
    for (const resource of candidatesToLock) {
      this.resourceManager.setResourceStatus(resource.id, 'BUSY', patient.id);
      lockedIds.push(resource.id);
    }

    // Update Patient State
    patient.status = 'IN_TREATMENT';
    patient.treatmentStartTime = currentSimTimeMinutes;
    const duration = patient.treatmentDuration && patient.treatmentDuration > 0 ? patient.treatmentDuration : 30;
    patient.treatmentEndTime = currentSimTimeMinutes + duration;

    return {
      allocated: true,
      allocatedResourceIds: lockedIds,
      missingRequirementTypes: [],
    };
  }

  /**
   * Releases all resources currently locked for a patient back to AVAILABLE status.
   */
  public releasePatientResources(patientId: string): string[] {
    const releasedIds: string[] = [];
    const allResources = this.resourceManager.getAllResources();

    for (const res of allResources) {
      if (res.currentPatientId === patientId && res.status === 'BUSY') {
        this.resourceManager.setResourceStatus(res.id, 'AVAILABLE', undefined);
        releasedIds.push(res.id);
      }
    }

    return releasedIds;
  }

  /**
   * Generates default resource requirements based on department & critical score.
   */
  private getDefaultRequirementsForPatient(patient: Patient): ResourceRequirement[] {
    const isCritical = patient.criticalLevel >= 75;

    switch (patient.department) {
      case 'CARDIOLOGY':
        return [
          { resourceType: 'DOCTOR', specialization: 'CARDIOLOGY', quantity: 1 },
          { resourceType: isCritical ? 'ICU_BED' : 'BED', quantity: 1 },
          { resourceType: 'EQUIPMENT', specialization: isCritical ? 'DEFIBRILLATOR' : 'ECG', quantity: 1 },
        ];

      case 'NEUROLOGY':
        return [
          { resourceType: 'DOCTOR', specialization: 'EMERGENCY', quantity: 1 },
          { resourceType: 'NURSE', specialization: 'ICU', quantity: 1 },
          { resourceType: isCritical ? 'ICU_BED' : 'BED', quantity: 1 },
          { resourceType: 'EQUIPMENT', specialization: 'ECG', quantity: 1 },
        ];

      case 'PULMONOLOGY':
        return [
          { resourceType: 'DOCTOR', specialization: 'ICU', quantity: 1 },
          { resourceType: isCritical ? 'ICU_BED' : 'BED', quantity: 1 },
          { resourceType: 'EQUIPMENT', specialization: isCritical ? 'VENTILATOR' : 'OXYGEN', quantity: 1 },
        ];

      case 'ORTHOPEDICS':
      case 'GENERAL_SURGERY':
        return [
          { resourceType: 'DOCTOR', specialization: 'SURGERY', quantity: 1 },
          { resourceType: 'NURSE', specialization: 'OT', quantity: 1 },
          { resourceType: 'BED', quantity: 1 },
          { resourceType: 'EQUIPMENT', specialization: 'OT', quantity: 1 },
        ];

      case 'EMERGENCY_ER':
      default:
        return [
          { resourceType: 'DOCTOR', specialization: 'EMERGENCY', quantity: 1 },
          { resourceType: 'NURSE', specialization: 'GENERAL', quantity: 1 },
          { resourceType: 'BED', quantity: 1 },
          { resourceType: 'EQUIPMENT', specialization: isCritical ? 'DEFIBRILLATOR' : 'OXYGEN', quantity: 1 },
        ];
    }
  }
}
