/** Generate a human-friendly unique order number, e.g. SUB-102913. */
export function generateOrderNumber(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `SUB-${n}`;
}

export function generateSubscriptionNumber(): string {
  const n = Math.floor(1000000 + Math.random() * 9000000);
  return `SUB-${n}`;
}