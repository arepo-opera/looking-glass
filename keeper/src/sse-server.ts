import * as http from "http";
import type { Status } from "./types";
import type { SeedDisplay } from "./seeds/types";

export interface SeedsEvent {
  type: "seeds";
  seeds: SeedDisplay[];
  ts: number;
}
export interface StatusEvent {
  type: "status";
  status: Status;
  epoch: number;
  nextTickSeconds: number;
  ts: number;
}
export interface ProphecyEvent {
  type: "prophecy";
  epoch: number;
  text: string;
  hash: string; // hex
  ts: number;
}
export type LiveEvent = SeedsEvent | StatusEvent | ProphecyEvent;

interface Sub {
  res: http.ServerResponse;
}

export class SseServer {
  private subs = new Set<Sub>();
  private server: http.Server | null = null;
  private latest = new Map<LiveEvent["type"], LiveEvent>();

  start(port: number, host: string = "0.0.0.0"): void {
    this.server = http.createServer((req, res) => {
      // Permissive CORS — this is a local dev convenience server.
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.url === "/events" && req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        // Replay the last known value of each event type so a fresh tab is
        // never blank.
        for (const ev of this.latest.values()) this.write(res, ev);
        const sub: Sub = { res };
        this.subs.add(sub);
        const remote =
          (req.socket?.remoteAddress ?? "?") +
          ":" +
          (req.socket?.remotePort ?? "?");
        process.stderr.write(
          `[sse] connect ${remote} (subs=${this.subs.size})\n`
        );
        const heartbeat = setInterval(() => {
          try {
            res.write(": ping\n\n");
          } catch (e) {
            process.stderr.write(
              `[sse] heartbeat write failed for ${remote}: ${(e as Error)?.message ?? e}\n`
            );
          }
        }, 15_000);
        req.on("close", () => {
          clearInterval(heartbeat);
          this.subs.delete(sub);
          process.stderr.write(
            `[sse] disconnect ${remote} (subs=${this.subs.size})\n`
          );
        });
        return;
      }
      if (req.url === "/health" || req.url === "/healthz") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
      }
      if (req.url === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(
          "looking glass keeper. /events for the SSE stream, /health for liveness.\n"
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    this.server.listen(port, host);
  }

  broadcast(event: LiveEvent): void {
    this.latest.set(event.type, event);
    for (const s of this.subs) this.write(s.res, event);
  }

  private write(res: http.ServerResponse, event: LiveEvent): void {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (e) {
      process.stderr.write(
        `[sse] event write failed (type=${event.type}): ${(e as Error)?.message ?? e}\n`
      );
    }
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.subs.clear();
  }
}
