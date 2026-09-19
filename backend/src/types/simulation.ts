// MEDFLOW Simulation Event & Metric Types
import { Patient } from './patient';
import { Resource, ResourceType } from './resource';

export type EventType =
  | 'PATIENT_ARRIVAL'
  | 'TRIAGE_COMPLETE'
  | 'RESOURCE_CHECK'
  | 'TREATMENT_START'
  | 'TREATMENT_COMPLETE'
  | 'RESOURCE_RELEASE';

export interface SimulationEvent {
  id: string;
  timestamp: number;
  type: EventType;
  patientId?: string;
  resourceIds?: string[];
  payload?: Record<string, any>;
}

export interface HospitalState {
  simulationId: string;
  currentTime: number;
  isRunning: boolean;
  isPaused: boolean;
  patients: Map<string, Patient>;
  resources: Map<string, Resource>;
  waitingQueue: string[];
  activeTreatments: Map<string, { patientId: string; resourceIds: string[]; endTime: number }>;
}

export interface MetricSnapshot {
  timestamp: number;
  totalPatients: number;
  completedPatients: number;
  waitingPatients: number;
  avgWaitingTime: number;
  maxWaitingTime: number;
  overallUtilizationPct: number;
  utilizationByResourceType: Record<ResourceType, number>;
  queueLength: number;
}
