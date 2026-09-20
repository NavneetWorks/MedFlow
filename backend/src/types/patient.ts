// MEDFLOW Patient & Department Initial Intake Symptoms Types
import { ResourceRequirement } from './resource';

export type UrgencyLevel = 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW';

export type PatientStatus =
  | 'REGISTERED'
  | 'WAITING'
  | 'ALLOCATING'
  | 'IN_TREATMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type HospitalDepartment =
  | 'CARDIOLOGY'
  | 'NEUROLOGY'
  | 'ORTHOPEDICS'
  | 'GENERAL_SURGERY'
  | 'EMERGENCY_ER'
  | 'PULMONOLOGY'
  | 'PEDIATRICS';

export interface PatientVitals {
  respirationRate: number;        // breaths per minute (Normal: 12-20)
  spo2: number;                   // percentage 0-100 (Normal: 96-100)
  onSupplementalOxygen: boolean;  // true/false
  systolicBP: number;            // mmHg (Normal: 111-219)
  pulseRate: number;             // bpm (Normal: 51-90)
  consciousness: 'ALERT' | 'CONFUSION' | 'VOICE' | 'PAIN' | 'UNRESPONSIVE'; // ACVPU
  temperature: number;            // Celsius °C (Normal: 36.1 - 38.0)
}

// 1. CARDIOLOGY Initial Checkup Intake Symptoms
export interface CardiologySymptoms {
  chestPainSeverity: number;             // Pain scale 0 - 10 (Normal: 0)
  painRadiation: 'NONE' | 'ARM_JAW_BACK';// Radiation of chest pain (Normal: NONE)
  shortnessOfBreath: 'NONE' | 'MILD' | 'SEVERE'; // Dyspnea (Normal: NONE)
  coldSweating: boolean;                 // Diaphoresis sign (Normal: false)
  dizzinessOrFainting: boolean;          // Syncope/Pre-syncope sign (Normal: false)
}

// 2. NEUROLOGY Initial Checkup Intake Symptoms
export interface NeurologySymptoms {
  confusionOrDisorientation: boolean;    // Initial mental disorientation (Normal: false)
  facialAsymmetry: boolean;              // FAST: Facial droop sign (Normal: false)
  speechSlurring: boolean;               // FAST: Slurred speech (Normal: false)
  limbWeakness: 'NONE' | 'ONE_SIDE' | 'BOTH_SIDES'; // FAST: Motor deficit (Normal: NONE)
  severeSuddenHeadache: boolean;         // Thunderclap headache sign (Normal: false)
}

// 3. PULMONOLOGY Initial Checkup Intake Symptoms
export interface PulmonologySymptoms {
  breathingDifficulty: 'NORMAL' | 'MODERATE' | 'SEVERE_GASPING'; // Dyspnea observation
  coughSeverity: 'NONE' | 'MILD_COUGH' | 'SEVERE_COUGH';        // Cough severity
  wheezingOrStridor: boolean;                                    // Audible breath sound (Normal: false)
  cyanosisLipBlueness: boolean;                                  // Lip/nail blueness sign (Normal: false)
  hasHistoryOfCOPD: boolean;                                     // Patient medical history
}

// 4. TRAUMA / ORTHOPEDICS Initial Checkup Intake Symptoms
export interface TraumaSymptoms {
  visibleBleeding: 'NONE' | 'MINOR' | 'SEVERE_HEMORRHAGE'; // Hemorrhage observation
  painSeverity: number;                                    // Pain scale 0 - 10 (Normal: 0)
  mobilityStatus: 'WALKING' | 'LIMPING' | 'IMMOBILE_STRETCHER'; // Initial physical mobility
  visibleDeformityOrSwelling: boolean;                    // Swelling/deformity observation (Normal: false)
}

export interface Patient {
  id: string;
  name: string;
  age: number;                           // Age in years (Used for Age Risk Factor calculation)
  department: HospitalDepartment;
  vitals?: PatientVitals;
  cardiologySymptoms?: CardiologySymptoms;
  neurologySymptoms?: NeurologySymptoms;
  pulmonologySymptoms?: PulmonologySymptoms;
  traumaSymptoms?: TraumaSymptoms;
  criticalLevel: number;        // 0 – 100 (Derived from Department Intake Score + NEWS2)
  baseCriticalLevel?: number;   // Original intake score before wait-time deterioration
  deteriorationRate: number;    // 0 – 100
  treatmentDuration: number;    // Minutes (Dynamically calculated based on department + vitals)
  arrivalTime: number;          // Simulation timestamp in minutes
  waitingStartTime?: number;    // Timestamp when entered queue
  requiredResources: ResourceRequirement[];
  status: PatientStatus;
  treatmentStartTime?: number;
  treatmentEndTime?: number;
  priorityScore: number;        // Formula: P = 0.40C + 0.30D + 0.20Ws + 0.10Ts
}
