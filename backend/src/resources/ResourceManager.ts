import { Resource, ResourceType, ResourceStatus, Specialization } from '../types/resource';

export interface ResourceConfigItem {
  type: ResourceType;
  specialization?: Specialization | string;
  count: number;
}

/**
 * ResourceManager manages live hospital resource states (In-Memory execution).
 */
export class ResourceManager {
  private resources: Map<string, Resource> = new Map();

  public addResource(
    id: string,
    name: string,
    type: ResourceType,
    specialization?: Specialization | string
  ): Resource {
    const resource: Resource = {
      id,
      name,
      type,
      specialization,
      status: 'AVAILABLE',
      totalBusyTime: 0,
    };
    this.resources.set(id, resource);
    return resource;
  }

  public getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  /**
   * Retrieves available resources matching ResourceType and optional Specialization.
   */
  public getAvailableResources(
    type: ResourceType,
    specialization?: Specialization | string
  ): Resource[] {
    return Array.from(this.resources.values()).filter((r) => {
      if (r.type !== type || r.status !== 'AVAILABLE') return false;
      if (specialization && r.specialization !== specialization) return false;
      return true;
    });
  }

  public setResourceStatus(id: string, status: ResourceStatus, patientId?: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.status = status;
      resource.currentPatientId = patientId;
    }
  }

  public getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Returns live counts of available vs total resources grouped by ResourceType.
   */
  public getAvailableCounts(): Record<string, { available: number; total: number }> {
    const counts: Record<string, { available: number; total: number }> = {};
    for (const r of this.resources.values()) {
      if (!counts[r.type]) {
        counts[r.type] = { available: 0, total: 0 };
      }
      counts[r.type].total += 1;
      if (r.status === 'AVAILABLE') {
        counts[r.type].available += 1;
      }
    }
    return counts;
  }

  /**
   * Dynamic Resource Configuration method called via Socket event `resources:configure`.
   * Configures resource counts for each type and specialization dynamically.
   */
  public updateInventoryConfig(configList: ResourceConfigItem[]): void {
    if (!Array.isArray(configList) || configList.length === 0) return;

    for (const item of configList) {
      if (!item.type || typeof item.count !== 'number' || item.count < 0) continue;

      // Find existing resources matching type & spec
      const existing = Array.from(this.resources.values()).filter(
        (r) => r.type === item.type && (item.specialization ? r.specialization === item.specialization : true)
      );

      const currentCount = existing.length;

      if (item.count > currentCount) {
        // Add new units
        const diff = item.count - currentCount;
        for (let i = 1; i <= diff; i++) {
          const newId = `${item.type}-${item.specialization ?? 'GEN'}-${currentCount + i}`;
          const newName = `${item.type} ${item.specialization ? item.specialization : ''} #${currentCount + i}`;
          this.addResource(newId, newName, item.type, item.specialization);
        }
      } else if (item.count < currentCount) {
        // Remove excess AVAILABLE units
        const diff = currentCount - item.count;
        let removed = 0;
        for (const res of existing) {
          if (res.status === 'AVAILABLE' && removed < diff) {
            this.resources.delete(res.id);
            removed++;
          }
        }
      }
    }
  }

  /**
   * Returns full detailed list of all physical resources with live status.
   */
  public getDetailedInventoryState(): any[] {
    return Array.from(this.resources.values()).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      specialization: r.specialization,
      status: r.status,
      currentPatientId: r.currentPatientId,
    }));
  }

  /**
   * Loads default hospital inventory into memory.
   */
  public seedDefaultInventory(): void {
    this.clear();

    // 1. Doctors (Cardiology, Surgery, Emergency, General, ICU)
    this.addResource('DOC-001', 'Dr. Sharma', 'DOCTOR', 'CARDIOLOGY');
    this.addResource('DOC-002', 'Dr. Kumar', 'DOCTOR', 'SURGERY');
    this.addResource('DOC-003', 'Dr. Verma', 'DOCTOR', 'EMERGENCY');
    this.addResource('DOC-004', 'Dr. Patel', 'DOCTOR', 'GENERAL');
    this.addResource('DOC-005', 'Dr. Gupta', 'DOCTOR', 'ICU');

    // 2. Nurses (ICU, OT, General)
    this.addResource('NUR-001', 'Nurse Anita', 'NURSE', 'ICU');
    this.addResource('NUR-002', 'Nurse Sunita', 'NURSE', 'ICU');
    this.addResource('NUR-003', 'Nurse Priya', 'NURSE', 'OT');
    this.addResource('NUR-004', 'Nurse Rahul', 'NURSE', 'GENERAL');
    this.addResource('NUR-005', 'Nurse Vikas', 'NURSE', 'GENERAL');

    // 3. Beds & ICU Beds
    this.addResource('ICU-001', 'ICU Bed 1', 'ICU_BED', 'ICU');
    this.addResource('ICU-002', 'ICU Bed 2', 'ICU_BED', 'ICU');
    this.addResource('ICU-003', 'ICU Bed 3', 'ICU_BED', 'ICU');
    this.addResource('BED-001', 'General Bed 1', 'BED', 'GENERAL');
    this.addResource('BED-002', 'General Bed 2', 'BED', 'GENERAL');
    this.addResource('BED-003', 'General Bed 3', 'BED', 'GENERAL');
    this.addResource('BED-004', 'General Bed 4', 'BED', 'GENERAL');

    // 4. Operating Theatres & Critical Equipment
    this.addResource('OT-001', 'OT Suite 1', 'OT', 'OT');
    this.addResource('OT-002', 'OT Suite 2', 'OT', 'OT');
    this.addResource('VENT-001', 'Ventilator Unit 1', 'VENTILATOR', 'ICU');
    this.addResource('VENT-002', 'Ventilator Unit 2', 'VENTILATOR', 'ICU');

    // 5. Equipment
    this.addResource('EQ-001', 'ECG Machine 1', 'EQUIPMENT', 'ECG');
    this.addResource('EQ-002', 'X-Ray Machine 1', 'EQUIPMENT', 'XRAY');
    this.addResource('EQ-003', 'Patient Monitor 1', 'EQUIPMENT', 'MONITOR');
    this.addResource('EQ-004', 'Ultrasound Machine 1', 'EQUIPMENT', 'ULTRASOUND');

    // 6. Ambulance
    this.addResource('AMB-001', 'Emergency Ambulance 1', 'AMBULANCE', 'EMERGENCY');
    this.addResource('AMB-002', 'Emergency Ambulance 2', 'AMBULANCE', 'EMERGENCY');
  }

  public clear(): void {
    this.resources.clear();
  }
}
