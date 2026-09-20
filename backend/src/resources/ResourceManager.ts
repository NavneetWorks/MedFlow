import { Resource, ResourceType, ResourceStatus, Specialization } from '../types/resource';

export interface ResourceConfigItem {
  type: ResourceType;
  specialization?: Specialization | string;
  count: number;
  name?: string;
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
      if (specialization) {
        const sTarget = String(specialization).toUpperCase();
        const sResource = String(r.specialization || '').toUpperCase();
        if (sResource !== sTarget) {
          if (sTarget === 'EMERGENCY_ER' && (sResource === 'EMERGENCY' || sResource === 'ER')) return true;
          if (sTarget === 'EMERGENCY' && sResource === 'EMERGENCY_ER') return true;
          if (sTarget === 'GENERAL_SURGERY' && (sResource === 'SURGERY' || sResource === 'GENERAL')) return true;
          if (sTarget === 'SURGERY' && sResource === 'GENERAL_SURGERY') return true;
          return false;
        }
      }
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
          const newName = item.name 
            ? (diff === 1 ? item.name : `${item.name} #${i}`)
            : `${item.type} ${item.specialization ? item.specialization : ''} #${currentCount + i}`;
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
   * Loads default hospital inventory into memory matching header breakdown.
   */
  public seedDefaultInventory(): void {
    this.clear();

    // 1. Doctors (13 Doctors across 7 Departments)
    this.addResource('DOC-ER-1', 'Dr. ER Specialist 1', 'DOCTOR', 'EMERGENCY_ER');
    this.addResource('DOC-ER-2', 'Dr. ER Specialist 2', 'DOCTOR', 'EMERGENCY_ER');
    this.addResource('DOC-ER-3', 'Dr. ER Specialist 3', 'DOCTOR', 'EMERGENCY_ER');

    this.addResource('DOC-CARD-1', 'Dr. Sharma (Cardio 1)', 'DOCTOR', 'CARDIOLOGY');
    this.addResource('DOC-CARD-2', 'Dr. Varma (Cardio 2)', 'DOCTOR', 'CARDIOLOGY');

    this.addResource('DOC-NEURO-1', 'Dr. Roy (Neuro 1)', 'DOCTOR', 'NEUROLOGY');
    this.addResource('DOC-NEURO-2', 'Dr. Sen (Neuro 2)', 'DOCTOR', 'NEUROLOGY');

    this.addResource('DOC-ORTHO-1', 'Dr. Kapoor (Ortho 1)', 'DOCTOR', 'ORTHOPEDICS');
    this.addResource('DOC-ORTHO-2', 'Dr. Joshi (Ortho 2)', 'DOCTOR', 'ORTHOPEDICS');

    this.addResource('DOC-SURG-1', 'Dr. Kumar (Surgery 1)', 'DOCTOR', 'GENERAL_SURGERY');
    this.addResource('DOC-SURG-2', 'Dr. Patel (Surgery 2)', 'DOCTOR', 'GENERAL_SURGERY');

    this.addResource('DOC-PULMO-1', 'Dr. Gupta (Pulmo)', 'DOCTOR', 'PULMONOLOGY');

    this.addResource('DOC-PEDIA-1', 'Dr. Singh (Pedia)', 'DOCTOR', 'PEDIATRICS');

    // 2. Nurses Pool (10 Nurses)
    for (let i = 1; i <= 10; i++) {
      const spec = i <= 3 ? 'ICU' : i <= 6 ? 'OT' : 'GENERAL';
      this.addResource(`NUR-00${i}`, `Nurse #${i}`, 'NURSE', spec);
    }

    // 3. Hospital Beds (15 Beds)
    for (let i = 1; i <= 15; i++) {
      const isIcu = i <= 3;
      this.addResource(
        isIcu ? `ICU-00${i}` : `BED-00${i}`,
        isIcu ? `ICU Bed #${i}` : `Bed #${i}`,
        isIcu ? 'ICU_BED' : 'BED',
        isIcu ? 'ICU' : 'GENERAL'
      );
    }

    // 4. Critical Equipment & Operating Suites
    this.addResource('OT-001', 'OT Suite 1', 'OT', 'OT');
    this.addResource('OT-002', 'OT Suite 2', 'OT', 'OT');

    for (let i = 1; i <= 4; i++) {
      this.addResource(`VENT-00${i}`, `Ventilator #${i}`, 'VENTILATOR', 'ICU');
    }

    // 5. Medical Diagnostic Equipment
    for (let i = 1; i <= 5; i++) {
      this.addResource(`ECG-00${i}`, `ECG Machine #${i}`, 'EQUIPMENT', 'ECG');
    }
    for (let i = 1; i <= 3; i++) {
      this.addResource(`DEFIB-00${i}`, `Defibrillator #${i}`, 'EQUIPMENT', 'DEFIBRILLATOR');
    }
    for (let i = 1; i <= 10; i++) {
      this.addResource(`OXY-00${i}`, `Oxygen Unit #${i}`, 'EQUIPMENT', 'OXYGEN');
    }
  }

  public clear(): void {
    this.resources.clear();
  }
}
