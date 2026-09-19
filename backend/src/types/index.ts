export type UrgencyLevel = 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'LOW';

export type PatientStatus =
  | 'REGISTERED'
  | 'WAITING'
  | 'ALLOCATING'
  | 'IN_TREATMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type ResourceType =
  | 'ICU_BED'
  | 'GENERAL_BED'
  | 'DOCTOR'
  | 'NURSE'
  | 'OPERATING_ROOM'
  | 'AMBULANCE';

export type ResourceStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';

export interface ResourceRequirement {
  resourceType: ResourceType;
  quantity: number;
}

export interface Patient {
  id: string;
  name: string;
  urgencyLevel: UrgencyLevel;
  baseUrgencyScore: number;
  arrivalTime: number; // Simulation timestamp (minutes)
  treatmentDuration: number; // Minutes required for treatment
  requiredResources: ResourceRequirement[];
  status: PatientStatus;
  waitingStartTime?: number;
  treatmentStartTime?: number;
  treatmentEndTime?: number;
  priorityScore: number;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  currentPatientId?: string;
  totalBusyTime: number;
}

export type EventType =
  | 'PATIENT_ARRIVAL'
  | 'TRIAGE_COMPLETE'
  | 'RESOURCE_CHECK'
  | 'TREATMENT_START'
  | 'TREATMENT_COMPLETE'
  | 'RESOURCE_RELEASE';

export interface SimulationEvent {
  id: string;
  timestamp: number; // Simulation time in minutes
  type: EventType;
  patientId?: string;
  resourceIds?: string[];
  payload?: Record<string, any>;
}

export interface HospitalState {
  simulationId: string;
  currentTime: number; // Current simulation clock (minutes)
  isRunning: boolean;
  isPaused: boolean;
  patients: Map<string, Patient>;
  resources: Map<string, Resource>;
  waitingQueue: string[]; // Patient IDs sorted by Priority Score descending
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
