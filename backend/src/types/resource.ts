// MEDFLOW Resource Types & Interfaces

export type ResourceType =
  | 'DOCTOR'
  | 'NURSE'
  | 'BED'
  | 'ICU_BED'
  | 'OT'
  | 'VENTILATOR'
  | 'EQUIPMENT'
  | 'AMBULANCE'
  | 'LAB';

export type Specialization =
  | 'CARDIOLOGY'
  | 'NEUROLOGY'
  | 'SURGERY'
  | 'EMERGENCY'
  | 'GENERAL'
  | 'ICU'
  | 'OT'
  | 'ECG'
  | 'XRAY'
  | 'MONITOR'
  | 'ULTRASOUND';

export type ResourceStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';

export interface ResourceRequirement {
  resourceType: ResourceType;
  specialization?: Specialization | string;
  equipmentName?: string;
  quantity: number;
}

/**
 * Single Physical Resource Unit
 */
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  specialization?: Specialization | string;
  status: ResourceStatus;
  currentPatientId?: string;
  totalBusyTime: number;
}

/**
 * Hospital Resource Pool Capacity & Live Counter Configuration
 */
export interface ResourcePoolConfig {
  resourceType: ResourceType;
  specialization?: Specialization | string;
  totalCapacity: number;   // Maximum total count in hospital
  availableCount: number;  // Current free count
  busyCount: number;       // Current busy count
}
