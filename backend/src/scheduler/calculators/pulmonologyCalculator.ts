import { PatientVitals, PulmonologySymptoms } from '../../types/patient';
import { calculateContinuousNEWS2 } from '../continuousNewsCalculator';
import { calculateAgePenalty } from './ageCalculator';
import { DepartmentScoreResult } from './cardiologyCalculator';

/**
 * PULMONOLOGY Specialty Calculator (Initial Respiratory Observations + Vitals + Age)
 */
export function calculatePulmonologyScore(
  age?: number,
  vitals?: PatientVitals,
  symptoms?: PulmonologySymptoms
): DepartmentScoreResult {
  let totalPenalty = 0;
  const maxSymptomPenaltyBenchmark = 15.0; // 5 parameters * max 3 pts each
  const alerts: string[] = [];

  // 1. Age Factor
  const ageRes = calculateAgePenalty(age);
  totalPenalty += ageRes.agePenalty;
  if (ageRes.alert) alerts.push(ageRes.alert);

  // 2. Continuous Vitals Score
  let vitalsNormalized = 0;
  if (vitals) {
    const newsResult = calculateContinuousNEWS2(vitals);
    vitalsNormalized = newsResult.normalizedScoreC;
  }

  // 3. Initial Intake Observations (Offset from Normal)
  if (symptoms) {
    // Dyspnea / Gasping
    if (symptoms.breathingDifficulty === 'SEVERE_GASPING') {
      totalPenalty += 3.0;
      alerts.push('CRITICAL: Severe Gasping / Acute Respiratory Failure Observed');
    } else if (symptoms.breathingDifficulty === 'MODERATE') {
      totalPenalty += 1.5;
    }

    // Cough Severity
    if (symptoms.coughSeverity === 'SEVERE_COUGH') {
      totalPenalty += 2.5;
    } else if (symptoms.coughSeverity === 'MILD_COUGH') {
      totalPenalty += 1.0;
    }

    // Wheezing / Stridor
    if (symptoms.wheezingOrStridor) {
      totalPenalty += 2.0;
      alerts.push('Audible Wheezing / Stridor Breath Sound');
    }

    // Cyanosis / Lip Blueness
    if (symptoms.cyanosisLipBlueness) {
      totalPenalty += 3.0;
      alerts.push('CRITICAL: Lip/Nailbed Cyanosis (Hypoxia Observation)');
    }

    // History of COPD
    if (symptoms.hasHistoryOfCOPD) {
      totalPenalty += 1.5;
      alerts.push('COPD History (Targeting SpO2 Scale 2: 88-92%)');
    }
  }

  // Convert symptom penalty to 0-100 score
  const symptomScore = Math.min(100, (totalPenalty / maxSymptomPenaltyBenchmark) * 100);

  // Final Clinical Score C: 60% Vitals + 40% Initial Intake Symptoms & Age
  const finalScore = Number(
    Math.min(100, 0.60 * vitalsNormalized + 0.40 * symptomScore).toFixed(2)
  );

  const estimatedDuration = Math.round(30 + (finalScore / 100) * 90); // 30 to 120 mins

  let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (finalScore >= 75) riskCategory = 'CRITICAL';
  else if (finalScore >= 50) riskCategory = 'HIGH';
  else if (finalScore >= 25) riskCategory = 'MEDIUM';

  return {
    departmentScore: finalScore,
    riskCategory,
    estimatedDuration,
    clinicalAlerts: alerts,
  };
}
