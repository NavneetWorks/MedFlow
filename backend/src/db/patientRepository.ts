import { pool } from './index';
import { Patient, PatientStatus } from '../types/patient';

export class PatientRepository {
  /**
   * Saves or Updates (UPSERT) a Patient record in Supabase PostgreSQL database.
   */
  public async savePatientToDb(patient: Patient): Promise<void> {
    const query = `
      INSERT INTO patients (
        id, name, age, department, vitals, symptoms,
        critical_level, deterioration_rate, treatment_duration,
        arrival_time, waiting_start_time, treatment_start_time, treatment_end_time,
        status, priority_score, required_resources
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        department = EXCLUDED.department,
        vitals = EXCLUDED.vitals,
        symptoms = EXCLUDED.symptoms,
        critical_level = EXCLUDED.critical_level,
        deterioration_rate = EXCLUDED.deterioration_rate,
        treatment_duration = EXCLUDED.treatment_duration,
        waiting_start_time = EXCLUDED.waiting_start_time,
        treatment_start_time = EXCLUDED.treatment_start_time,
        treatment_end_time = EXCLUDED.treatment_end_time,
        status = EXCLUDED.status,
        priority_score = EXCLUDED.priority_score,
        required_resources = EXCLUDED.required_resources;
    `;

    // Package department symptoms into JSONB object
    const symptomsJson = {
      cardiology: patient.cardiologySymptoms,
      neurology: patient.neurologySymptoms,
      pulmonology: patient.pulmonologySymptoms,
      trauma: patient.traumaSymptoms,
    };

    const values = [
      patient.id,
      patient.name,
      patient.age,
      patient.department,
      patient.vitals ? JSON.stringify(patient.vitals) : null,
      JSON.stringify(symptomsJson),
      patient.criticalLevel,
      patient.deteriorationRate,
      patient.treatmentDuration,
      patient.arrivalTime,
      patient.waitingStartTime ?? null,
      patient.treatmentStartTime ?? null,
      patient.treatmentEndTime ?? null,
      patient.status,
      patient.priorityScore,
      JSON.stringify(patient.requiredResources),
    ];

    try {
      await pool.query(query, values);
    } catch (error) {
      console.error(`[PatientRepository] Error saving patient ${patient.id} to Supabase DB:`, error);
      throw error;
    }
  }

  /**
   * Updates patient status and treatment timing fields in Supabase DB.
   */
  public async updatePatientStatusInDb(
    patientId: string,
    status: PatientStatus,
    treatmentStartTime?: number,
    treatmentEndTime?: number
  ): Promise<void> {
    const query = `
      UPDATE patients
      SET
        status = $1,
        treatment_start_time = COALESCE($2, treatment_start_time),
        treatment_end_time = COALESCE($3, treatment_end_time)
      WHERE id = $4;
    `;

    try {
      await pool.query(query, [status, treatmentStartTime ?? null, treatmentEndTime ?? null, patientId]);
    } catch (error) {
      console.error(`[PatientRepository] Error updating status for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Fetches a single patient record by ID from Supabase DB.
   */
  public async getPatientByIdFromDb(patientId: string): Promise<any | null> {
    const query = `SELECT * FROM patients WHERE id = $1;`;
    try {
      const res = await pool.query(query, [patientId]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (error) {
      console.error(`[PatientRepository] Error fetching patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Fetches all active waiting or in-treatment patients from Supabase DB.
   */
  public async getAllActivePatientsFromDb(): Promise<any[]> {
    const query = `
      SELECT * FROM patients
      WHERE status IN ('REGISTERED', 'WAITING', 'ALLOCATING', 'IN_TREATMENT')
      ORDER BY priority_score DESC;
    `;
    try {
      const res = await pool.query(query);
      return res.rows;
    } catch (error) {
      console.error('[PatientRepository] Error fetching active patients:', error);
      throw error;
    }
  }
}
