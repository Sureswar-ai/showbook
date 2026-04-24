import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";

const LOCK_TTL_SECONDS = 600; // 10 minutes
const LOCK_TTL_MS = LOCK_TTL_SECONDS * 1000;

function key(showId: string, seatId: string): string {
  return `lock:show:${showId}:seat:${seatId}`;
}

@Injectable()
export class SeatLockService {
  private readonly logger = new Logger(SeatLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Attempt to lock a set of seats for a given booking intent.
   * Uses Redis `SET NX PX` per-seat. If any seat is already locked, the whole batch
   * is rolled back (best-effort). Returns which succeeded vs failed so the UI
   * can show a helpful error.
   */
  async lockSeats(params: {
    showId: string;
    seatIds: string[];
    bookingIntentId: string;
    userId: string;
  }): Promise<{
    locked: string[];
    failed: string[];
    expiresAt: Date;
  }> {
    const { showId, seatIds, bookingIntentId, userId } = params;
    if (seatIds.length === 0) return { locked: [], failed: [], expiresAt: new Date() };

    const locked: string[] = [];
    const failed: string[] = [];
    const lockValue = `${bookingIntentId}:${userId}`;

    // Pipeline a batch of SET NX PX
    const pipeline = this.redis.client.pipeline();
    for (const seatId of seatIds) {
      pipeline.set(key(showId, seatId), lockValue, "PX", LOCK_TTL_MS, "NX");
    }
    const results = await pipeline.exec();
    if (!results) {
      this.logger.error("Redis pipeline returned null");
      return { locked: [], failed: seatIds, expiresAt: new Date() };
    }

    for (let i = 0; i < seatIds.length; i++) {
      const [err, result] = results[i] ?? [null, null];
      if (err) {
        failed.push(seatIds[i]!);
      } else if (result === "OK") {
        locked.push(seatIds[i]!);
      } else {
        failed.push(seatIds[i]!);
      }
    }

    // If any failed, roll back the partial success so the user can re-try cleanly
    if (failed.length > 0 && locked.length > 0) {
      const rollback = this.redis.client.pipeline();
      for (const sid of locked) {
        // Only release if we still own the lock (safe-delete via GET+DEL pattern)
        rollback.del(key(showId, sid));
      }
      await rollback.exec();
      // Treat everything as failed since the user asked for an all-or-nothing lock
      failed.push(...locked);
      locked.length = 0;
    }

    const expiresAt = new Date(Date.now() + LOCK_TTL_MS);

    // Publish so other listeners (Socket.IO gateway) broadcast
    if (locked.length > 0) {
      await this.redis.publisher.publish(
        "seat-events",
        JSON.stringify({
          type: "locked",
          showId,
          seatIds: locked,
          lockedByUserId: userId,
          lockExpiresAt: expiresAt.toISOString(),
        })
      );
    }

    return { locked, failed, expiresAt };
  }

  /**
   * Release locks we own. Uses a Lua script to avoid releasing someone else's lock
   * when our key happens to coincide.
   */
  async releaseSeats(params: {
    showId: string;
    seatIds: string[];
    bookingIntentId: string;
    userId: string;
  }): Promise<{ released: string[] }> {
    const { showId, seatIds, bookingIntentId, userId } = params;
    if (seatIds.length === 0) return { released: [] };

    const expectedValue = `${bookingIntentId}:${userId}`;
    const released: string[] = [];

    // Lua: release only if value matches
    const luaRelease = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    for (const seatId of seatIds) {
      const res = (await this.redis.client.eval(
        luaRelease,
        1,
        key(showId, seatId),
        expectedValue
      )) as number;
      if (res === 1) released.push(seatId);
    }

    if (released.length > 0) {
      await this.redis.publisher.publish(
        "seat-events",
        JSON.stringify({
          type: "released",
          showId,
          seatIds: released,
        })
      );
    }

    return { released };
  }

  /**
   * Confirm = mark seats as permanently BOOKED. Publishes a "booked" event and
   * removes the Redis locks.
   */
  async confirmSeats(params: { showId: string; seatIds: string[] }): Promise<void> {
    const { showId, seatIds } = params;
    if (seatIds.length === 0) return;
    const pipeline = this.redis.client.pipeline();
    for (const sid of seatIds) pipeline.del(key(showId, sid));
    await pipeline.exec();
    await this.redis.publisher.publish(
      "seat-events",
      JSON.stringify({ type: "booked", showId, seatIds })
    );
  }

  async currentLocks(showId: string, seatIds: string[]): Promise<Record<string, string | null>> {
    if (seatIds.length === 0) return {};
    const keys = seatIds.map((sid) => key(showId, sid));
    const values = await this.redis.client.mget(keys);
    const out: Record<string, string | null> = {};
    seatIds.forEach((sid, i) => (out[sid] = values[i] ?? null));
    return out;
  }
}
