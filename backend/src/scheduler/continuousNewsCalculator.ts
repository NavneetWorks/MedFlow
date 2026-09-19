import { PatientVitals } from '../types/patient';

export interface ContinuousNEWS2Result {
  rawNews2Score: number;         // Total continuous NEWS2 score (0 to 20 float)
  normalizedScoreC: number;      // Scale 0 to 100
  subScores: {
    respiration: number;
    spo2: number;
    oxygen: number;
    systolicBP: number;
    pulse: number;
    consciousness: number;
    temperature: number;
  };
}

/**
 * 1. Respiration Rate (breaths/min) - Parabolic Scaling
 */
export function calculateRespirationScoreContinuous(rr: number): number {
  const mu = 16;
  if (rr >= 12 && rr <= 20) return 0.0;
  if (rr < 12) {
    const score = Math.pow((mu - rr) / 8, 2) * 3.0;
    return Number(Math.min(3.0, score).toFixed(2));
  }
  const score = Math.pow((rr - mu) / 9, 2) * 3.0;
  return Number(Math.min(3.0, score).toFixed(2));
}

/**
 * 2. SpO2 Oxygen Saturation (%) - Non-linear Scaling
 */
export function calculateSpO2ScoreContinuous(spo2: number): number {
  if (spo2 >= 96) return 0.0;
  const score = Math.pow((96 - spo2) / 5, 1.8) * 3.0;
  return Number(Math.min(3.0, score).toFixed(2));
}

/**
 * 3. Supplemental Oxygen
 */
export function calculateOxygenScoreContinuous(onSupplementalO2: boolean): number {
  return onSupplementalO2 ? 2.0 : 0.0;
}

/**
 * 4. Systolic Blood Pressure (mmHg) - Parabolic Scaling
 */
export function calculateSystolicBPScoreContinuous(sbp: number): number {
  if (sbp >= 111 && sbp <= 219) return 0.0;
  if (sbp < 111) {
    const score = Math.pow((111 - sbp) / 21, 2) * 3.0;
    return Number(Math.min(3.0, score).toFixed(2));
  }
  const score = Math.pow((sbp - 219) / 25, 2) * 3.0;
  return Number(Math.min(3.0, score).toFixed(2));
}

/**
 * 5. Pulse / Heart Rate (bpm) - Parabolic Scaling
 */
export function calculatePulseScoreContinuous(pulse: number): number {
  if (pulse >= 51 && pulse <= 90) return 0.0;
  if (pulse < 51) {
    const score = Math.pow((51 - pulse) / 11, 2) * 3.0;
    return Number(Math.min(3.0, score).toFixed(2));
  }
  const score = Math.pow((pulse - 90) / 41, 2) * 3.0;
  return Number(Math.min(3.0, score).toFixed(2));
}

/**
 * 6. Consciousness (ACVPU)
 */
export function calculateConsciousnessScoreContinuous(consciousness: string): number {
  if (consciousness === 'ALERT') return 0.0;
  return 3.0;
}

/**
 * 7. Temperature (°C) - Parabolic Scaling
 */
export function calculateTemperatureScoreContinuous(temp: number): number {
  if (temp >= 36.1 && temp <= 38.0) return 0.0;
  if (temp < 36.1) {
    const score = Math.pow((36.1 - temp) / 1.1, 2) * 3.0;
    return Number(Math.min(3.0, score).toFixed(2));
  }
  const score = Math.pow((temp - 38.0) / 1.1, 2) * 3.0;
  return Number(Math.min(3.0, score).toFixed(2));
}

/**
 * Calculates Total Continuous NHS NEWS2 Score & Normalized C Score
 */
export function calculateContinuousNEWS2(vitals: PatientVitals): ContinuousNEWS2Result {
  const respiration = calculateRespirationScoreContinuous(vitals.respirationRate);
  const spo2 = calculateSpO2ScoreContinuous(vitals.spo2);
  const oxygen = calculateOxygenScoreContinuous(vitals.onSupplementalOxygen);
  const systolicBP = calculateSystolicBPScoreContinuous(vitals.systolicBP);
  const pulse = calculatePulseScoreContinuous(vitals.pulseRate);
  const consciousness = calculateConsciousnessScoreContinuous(vitals.consciousness);
  const temperature = calculateTemperatureScoreContinuous(vitals.temperature);

  const rawNews2Score = Number(
    (respiration + spo2 + oxygen + systolicBP + pulse + consciousness + temperature).toFixed(2)
  );

  const normalizedScoreC = Number(Math.min(100, rawNews2Score * 5.0).toFixed(2));

  return {
    rawNews2Score,
    normalizedScoreC,
    subScores: {
      respiration,
      spo2,
      oxygen,
      systolicBP,
      pulse,
      consciousness,
      temperature,
    },
  };
}
