/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal in-memory stand-in for ioredis.
 *
 * Implements only the subset of commands ShowBook actually uses:
 *   - SET key value [PX ms] [NX]
 *   - GET, MGET, DEL
 *   - EVAL (recognises the compare-and-delete Lua script used by SeatLockService)
 *   - PUBLISH / SUBSCRIBE with on("message", …)
 *   - pipeline() with set/del/exec
 *   - ping, quit, on("error", …)
 *
 * For a single-process demo this preserves the exact correctness guarantees of
 * Redis `SET NX PX` (first-writer-wins) because the Node event loop is single
 * threaded — two concurrent HTTP requests cannot interleave within a single
 * JS tick. If ShowBook ever runs multi-instance, swap this out for real Redis.
 */
import { EventEmitter } from "node:events";

interface Entry {
  value: string;
  expiresAt: number | null; // epoch ms
}

type Listener = (...args: any[]) => void;

class EventBus {
  private readonly channels = new Map<string, Set<(channel: string, message: string) => void>>();
  publish(channel: string, message: string): number {
    const subs = this.channels.get(channel);
    if (!subs) return 0;
    for (const cb of subs) cb(channel, message);
    return subs.size;
  }
  subscribe(channel: string, cb: (channel: string, message: string) => void) {
    let subs = this.channels.get(channel);
    if (!subs) {
      subs = new Set();
      this.channels.set(channel, subs);
    }
    subs.add(cb);
  }
  unsubscribe(channel: string, cb: (channel: string, message: string) => void) {
    const subs = this.channels.get(channel);
    if (subs) subs.delete(cb);
  }
}

// Shared store + bus across all InMemoryRedis instances so that
// client/publisher/subscriber roles behave as one logical Redis.
const SHARED_STORE = new Map<string, Entry>();
const SHARED_BUS = new EventBus();

function now(): number {
  return Date.now();
}

function active(e: Entry | undefined): e is Entry {
  if (!e) return false;
  if (e.expiresAt !== null && e.expiresAt <= now()) return false;
  return true;
}

export class InMemoryRedis extends EventEmitter {
  /** For Pipeline: queued operations */
  private readonly store = SHARED_STORE;
  private readonly bus = SHARED_BUS;
  private readonly messageCallbacks = new Map<string, (c: string, m: string) => void>();

  constructor(_url?: string, _opts?: unknown) {
    super();
  }

  async ping(): Promise<"PONG"> {
    return "PONG";
  }

  async set(
    key: string,
    value: string,
    ...args: (string | number)[]
  ): Promise<"OK" | null> {
    // Parse optional PX <ms> and NX flags in any order
    let px: number | null = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (typeof a === "string" && a.toUpperCase() === "PX") {
        const v = args[i + 1];
        px = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : null;
        i++;
      } else if (typeof a === "string" && a.toUpperCase() === "EX") {
        const v = args[i + 1];
        const secs = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : 0;
        px = secs * 1000;
        i++;
      } else if (typeof a === "string" && a.toUpperCase() === "NX") {
        nx = true;
      }
    }
    const existing = this.store.get(key);
    if (nx && active(existing)) return null;
    this.store.set(key, { value, expiresAt: px !== null ? now() + px : null });
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key);
    if (!active(e)) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map((k) => this.get(k)));
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  /**
   * Only the compare-and-delete script used by SeatLockService is recognised.
   * Other scripts return 0.
   */
  async eval(_script: string, _numKeys: number, ...rest: string[]): Promise<number> {
    // SeatLockService passes: KEYS[1]=lockKey, ARGV[1]=expectedValue
    const key = rest[0];
    const expected = rest[1];
    if (!key || expected === undefined) return 0;
    const e = this.store.get(key);
    if (active(e) && e.value === expected) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.bus.publish(channel, message);
  }

  async subscribe(...channels: string[]): Promise<number> {
    for (const ch of channels) {
      const cb = (c: string, m: string) => {
        this.emit("message", c, m);
      };
      this.messageCallbacks.set(ch, cb);
      this.bus.subscribe(ch, cb);
    }
    return channels.length;
  }

  async unsubscribe(...channels: string[]): Promise<number> {
    for (const ch of channels) {
      const cb = this.messageCallbacks.get(ch);
      if (cb) this.bus.unsubscribe(ch, cb);
      this.messageCallbacks.delete(ch);
    }
    return channels.length;
  }

  pipeline(): Pipeline {
    return new Pipeline(this);
  }

  async quit(): Promise<"OK"> {
    for (const [ch, cb] of this.messageCallbacks.entries()) {
      this.bus.unsubscribe(ch, cb);
    }
    this.messageCallbacks.clear();
    this.removeAllListeners();
    return "OK";
  }

  // ioredis compatibility shims
  on(event: string | symbol, listener: Listener): this {
    return super.on(event, listener);
  }
}

class Pipeline {
  private readonly ops: Array<() => Promise<unknown>> = [];
  constructor(private readonly client: InMemoryRedis) {}

  set(key: string, value: string, ...args: (string | number)[]): Pipeline {
    this.ops.push(() => this.client.set(key, value, ...args));
    return this;
  }
  del(key: string): Pipeline {
    this.ops.push(() => this.client.del(key));
    return this;
  }
  get(key: string): Pipeline {
    this.ops.push(() => this.client.get(key));
    return this;
  }

  async exec(): Promise<Array<[Error | null, unknown]>> {
    const out: Array<[Error | null, unknown]> = [];
    for (const op of this.ops) {
      try {
        const r = await op();
        out.push([null, r]);
      } catch (e) {
        out.push([e as Error, null]);
      }
    }
    return out;
  }
}
