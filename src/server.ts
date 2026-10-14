import { config } from "./config";
import type { Fill, Quote } from "./market";
import type { BlockEvent } from "./trader";

interface Meta { model: string; wallet: string | null; dryRun: boolean; market: string; startedAt: number; pair: string }

/** Pause/resume handle for the trading loop. Read fresh on every request, so it is never cached in meta. */
export interface Control { running: () => boolean; setRunning: (running: boolean) => void }

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

/** GET / snapshot · GET /history recent blocks · POST /stop /start pause and resume · GET /events SSE stream */
export function startServer(meta: Meta, history: () => BlockEvent[], control: Control) {
  const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const enc = new TextEncoder();
  const send = (c: ReadableStreamDefaultController<Uint8Array>, type: string, data: unknown) => {
    try { c.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { clients.delete(c); }
  };
  setInterval(() => clients.forEach((c) => send(c, "ping", Date.now())), 15_000);
  /** meta plus the live run state, so a client connecting mid-session is never out of date. */
  const snapshot = () => ({ ...meta, running: control.running() });

  Bun.serve({
    port: config.port,
    async fetch(req) {
      const { pathname } = new URL(req.url);
      if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
      if (pathname === "/") return json({ ...snapshot(), latest: history().at(-1) ?? null });
      if (pathname === "/history") return json(history());
      // Two explicit verbs rather than a toggle: a double-click or a retried request cannot
      // flip the bot back the other way.
      if (pathname === "/stop" || pathname === "/start") {
        if (req.method !== "POST") return json({ error: "use POST" }, 405);
        control.setRunning(pathname === "/start");
        return json(snapshot());
      }
      if (pathname === "/events") {
        const stream = new ReadableStream<Uint8Array>({
          start(c) { clients.add(c); send(c, "snapshot", { ...snapshot(), history: history() }); },
          cancel(c) { clients.delete(c); },
        });
        return new Response(stream, { headers: { ...CORS, "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
      }
      return json({ error: "not found" }, 404);
    },
  });

  const broadcast = (type: string, data: unknown) => clients.forEach((c) => send(c, type, data));
  return {
    broadcast: (e: BlockEvent) => broadcast("block", e),
    /** A quote's receipt landed: placed (with order id) or reverted, and the real gas. */
    broadcastQuote: (block: number, quote: Quote) => broadcast("quote", { block, quote }),
    /** A taker hit one of our resting orders in `block`. */
    broadcastFill: (block: number, fill: Fill) => broadcast("fill", { block, fill }),
    /** The loop was stopped or resumed, from any client. */
    broadcastControl: (running: boolean) => broadcast("control", { running }),
  };
}
