/**
 * Calculates Age Risk Factor Penalty (0 to 3 score scale)
 * Normal Adult Range: 18 - 60 years -> Penalty = 0
 * Elderly (> 60) and Pediatric (< 12) -> Scaled Penalty (up to 3.0 max)
 */
export function calculateAgePenalty(age?: number): { agePenalty: number; alert?: string } {
  if (age === undefined || age === null) {
    return { agePenalty: 0 };
  }

  if (age >= 18 && age <= 60) {
    return { agePenalty: 0 };
  }

  if (age > 60) {
    const penalty = Math.min(3.0, Number(((age - 60) * 0.1).toFixed(2)));
    let alert: string | undefined;
    if (age >= 80) alert = `CRITICAL: High Risk Geriatric Patient (Age ${age})`;
    else if (age >= 70) alert = `Geriatric Risk Factor (Age ${age})`;
    return { agePenalty: penalty, alert };
  }

  if (age < 18) {
    const penalty = Math.min(3.0, Number(((18 - age) * 0.2).toFixed(2)));
    let alert: string | undefined;
    if (age <= 2) alert = `CRITICAL: High Risk Infant (Age ${age})`;
    else alert = `Pediatric Vulnerability (Age ${age})`;
    return { agePenalty: penalty, alert };
  }

  return { agePenalty: 0 };
}
