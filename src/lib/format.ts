/** Formattazione all'italiana di importi, date e percentuali. */

const EURO = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

const DATE_TIME = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
export const dateTime = (d: string | undefined | null) => (d ? DATE_TIME.format(new Date(d)) : "—");

export const euro = (n: number | undefined) => (n === undefined ? "—" : EURO.format(n));
export const date = (d: string | undefined | null) => (d ? DATE.format(new Date(d)) : "—");
export const pct = (n: number | undefined) => (n === undefined ? "—" : `${n.toLocaleString("it-IT")}%`);

export function daysUntil(d: string, now: Date): number {
  return Math.ceil((new Date(d).getTime() - now.getTime()) / 86_400_000);
}
