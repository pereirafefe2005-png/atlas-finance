export function formatCurrency(cents: number, compact = false) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(cents / 100);
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function toCents(value: string) {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(".", "").replace(",", ".");
  return Math.round(Number(normalized || 0) * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
