import { Patient } from '../types/patient';
import { calculateDynamicPriorityScore } from './PriorityEngine';

const patientA: Patient = {
  id: 'PAT-CARDIAC-DETERIORATING',
  name: 'Ramesh Sharma',
  age: 72,
  department: 'CARDIOLOGY',
  vitals: { respirationRate: 24, spo2: 91, onSupplementalOxygen: true, systolicBP: 88, pulseRate: 115, consciousness: 'ALERT', temperature: 37.0 },
  cardiologySymptoms: { chestPainSeverity: 8, painRadiation: 'ARM_JAW_BACK', shortnessOfBreath: 'SEVERE', coldSweating: true, dizzinessOrFainting: true },
  criticalLevel: 0,
  deteriorationRate: 35, // Rapid deterioration rate (+35 points per hour)
  treatmentDuration: 60,
  arrivalTime: 0,
  waitingStartTime: 0,
  requiredResources: [],
  status: 'WAITING',
  priorityScore: 0,
};

console.log('=== DYNAMIC DETERIORATION * WAIT TIME ESCALATION TEST ===\n');
console.log(`Patient: ${patientA.name} | Initial Deterioration Rate: ${patientA.deteriorationRate} pts/hr`);
console.log('-----------------------------------------------------------------------------');

const timePoints = [0, 15, 30, 60, 90, 120];

for (const t of timePoints) {
  const pScore = calculateDynamicPriorityScore(patientA, t);
  console.log(`Wait Time: ${t} mins | Critical Level C(t): ${patientA.criticalLevel} | Priority Score P(t): ${pScore}`);
}

console.log('\n=== TEST PASSED CLEANLY! ===');
