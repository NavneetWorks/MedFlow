import { PatientVitals, CardiologySymptoms } from '../../types/patient';
import { calculateContinuousNEWS2 } from '../continuousNewsCalculator';
import { calculateAgePenalty } from './ageCalculator';

export interface DepartmentScoreResult {
  departmentScore: number;     // 0 to 100 Scale
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDuration: number;  // Dynamic Treatment Duration in minutes
  clinicalAlerts: string[];
}

/**
 * CARDIOLOGY Specialty Calculator (Initial Checkup Observations + Vitals + Age)
 */
export function calculateCardiologyScore(
  age?: number,
  vitals?: PatientVitals,
  symptoms?: CardiologySymptoms
): DepartmentScoreResult {
  let totalPenalty = 0;
  const maxSymptomPenaltyBenchmark = 15.0; // 5 parameters * max 3 pts each
  const alerts: string[] = [];

  // 1. Age Factor
  const ageRes = calculateAgePenalty(age);
  totalPenalty += ageRes.agePenalty;
  if (ageRes.alert) alerts.push(ageRes.alert);

  // 2. Continuous Vitals Score (NEWS2 Parabolic Deviations)
  let vitalsNormalized = 0;
  if (vitals) {
    const newsResult = calculateContinuousNEWS2(vitals);
    vitalsNormalized = newsResult.normalizedScoreC; // 0 - 100
  }

  // 3. Initial Intake Observations (Offset from Normal)
  if (symptoms) {
    // Chest Pain Severity (0 to 10 scale) -> Offset from normal 0
    if (symptoms.chestPainSeverity > 0) {
      const painPenalty = Number(((symptoms.chestPainSeverity / 10) * 3.0).toFixed(2));
      totalPenalty += painPenalty;
      if (symptoms.chestPainSeverity >= 7) alerts.push(`Severe Chest Pain (${symptoms.chestPainSeverity}/10)`);
    }

    // Radiation of Pain (Arm/Jaw/Back)
    if (symptoms.painRadiation === 'ARM_JAW_BACK') {
      totalPenalty += 2.5;
      alerts.push('Chest Pain Radiation to Arm/Jaw/Back (Ischemia Observation)');
    }

    // Shortness of Breath / Dyspnea
    if (symptoms.shortnessOfBreath === 'SEVERE') {
      totalPenalty += 3.0;
      alerts.push('Severe Cardiac Dyspnea / Shortness of Breath');
    } else if (symptoms.shortnessOfBreath === 'MILD') {
      totalPenalty += 1.5;
    }

    // Cold Sweating (Diaphoresis sign)
    if (symptoms.coldSweating) {
      totalPenalty += 2.5;
      alerts.push('Cold Sweating / Diaphoresis Observed');
    }

    // Dizziness or Fainting (Syncope)
    if (symptoms.dizzinessOrFainting) {
      totalPenalty += 2.0;
      alerts.push('Dizziness / Pre-syncope Observed');
    }
  }

  // Convert symptom penalty to 0-100 score
  const symptomScore = Math.min(100, (totalPenalty / maxSymptomPenaltyBenchmark) * 100);

  // Final Clinical Score C: 60% Vitals + 40% Initial Intake Symptoms & Age
  const finalScore = Number(
    Math.min(100, 0.60 * vitalsNormalized + 0.40 * symptomScore).toFixed(2)
  );

  const estimatedDuration = Math.round(20 + (finalScore / 100) * 70); // 20 to 90 mins

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
