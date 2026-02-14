export function parseAmountToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;

  return Math.round(amount * 100);
}

export function formatCents(cents: number, currency: string): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency
  });

  return formatter.format(cents / 100);
}
