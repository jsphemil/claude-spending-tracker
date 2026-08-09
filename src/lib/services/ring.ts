export type RingData = {
  lap1Percent: number; // 0-100, first pass around the ring
  lap2Percent: number; // 0-100, overflow pass once past 100% (0 if not over)
  isOverLimit: boolean;
};

// Ring fill = the period's spend as a share of the relevant limit — income
// for a regular account, credit limit for a credit card (same shape, just a
// different denominator). Past 100% triggers the second warning lap. The
// center figure is always the period's net amount spent, for both account
// types, regardless of what the fill is measured against.
export function getSpendRingData(limit: number, spend: number): RingData {
  if (limit <= 0) {
    const over = spend > 0;
    return { lap1Percent: over ? 100 : 0, lap2Percent: over ? 100 : 0, isOverLimit: over };
  }
  const ratio = Math.max(spend / limit, 0);
  return {
    lap1Percent: Math.min(ratio, 1) * 100,
    lap2Percent: ratio > 1 ? Math.min(ratio - 1, 1) * 100 : 0,
    isOverLimit: ratio > 1,
  };
}
