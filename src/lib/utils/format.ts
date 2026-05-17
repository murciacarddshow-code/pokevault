/** Formatea un número como moneda EUR */
export function formatEUR(amount: number | string): string {
  return new Intl.NumberFormat("es-ES", {
    style:    "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

/** Formatea una fecha relativa ("hace 2 min", "ayer"...) */
export function formatRelative(date: Date | string): string {
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60)   return "ahora mismo";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} días`;

  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
