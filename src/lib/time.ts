import { Temporal } from "@js-temporal/polyfill";
export function localInstant(local: string, timezone: string): string {
  return Temporal.PlainDateTime.from(local)
    .toZonedDateTime(timezone, { disambiguation: "reject" })
    .toInstant()
    .toString();
}
export function timeParts(instant: string, timezone: string) {
  const local = Temporal.Instant.from(instant).toZonedDateTimeISO(timezone);
  return {
    weekday: local.dayOfWeek,
    minutes: local.hour * 60 + local.minute,
    date: local.toPlainDate().toString(),
  };
}
export function formatTime(value: string, zone = "Asia/Jerusalem") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function formatDay(value: string, zone = "Asia/Jerusalem") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
export const money = (amount: number) =>
  new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount / 100);
