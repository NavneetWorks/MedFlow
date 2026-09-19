import { PatientVitals, TraumaSymptoms } from '../../types/patient';
import { calculateContinuousNEWS2 } from '../continuousNewsCalculator';
import { calculateAgePenalty } from './ageCalculator';
import { DepartmentScoreResult } from './cardiologyCalculator';

/**
 * TRAUMA / ORTHOPEDICS Specialty Calculator (Initial Injury/Triage Observations + Vitals + Age)
 */
export function calculateTraumaScore(
  age?: number,
  vitals?: PatientVitals,
  symptoms?: TraumaSymptoms
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
    // Visible Active Bleeding
    if (symptoms.visibleBleeding === 'SEVERE_HEMORRHAGE') {
      totalPenalty += 3.0;
      alerts.push('CRITICAL: Active Severe Hemorrhage Observed');
    } else if (symptoms.visibleBleeding === 'MINOR') {
      totalPenalty += 1.5;
    }

    // Physical Pain Scale (0-10)
    if (symptoms.painSeverity > 0) {
      const painPenalty = Number(((symptoms.painSeverity / 10) * 3.0).toFixed(2));
      totalPenalty += painPenalty;
      if (symptoms.painSeverity >= 8) alerts.push(`Severe Physical Pain (${symptoms.painSeverity}/10)`);
    }

    // Physical Mobility Status
    if (symptoms.mobilityStatus === 'IMMOBILE_STRETCHER') {
      totalPenalty += 3.0;
      alerts.push('Patient Immobile on Stretcher');
    } else if (symptoms.mobilityStatus === 'LIMPING') {
      totalPenalty += 1.5;
    }

    // Visible Deformity or Bone Swelling
    if (symptoms.visibleDeformityOrSwelling) {
      totalPenalty += 2.5;
      alerts.push('Visible Bone Deformity / Severe Joint Swelling');
    }
  }

  // Convert symptom penalty to 0-100 score
  const symptomScore = Math.min(100, (totalPenalty / maxSymptomPenaltyBenchmark) * 100);

  // Final Clinical Score C: 60% Vitals + 40% Initial Intake Symptoms & Age
  const finalScore = Number(
    Math.min(100, 0.60 * vitalsNormalized + 0.40 * symptomScore).toFixed(2)
  );

  const estimatedDuration = Math.round(15 + (finalScore / 100) * 105); // 15 to 120 mins

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
