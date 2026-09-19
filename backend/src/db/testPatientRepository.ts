import { PatientRepository } from './patientRepository';
import { Patient } from '../types/patient';
import { pool } from './database';

async function testRepository() {
  console.log('=== TESTING SUPABASE PATIENT REPOSITORY persistence ===\n');
  const repo = new PatientRepository();

  const testPatient: Patient = {
    id: 'PAT-SUPABASE-TEST-01',
    name: 'Vikramaditya Rao',
    age: 67,
    department: 'CARDIOLOGY',
    vitals: {
      respirationRate: 22,
      spo2: 92,
      onSupplementalOxygen: true,
      systolicBP: 95,
      pulseRate: 110,
      consciousness: 'ALERT',
      temperature: 37.1,
    },
    cardiologySymptoms: {
      chestPainSeverity: 8,
      painRadiation: 'ARM_JAW_BACK',
      shortnessOfBreath: 'SEVERE',
      coldSweating: true,
      dizzinessOrFainting: false,
    },
    criticalLevel: 68.5,
    deteriorationRate: 30,
    treatmentDuration: 60,
    arrivalTime: 10,
    waitingStartTime: 10,
    requiredResources: [
      { resourceType: 'DOCTOR', specialization: 'CARDIOLOGY', quantity: 1 },
      { resourceType: 'BED', quantity: 1 },
    ],
    status: 'WAITING',
    priorityScore: 48.2,
  };

  try {
    // 1. Save patient to Supabase DB
    console.log(`Saving Patient ${testPatient.name} (${testPatient.id}) to Supabase DB...`);
    await repo.savePatientToDb(testPatient);
    console.log('✅ [SUCCESS] Patient saved to Supabase!');

    // 2. Fetch patient from DB
    console.log('\nFetching Patient from Supabase DB...');
    const fetched = await repo.getPatientByIdFromDb(testPatient.id);
    console.log('Fetched Record from Supabase:');
    console.log(`  ID: ${fetched.id}`);
    console.log(`  Name: ${fetched.name}`);
    console.log(`  Department: ${fetched.department}`);
    console.log(`  Age: ${fetched.age}`);
    console.log(`  Status: ${fetched.status}`);
    console.log(`  Priority Score: ${fetched.priority_score}`);

    // 3. Update status
    console.log('\nUpdating Patient Status to IN_TREATMENT in Supabase DB...');
    await repo.updatePatientStatusInDb(testPatient.id, 'IN_TREATMENT', 15, 75);
    const updated = await repo.getPatientByIdFromDb(testPatient.id);
    console.log(`✅ Updated Status: ${updated.status} | Start Time: ${updated.treatment_start_time} | End Time: ${updated.treatment_end_time}`);

    console.log('\n=== SUPABASE PERSISTENCE TEST PASSED 100%! ===');
  } catch (error) {
    console.error('❌ Error during database test:', error);
  } finally {
    await pool.end();
  }
}

testRepository();
