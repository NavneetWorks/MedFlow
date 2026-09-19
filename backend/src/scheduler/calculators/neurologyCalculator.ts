import { PatientVitals, NeurologySymptoms } from '../../types/patient';
import { calculateContinuousNEWS2 } from '../continuousNewsCalculator';
import { calculateAgePenalty } from './ageCalculator';
import { DepartmentScoreResult } from './cardiologyCalculator';

/**
 * NEUROLOGY Specialty Calculator (Initial Stroke/Neuro Checkup Observations + Vitals + Age)
 */
export function calculateNeurologyScore(
  age?: number,
  vitals?: PatientVitals,
  symptoms?: NeurologySymptoms
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
    // Confusion / Mental Disorientation
    if (symptoms.confusionOrDisorientation) {
      totalPenalty += 2.5;
      alerts.push('Acute Confusion / Mental Disorientation');
    }

    // F.A.S.T. Facial Asymmetry / Droop
    if (symptoms.facialAsymmetry) {
      totalPenalty += 3.0;
      alerts.push('CRITICAL: F.A.S.T. Facial Asymmetry / Droop Observed');
    }

    // F.A.S.T. Speech Slurring
    if (symptoms.speechSlurring) {
      totalPenalty += 2.5;
      alerts.push('F.A.S.T. Slurred Speech Observed');
    }

    // F.A.S.T. Limb Weakness / Deficit
    if (symptoms.limbWeakness === 'BOTH_SIDES') {
      totalPenalty += 3.0;
      alerts.push('CRITICAL: Bilateral Motor Weakness / Paralysis');
    } else if (symptoms.limbWeakness === 'ONE_SIDE') {
      totalPenalty += 2.0;
      alerts.push('Unilateral Limb Weakness Observed');
    }

    // Sudden Severe Thunderclap Headache
    if (symptoms.severeSuddenHeadache) {
      totalPenalty += 2.5;
      alerts.push('Sudden Severe Headache (Aneurysm/Hemorrhage Sign)');
    }
  }

  // Convert symptom penalty to 0-100 score
  const symptomScore = Math.min(100, (totalPenalty / maxSymptomPenaltyBenchmark) * 100);

  // Final Clinical Score C: 60% Vitals + 40% Initial Intake Symptoms & Age
  const finalScore = Number(
    Math.min(100, 0.60 * vitalsNormalized + 0.40 * symptomScore).toFixed(2)
  );

  const estimatedDuration = Math.round(30 + (finalScore / 100) * 70); // 30 to 100 mins

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
