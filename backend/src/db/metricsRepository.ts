import { pool } from './database';

export interface MetricSnapshotDTO {
  simTimeMinutes: number;
  waitingCount: number;
  activeTreatmentCount: number;
  completedCount: number;
  avgWaitTimeMinutes: number;
  icuOccupancyRate: number;
}

export class MetricsRepository {
  /**
   * Saves a 10-minute interval metric snapshot in Supabase PostgreSQL.
   */
  public async saveMetricSnapshotToDb(snapshot: MetricSnapshotDTO): Promise<void> {
    const query = `
      INSERT INTO simulation_metrics (
        sim_time_minutes, waiting_count, active_treatment_count, completed_count,
        avg_wait_time_minutes, icu_occupancy_rate
      ) VALUES ($1, $2, $3, $4, $5, $6);
    `;

    try {
      await pool.query(query, [
        snapshot.simTimeMinutes,
        snapshot.waitingCount,
        snapshot.activeTreatmentCount,
        snapshot.completedCount,
        snapshot.avgWaitTimeMinutes,
        snapshot.icuOccupancyRate,
      ]);
    } catch (err) {
      console.error(`[MetricsRepository] Error saving metric snapshot at t=${snapshot.simTimeMinutes}:`, err);
    }
  }

  /**
   * Fetches historical metrics time-series for frontend dashboard graphs.
   */
  public async getHistoricalMetricsFromDb(): Promise<any[]> {
    const query = `
      SELECT
        sim_time_minutes, waiting_count, active_treatment_count, completed_count,
        avg_wait_time_minutes, icu_occupancy_rate, created_at
      FROM simulation_metrics
      ORDER BY sim_time_minutes ASC;
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (err) {
      console.error('[MetricsRepository] Error fetching historical metrics:', err);
      return [];
    }
  }
}
