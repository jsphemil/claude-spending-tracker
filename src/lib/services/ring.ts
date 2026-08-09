export type RingData = {
  lap1Percent: number; // 0-100, first pass around the ring
  lap2Percent: number; // 0-100, overflow pass once past 100% (0 if not over)
  isOverLimit: boolean;
};

function ringFromRatio(ratio: number): RingData {
  const clamped = Math.max(ratio, 0);
  return {
    lap1Percent: Math.min(clamped, 1) * 100,
    lap2Percent: clamped > 1 ? Math.min(clamped - 1, 1) * 100 : 0,
    isOverLimit: clamped > 1,
  };
}

// Regular (non-credit-card) ring: fill = expense as a share of income for
// the period. Past 100% (spent more than earned) triggers the second lap.
export function getRegularRingData(income: number, expense: number): RingData {
  if (income <= 0) {
    const spent = expense > 0;
    return { lap1Percent: spent ? 100 : 0, lap2Percent: spent ? 100 : 0, isOverLimit: spent };
  }
  return ringFromRatio(expense / income);
}

// Credit card ring: fill = amount currently owed as a share of the credit
// limit. Past 100% (over the limit) triggers the same second lap.
export function getCreditRingData(owed: number, creditLimit: number): RingData {
  if (creditLimit <= 0) {
    const inDebt = owed > 0;
    return { lap1Percent: inDebt ? 100 : 0, lap2Percent: inDebt ? 100 : 0, isOverLimit: inDebt };
  }
  return ringFromRatio(owed / creditLimit);
}
