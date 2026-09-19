import { SimulationEngine } from './SimulationEngine';

console.log('=== MEDFLOW FULL REAL-TIME SIMULATION ENGINE TEST ===\n');

async function runTest() {
  const engine = new SimulationEngine();

  // 1. Listen for Engine Cycle Updates
  engine.setOnCycleCallback((summary, queueStats) => {
    console.log(`\n[TICK event] simTime = ${summary.simTimeMinutes} mins | Waiting = ${summary.totalWaitingPatients} | Allocated = ${summary.successfulAllocations.length}`);
    if (summary.successfulAllocations.length > 0) {
      summary.successfulAllocations.forEach((alloc) => {
        console.log(`   --> Allocated ${alloc.patientName} (${alloc.department}) - Priority: ${alloc.priorityScore}`);
      });
    }
  });

  // 2. Add Patients via DTO
  console.log('--- ADDING REAL-TIME PATIENT DTOs ---');

  const p1 = await engine.addPatient({
    name: 'Rajesh Khanna',
    age: 70,
    department: 'CARDIOLOGY',
    vitals: { respirationRate: 24, spo2: 90, onSupplementalOxygen: true, systolicBP: 88, pulseRate: 115, consciousness: 'ALERT', temperature: 37.0 },
    cardiologySymptoms: { chestPainSeverity: 9, painRadiation: 'ARM_JAW_BACK', shortnessOfBreath: 'SEVERE', coldSweating: true, dizzinessOrFainting: true },
  });
  console.log(`Added Patient 1: ${p1.patient?.name} | Priority: ${p1.patient?.priorityScore} | Status: ${p1.patient?.status}`);

  const p2 = await engine.addPatient({
    name: 'Sunita Menon',
    age: 65,
    department: 'NEUROLOGY',
    vitals: { respirationRate: 18, spo2: 96, onSupplementalOxygen: false, systolicBP: 160, pulseRate: 92, consciousness: 'CONFUSION', temperature: 36.8 },
    neurologySymptoms: { confusionOrDisorientation: true, facialAsymmetry: true, speechSlurring: true, limbWeakness: 'ONE_SIDE', severeSuddenHeadache: false },
  });
  console.log(`Added Patient 2: ${p2.patient?.name} | Priority: ${p2.patient?.priorityScore} | Status: ${p2.patient?.status}`);

  // 3. Step Simulation Clock by 15 mins
  console.log('\n--- ADVANCING SIMULATION CLOCK BY 15 MINS ---');
  for (let i = 0; i < 15; i++) {
    engine.clock.step();
  }

  console.log('\n=== FULL ENGINE SIMULATION TEST COMPLETED 100% CLEANLY! ===');
  process.exit(0);
}

runTest();
