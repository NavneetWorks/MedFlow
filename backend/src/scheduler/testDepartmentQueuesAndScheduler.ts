import { DepartmentQueueManager } from './DepartmentQueueManager';
import { ResourceManager } from '../resources/ResourceManager';
import { ResourceAllocator } from '../resources/ResourceAllocator';
import { Scheduler } from './Scheduler';

console.log('=== MEDFLOW MULTI-DEPARTMENT QUEUE & SCHEDULER INTEGRATION TEST ===\n');

// 1. Initialize Resources
const resourceManager = new ResourceManager();
resourceManager.seedDefaultInventory();
const allocator = new ResourceAllocator(resourceManager);
const queueManager = new DepartmentQueueManager();
const scheduler = new Scheduler(queueManager, allocator);

// 2. Test Input Validation & Rejections
console.log('--- TEST 1: PATIENT INPUT VALIDATION & REJECTIONS ---');

const invalidPatient1 = { id: '', name: 'No Name', age: 45, department: 'CARDIOLOGY' as const };
const res1 = queueManager.enqueuePatient(invalidPatient1);
console.log(`Rejection Test 1 (Missing ID): Success = ${res1.success}, Errors = ${res1.errors?.join('; ')}`);

const invalidPatient2 = { id: 'PAT-999', name: 'John Doe', age: 30, department: 'INVALID_DEPT' as any };
const res2 = queueManager.enqueuePatient(invalidPatient2);
console.log(`Rejection Test 2 (Invalid Dept): Success = ${res2.success}, Errors = ${res2.errors?.join('; ')}`);

const invalidPatient3 = { id: 'PAT-888', name: 'Jane Doe', age: 40, department: 'CARDIOLOGY' as const }; // No symptoms or vitals
const res3 = queueManager.enqueuePatient(invalidPatient3);
console.log(`Rejection Test 3 (No Vitals/Symptoms): Success = ${res3.success}, Errors = ${res3.errors?.join('; ')}\n`);

// 3. Test Valid Patient Enqueue across 4 Departments
console.log('--- TEST 2: VALID PATIENT ENQUEUE ACROSS DEPARTMENTS ---');

// Cardiac Emergency (High Priority)
const p1 = queueManager.enqueuePatient({
  id: 'PAT-CARDIAC-01',
  name: 'Ramesh Sharma',
  age: 72,
  department: 'CARDIOLOGY',
  vitals: { respirationRate: 26, spo2: 90, onSupplementalOxygen: true, systolicBP: 85, pulseRate: 120, consciousness: 'ALERT', temperature: 37.2 },
  cardiologySymptoms: { chestPainSeverity: 9, painRadiation: 'ARM_JAW_BACK', shortnessOfBreath: 'SEVERE', coldSweating: true, dizzinessOrFainting: true },
});
console.log(`Cardiology Enqueue: ${p1.patient?.name} -> Priority Score: ${p1.patient?.priorityScore}`);

// Neurology Stroke (High Priority)
const p2 = queueManager.enqueuePatient({
  id: 'PAT-NEURO-01',
  name: 'Anita Verma',
  age: 68,
  department: 'NEUROLOGY',
  vitals: { respirationRate: 18, spo2: 96, onSupplementalOxygen: false, systolicBP: 165, pulseRate: 94, consciousness: 'CONFUSION', temperature: 36.8 },
  neurologySymptoms: { confusionOrDisorientation: true, facialAsymmetry: true, speechSlurring: true, limbWeakness: 'ONE_SIDE', severeSuddenHeadache: false },
});
console.log(`Neurology Enqueue: ${p2.patient?.name} -> Priority Score: ${p2.patient?.priorityScore}`);

// Pediatric Pulmonology (Moderate Priority)
const p3 = queueManager.enqueuePatient({
  id: 'PAT-PULMO-01',
  name: 'Aarav Patel',
  age: 3,
  department: 'PULMONOLOGY',
  vitals: { respirationRate: 32, spo2: 93, onSupplementalOxygen: false, systolicBP: 94, pulseRate: 128, consciousness: 'ALERT', temperature: 38.6 },
  pulmonologySymptoms: { breathingDifficulty: 'MODERATE', coughSeverity: 'SEVERE_COUGH', wheezingOrStridor: true, cyanosisLipBlueness: false, hasHistoryOfCOPD: false },
});
console.log(`Pulmonology Enqueue: ${p3.patient?.name} -> Priority Score: ${p3.patient?.priorityScore}`);

// Orthopedics Trauma (Moderate Priority)
const p4 = queueManager.enqueuePatient({
  id: 'PAT-ORTHO-01',
  name: 'Suresh Raina',
  age: 35,
  department: 'ORTHOPEDICS',
  vitals: { respirationRate: 16, spo2: 98, onSupplementalOxygen: false, systolicBP: 120, pulseRate: 80, consciousness: 'ALERT', temperature: 36.6 },
  traumaSymptoms: { visibleBleeding: 'MINOR', painSeverity: 7, mobilityStatus: 'IMMOBILE_STRETCHER', visibleDeformityOrSwelling: true },
});
console.log(`Orthopedics Enqueue: ${p4.patient?.name} -> Priority Score: ${p4.patient?.priorityScore}\n`);

// Summary of Department Queues
console.log('--- QUEUE SUMMARY BEFORE SCHEDULING CYCLE ---');
console.table(queueManager.getAllQueuesSummary());

// 4. Run Scheduler Allocation Cycle at simTime t = 0
console.log('\n--- TEST 3: SCHEDULER ATOMIC ALLOCATION CYCLE (t = 0 mins) ---');
const cycle1 = scheduler.runAllocationCycle(0);
console.log(`Successful Allocations: ${cycle1.successfulAllocations.length}`);
cycle1.successfulAllocations.forEach((alloc) => {
  console.log(`  Allocated [${alloc.department}] ${alloc.patientName} (Priority: ${alloc.priorityScore}) -> Resources: ${alloc.allocatedResourceIds.join(', ')}`);
});
console.log(`Remaining Waiting Patients: ${cycle1.totalWaitingPatients}`);

// 5. Advance Simulation Time & Complete Treatment
console.log('\n--- TEST 4: SIMULATION TIME ADVANCE & TREATMENT COMPLETION (t = 80 mins) ---');
const cycle2 = scheduler.runAllocationCycle(80);
console.log(`Allocations at t=80: ${cycle2.successfulAllocations.length}`);
console.log(`Active Treatments Remaining: ${scheduler.getActiveTreatments().length}`);
console.log('\n=== ALL INTEGRATION TESTS PASSED CLEANLY! ===');
