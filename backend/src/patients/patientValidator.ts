import {
  HospitalDepartment,
  PatientVitals,
  CardiologySymptoms,
  NeurologySymptoms,
  PulmonologySymptoms,
  TraumaSymptoms,
} from '../types/patient';
import { ResourceRequirement } from '../types/resource';

export interface CreatePatientDTO {
  id?: string;
  name: string;
  age: number;
  department: HospitalDepartment;
  vitals?: PatientVitals;
  cardiologySymptoms?: CardiologySymptoms;
  neurologySymptoms?: NeurologySymptoms;
  pulmonologySymptoms?: PulmonologySymptoms;
  traumaSymptoms?: TraumaSymptoms;
  requiredResources?: ResourceRequirement[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates incoming Patient DTO from API/Socket request.
 * Checks for mandatory fields: id/name, valid age, department, and vitals/symptoms baseline.
 */
export function validatePatientInput(patient: Partial<CreatePatientDTO>): ValidationResult {
  const errors: string[] = [];

  // 1. Basic Identity Validation
  if (!patient.id || typeof patient.id !== 'string' || patient.id.trim() === '') {
    errors.push('Missing or invalid Patient ID');
  }

  if (!patient.name || typeof patient.name !== 'string' || patient.name.trim() === '') {
    errors.push('Missing or invalid Patient Name');
  }

  if (patient.age === undefined || patient.age === null || typeof patient.age !== 'number' || patient.age < 0 || patient.age > 120) {
    errors.push('Invalid or missing Age (must be between 0 and 120)');
  }

  // 2. Department Validation
  const validDepartments: HospitalDepartment[] = [
    'CARDIOLOGY',
    'NEUROLOGY',
    'ORTHOPEDICS',
    'GENERAL_SURGERY',
    'EMERGENCY_ER',
    'PULMONOLOGY',
    'PEDIATRICS',
  ];

  if (!patient.department || !validDepartments.includes(patient.department)) {
    errors.push(`Invalid or missing Department. Must be one of: ${validDepartments.join(', ')}`);
  }

  // 3. Vitals / Symptoms Baseline Check
  if (!patient.vitals && !patient.cardiologySymptoms && !patient.neurologySymptoms && !patient.pulmonologySymptoms && !patient.traumaSymptoms) {
    errors.push('Rejection: At least basic Vitals or Department Symptoms must be provided for triage');
  }

  // 4. Department-Specific Minimum Intake Symptom Check
  if (patient.department === 'CARDIOLOGY') {
    if (!patient.cardiologySymptoms && !patient.vitals) {
      errors.push('Cardiology Rejection: Requires cardiology symptoms or vital readings');
    }
  } else if (patient.department === 'NEUROLOGY') {
    if (!patient.neurologySymptoms && !patient.vitals) {
      errors.push('Neurology Rejection: Requires neurology symptoms or vital readings');
    }
  } else if (patient.department === 'PULMONOLOGY') {
    if (!patient.pulmonologySymptoms && !patient.vitals) {
      errors.push('Pulmonology Rejection: Requires pulmonology symptoms or vital readings');
    }
  } else if (patient.department === 'ORTHOPEDICS' || patient.department === 'GENERAL_SURGERY' || patient.department === 'EMERGENCY_ER') {
    if (!patient.traumaSymptoms && !patient.vitals) {
      errors.push('Trauma Rejection: Requires injury/trauma symptoms or vital readings');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
