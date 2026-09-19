// MEDFLOW Patient Types & Interfaces
import { ResourceRequirement } from './resource';

export type UrgencyLevel = 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW';

export type PatientStatus =
  | 'REGISTERED'
  | 'WAITING'
  | 'ALLOCATING'
  | 'IN_TREATMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Patient {
  id: string;
  name: string;
  criticalLevel: number;        // 0 – 100
  deteriorationRate: number;    // 0 – 100
  treatmentDuration: number;    // Minutes
  arrivalTime: number;          // Simulation timestamp in minutes
  waitingStartTime?: number;    // Timestamp when entered queue
  requiredResources: ResourceRequirement[];
  status: PatientStatus;
  treatmentStartTime?: number;
  treatmentEndTime?: number;
  priorityScore: number;        // Formula: P = 0.45C + 0.30D + 0.15Ws + 0.10Ts
}
