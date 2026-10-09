export function formatReviewAmountDigits(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "—";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "—";
  return `₹${Number(digits).toLocaleString("en-IN")}`;
}

export function formatTenureEquivalent(monthsStr: string): string {
  const months = Number.parseInt(monthsStr, 10);
  if (!Number.isFinite(months) || months <= 0) return "";

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  if (remainingMonths === 0) {
    return `${months} months (${years} ${years === 1 ? "year" : "years"})`;
  }

  return `${months} months (${years} ${years === 1 ? "year" : "years"} ${remainingMonths} ${remainingMonths === 1 ? "month" : "months"})`;
}
