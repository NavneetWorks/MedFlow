import { Patient } from '../types/patient';
import {
  calculateCardiologyScore,
  calculateNeurologyScore,
  calculatePulmonologyScore,
  calculateTraumaScore,
  DepartmentScoreResult,
} from './departmentCalculators';
import { calculateContinuousNEWS2 } from './continuousNewsCalculator';

export interface PriorityWeights {
  wClinical: number;  // default: 0.60 (Includes deterioration * wait time multiplier)
  wWaitTime: number;  // default: 0.25
  wDuration: number;  // default: 0.15
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  wClinical: 0.60,
  wWaitTime: 0.25,
  wDuration: 0.15,
};

/**
 * Calculates Initial Department Triage Score (C_intake) and Dynamic Treatment Duration (T)
 */
export function calculatePatientDepartmentScore(patient: Patient): DepartmentScoreResult {
  switch (patient.department) {
    case 'CARDIOLOGY':
      return calculateCardiologyScore(patient.age, patient.vitals, patient.cardiologySymptoms);
    case 'NEUROLOGY':
      return calculateNeurologyScore(patient.age, patient.vitals, patient.neurologySymptoms);
    case 'PULMONOLOGY':
      return calculatePulmonologyScore(patient.age, patient.vitals, patient.pulmonologySymptoms);
    case 'ORTHOPEDICS':
    case 'EMERGENCY_ER':
    case 'GENERAL_SURGERY':
      return calculateTraumaScore(patient.age, patient.vitals, patient.traumaSymptoms);
    default:
      if (patient.vitals) {
        const news = calculateContinuousNEWS2(patient.vitals);
        const score = news.normalizedScoreC;
        let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (score >= 75) riskCategory = 'CRITICAL';
        else if (score >= 50) riskCategory = 'HIGH';
        else if (score >= 25) riskCategory = 'MEDIUM';
        return {
          departmentScore: score,
          riskCategory,
          estimatedDuration: Math.round(20 + (score / 100) * 40),
          clinicalAlerts: [],
        };
      }
      return {
        departmentScore: 10,
        riskCategory: 'LOW',
        estimatedDuration: 30,
        clinicalAlerts: [],
      };
  }
}

function toNum(val: any, fallback?: number): number | undefined {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

/**
 * Calculates dynamic priority score P for a patient at simulation time t.
 *
 * STEP 1: Dynamic Critical Level C(t) = min(100, C_intake + DeteriorationRate * WaitHours)
 * STEP 2: Priority Score P(t) = 0.60 * C(t) + 0.25 * Ws + 0.15 * Ts
 */
export function calculateDynamicPriorityScore(
  patient: Patient,
  currentSimTimeMinutes: number,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
): number {
  const pAny = patient as any;

  // 1. Safely parse initial base score
  const rawBase = patient.baseCriticalLevel ?? pAny.base_critical_level ?? patient.priorityScore ?? pAny.priority_score ?? patient.criticalLevel ?? pAny.critical_level;
  const numBase = toNum(rawBase, undefined);

  let C_intake: number;
  if (numBase !== undefined && numBase > 0) {
    C_intake = numBase;
    patient.baseCriticalLevel = numBase;
  } else {
    const departmentResult = calculatePatientDepartmentScore(patient);
    C_intake = departmentResult.departmentScore;
    patient.baseCriticalLevel = C_intake;
  }

  // Set treatment duration if not fixed
  const rawDuration = toNum(patient.treatmentDuration ?? pAny.treatment_duration, 0);
  if (!rawDuration || rawDuration === 0) {
    const departmentResult = calculatePatientDepartmentScore(patient);
    patient.treatmentDuration = departmentResult.estimatedDuration;
  } else {
    patient.treatmentDuration = rawDuration;
  }

  // 2. Elapsed Queue Wait Time
  const rawWaitStart = toNum(patient.waitingStartTime ?? pAny.waiting_start_time, currentSimTimeMinutes);
  patient.waitingStartTime = rawWaitStart;
  const waitMinutes = Math.max(0, currentSimTimeMinutes - (rawWaitStart ?? currentSimTimeMinutes));
  const waitHours = waitMinutes / 60;

  // 3. Dynamic Critical Level C(t): Deterioration Rate (D) multiplied by Waiting Hours
  const D = toNum(patient.deteriorationRate ?? pAny.deterioration_rate, 15) ?? 15;
  patient.deteriorationRate = D;
  const dynamicCriticalLevel = Math.min(100, C_intake + D * waitHours);
  patient.criticalLevel = Number(dynamicCriticalLevel.toFixed(2));

  // 4. Wait Time Penalty Score Ws (0 to 100) - Target benchmark max wait = 120 mins
  const maxBenchmarkWait = 120;
  const Ws = Math.min(100, (waitMinutes / maxBenchmarkWait) * 100);

  // 5. Treatment Duration Throughput Score Ts (0 to 100)
  const maxDurationBenchmark = 120;
  const duration = patient.treatmentDuration ?? 30;
  const Ts = Math.max(0, 100 - (duration / maxDurationBenchmark) * 100);

  // 6. Weighted Sum Priority Score P(t)
  const P =
    weights.wClinical * dynamicCriticalLevel +
    weights.wWaitTime * Ws +
    weights.wDuration * Ts;

  const finalPriority = Number(Math.min(100, Math.max(0, P)).toFixed(2));
  patient.priorityScore = finalPriority;

  return finalPriority;
}

/**
 * Recalculates priorities for all waiting patients and sorts queue in descending order of priority.
 * Tie-breaker: Earliest waitingStartTime gets higher priority.
 */
export function sortPatientQueueByPriority(
  queue: Patient[],
  currentSimTimeMinutes: number,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
): Patient[] {
  for (const patient of queue) {
    calculateDynamicPriorityScore(patient, currentSimTimeMinutes, weights);
  }

  return queue.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore; // High priority first
    }
    // Tie-breaker: Earliest waiting start time first
    const aWait = a.waitingStartTime ?? a.arrivalTime;
    const bWait = b.waitingStartTime ?? b.arrivalTime;
    return aWait - bWait;
  });
}
