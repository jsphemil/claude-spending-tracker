export type Bucket = { key: string; name: string; icon: string; total: number };

export function addToBucket(
  map: Map<string, Bucket>,
  key: string,
  name: string,
  icon: string,
  amount: number
) {
  const entry = map.get(key) ?? { key, name, icon, total: 0 };
  entry.total += amount;
  map.set(key, entry);
}

export function sortedBuckets(map: Map<string, Bucket>) {
  return [...map.values()].sort((a, b) => b.total - a.total);
}
