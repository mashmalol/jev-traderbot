/** Formatting helpers — see CONTRACT.md. All are pure and SSR-safe. */

const INT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function safe(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** 105416201 -> "105,416,201" */
export function fmtInt(n: number | null | undefined): string {
  return INT.format(Math.round(safe(n)));
}

/** "cbBTC/USDC" -> "cbBTC"; the base half of a pair label. */
export function baseSymbol(pair: string | null | undefined): string {
  return (pair ?? "").split("/")[0] || "";
}

/** "cbBTC/USDC" -> "USDC". */
export function quoteSymbol(pair: string | null | undefined): string {
  return (pair ?? "").split("/")[1] || "";
}

/**
 * Adaptive so it reads the same at either end of the range: a sub-dollar pair like MON/USDC
 * needs 6dp, while a BTC-sized price at 6dp is all trailing zeros.
 */
export function fmtPrice(n: number | null | undefined): string {
  const v = safe(n);
  const a = Math.abs(v);
  return a >= 1000 ? v.toFixed(2) : a >= 1 ? v.toFixed(4) : v.toFixed(6);
}

/** 0.0045 -> "$0.0045"; negatives -> "-$0.0045" */
export function fmtUsd(n: number | null | undefined, d = 4): string {
  const v = safe(n);
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(d)}`;
}

/**
 * About four significant digits, so 200 and 0.01 are both readable. Unlike a fixed rule this keeps
 * a near-zero pnl as "+0.00" instead of trailing eight decimals.
 */
function adaptiveDp(v: number): number {
  const a = Math.abs(v);
  if (a === 0 || !Number.isFinite(a)) return 2;
  const intDigits = Math.floor(Math.log10(a)) + 1;
  return Math.max(0, Math.min(8, 4 - intDigits));
}

/** 0.0213 -> "0.0213 cbBTC"; 200 -> "200 cbBTC" */
export function fmtBase(n: number | null | undefined, sym = ""): string {
  const v = safe(n);
  return `${v.toFixed(adaptiveDp(v))}${sym ? ` ${sym}` : ""}`;
}

/** 0.62 -> "62%" */
export function fmtPct(p: number | null | undefined): string {
  return `${Math.round(safe(p) * 100)}%`;
}

/** 0.62 -> "0.62" (two-decimal confidence) */
export function fmtConf(p: number | null | undefined): string {
  return safe(p).toFixed(2);
}

/** Signed number with a forced +/- sign: (0.003, 3) -> "+0.003" */
export function fmtSigned(n: number | null | undefined, d = 3): string {
  const v = safe(n);
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(d)}`;
}

/** -0.0012 -> "-0.0012 cbBTC"; 0.003 -> "+0.003 cbBTC" */
export function fmtSignedBase(n: number | null | undefined, sym = ""): string {
  return `${fmtSigned(safe(n), adaptiveDp(safe(n)))}${sym ? ` ${sym}` : ""}`;
}

/** 0.0012 (a ratio) -> "+0.12%" */
export function fmtSignedPct(p: number | null | undefined, d = 2): string {
  return `${fmtSigned(safe(p) * 100, d)}%`;
}

/** 107 -> "107 ms" */
export function fmtMs(n: number | null | undefined): string {
  return `${Math.round(safe(n))} ms`;
}

/** Accepts ms- or seconds-epoch. Elapsed since `startedAt` as "04:13:42". */
export function uptime(startedAt: number | null | undefined, now: number = Date.now()): string {
  if (!startedAt || !Number.isFinite(startedAt)) return "00:00:00";
  const startMs = startedAt < 1e12 ? startedAt * 1000 : startedAt;
  return hhmmss(Math.max(0, now - startMs));
}

/** Milliseconds -> "hh:mm:ss" (hours are not capped at 24). */
export function hhmmss(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "0x7F3a...9C4e" */
export function shortAddr(a: string | null | undefined): string {
  if (!a) return "";
  return a.length <= 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** "0x8f2c..." */
export function shortTx(h: string | null | undefined): string {
  if (!h) return "";
  return h.length <= 6 ? h : `${h.slice(0, 6)}…`;
}

export function txUrl(h: string): string {
  return `https://monadvision.com/tx/${h}`;
}
