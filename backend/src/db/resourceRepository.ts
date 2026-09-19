import { pool } from './database';
import { Resource } from '../types/resource';

export class ResourceRepository {
  /**
   * Saves or updates (UPSERT) resource inventory items in Supabase PostgreSQL.
   */
  public async saveResourcesToDb(resources: Resource[]): Promise<void> {
    if (resources.length === 0) return;

    for (const res of resources) {
      const query = `
        INSERT INTO resources (
          id, name, type, specialization, status, current_patient_id, total_busy_time, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          specialization = EXCLUDED.specialization,
          status = EXCLUDED.status,
          current_patient_id = EXCLUDED.current_patient_id,
          total_busy_time = EXCLUDED.total_busy_time,
          updated_at = CURRENT_TIMESTAMP;
      `;

      try {
        await pool.query(query, [
          res.id,
          res.name,
          res.type,
          res.specialization ?? null,
          res.status,
          res.currentPatientId ?? null,
          res.totalBusyTime ?? 0,
        ]);
      } catch (err) {
        console.error(`[ResourceRepository] Error saving resource ${res.id}:`, err);
      }
    }
  }

  /**
   * Loads all physical resource items from Supabase DB on server boot.
   */
  public async getAllResourcesFromDb(): Promise<Resource[]> {
    const query = `SELECT * FROM resources;`;
    try {
      const res = await pool.query(query);
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        specialization: row.specialization,
        status: row.status,
        currentPatientId: row.current_patient_id,
        totalBusyTime: row.total_busy_time,
      }));
    } catch (err) {
      console.error('[ResourceRepository] Error fetching resources from DB:', err);
      return [];
    }
  }

  /**
   * Logs a new Resource Allocation pairing event to Supabase DB.
   */
  public async logAllocationToDb(patientId: string, resourceIds: string[], simTimeMinutes: number): Promise<void> {
    for (const resId of resourceIds) {
      const query = `
        INSERT INTO resource_allocations (
          patient_id, resource_id, allocated_at_sim_time, status
        ) VALUES ($1, $2, $3, 'ACTIVE');
      `;
      try {
        await pool.query(query, [patientId, resId, simTimeMinutes]);
      } catch (err) {
        console.error(`[ResourceRepository] Error logging allocation for ${patientId} -> ${resId}:`, err);
      }
    }
  }

  /**
   * Marks resource allocation pairing events as released upon treatment completion.
   */
  public async logReleaseToDb(patientId: string, simTimeMinutes: number): Promise<void> {
    const query = `
      UPDATE resource_allocations
      SET
        released_at_sim_time = $1,
        status = 'RELEASED'
      WHERE patient_id = $2 AND status = 'ACTIVE';
    `;
    try {
      await pool.query(query, [simTimeMinutes, patientId]);
    } catch (err) {
      console.error(`[ResourceRepository] Error logging release for patient ${patientId}:`, err);
    }
  }
}
