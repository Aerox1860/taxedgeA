export interface PanMaskOptions {
  visibleStart?: number;
  visibleEnd?: number;
}

export function maskPan(value?: string | null, options: PanMaskOptions = {}): string {
  const pan = value?.trim() ?? "";
  if (!pan) return "—";

  const visibleStart = Math.max(0, options.visibleStart ?? 2);
  const visibleEnd = Math.max(0, options.visibleEnd ?? 2);
  const visibleCharacters = visibleStart + visibleEnd;
  if (pan.length <= visibleCharacters) return "*".repeat(pan.length);

  return `${pan.slice(0, visibleStart)}${"*".repeat(pan.length - visibleCharacters)}${
    visibleEnd ? pan.slice(-visibleEnd) : ""
  }`;
}

export function maskMobile(value?: string | null): string {
  const mobile = value?.trim() ?? "";
  if (!mobile) return "—";

  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 5) return "*".repeat(digits.length);
  return `${digits.slice(0, 2)}${"*".repeat(digits.length - 4)}${digits.slice(-2)}`;
}
