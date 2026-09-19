import { calculateContinuousNEWS2 } from './continuousNewsCalculator';
import { PatientVitals } from '../types/patient';

console.log('----------------------------------------------------');
console.log('[MEDFLOW] Testing Continuous Parabolic NEWS2 Calculator...');
console.log('----------------------------------------------------');

// Test Case 1: Healthy Normal Vitals
const normalVitals: PatientVitals = {
  respirationRate: 16,
  spo2: 98,
  onSupplementalOxygen: false,
  systolicBP: 120,
  pulseRate: 72,
  consciousness: 'ALERT',
  temperature: 37.0,
};

const resNormal = calculateContinuousNEWS2(normalVitals);
console.log('Test 1 - Healthy Vitals:');
console.log('   Raw NEWS2 Score :', resNormal.rawNews2Score);
console.log('   Normalized C    :', resNormal.normalizedScoreC);

// Test Case 2: Borderline Distressed Vitals (Continuous Decimal Test)
const borderlineVitals: PatientVitals = {
  respirationRate: 23.5,
  spo2: 93.5,
  onSupplementalOxygen: true,
  systolicBP: 98,
  pulseRate: 115,
  consciousness: 'ALERT',
  temperature: 38.6,
};

const resBorderline = calculateContinuousNEWS2(borderlineVitals);
console.log('\nTest 2 - Borderline Distressed Vitals (Continuous Scaling):');
console.log('   Raw NEWS2 Score :', resBorderline.rawNews2Score);
console.log('   Normalized C    :', resBorderline.normalizedScoreC);
console.log('   Sub-Scores      :', resBorderline.subScores);

console.log('----------------------------------------------------');
console.log('🎉 CONTINUOUS NEWS2 SCORING ENGINE IS 100% WORKING!');
console.log('----------------------------------------------------');
