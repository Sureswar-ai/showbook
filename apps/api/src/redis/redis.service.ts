import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { InMemoryRedis } from "./in-memory-redis";

type RedisLike = Redis | InMemoryRedis;

function shouldUseInMemory(): boolean {
  const url = (process.env.REDIS_URL ?? "").trim();
  if (!url) return true;
  if (url.startsWith("memory://")) return true;
  return false;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _client!: RedisLike;
  private _subscriber!: RedisLike;
  private _publisher!: RedisLike;
  private _useInMemory = false;

  get client(): RedisLike {
    return this._client;
  }
  get subscriber(): RedisLike {
    return this._subscriber;
  }
  get publisher(): RedisLike {
    return this._publisher;
  }

  async onModuleInit() {
    this._useInMemory = shouldUseInMemory();
    if (this._useInMemory) {
      this.logger.log("🧠 Using in-memory Redis adapter (single-process demo mode)");
      this._client = new InMemoryRedis();
      this._subscriber = new InMemoryRedis();
      this._publisher = new InMemoryRedis();
      return;
    }
    const url = process.env.REDIS_URL!;
    const opts = { lazyConnect: false, maxRetriesPerRequest: 3 };
    this._client = new Redis(url, opts);
    this._subscriber = new Redis(url, opts);
    this._publisher = new Redis(url, opts);
    (this._client as Redis).on("error", (e) => this.logger.error(`[main] ${e.message}`));
    (this._subscriber as Redis).on("error", (e) => this.logger.error(`[sub] ${e.message}`));
    (this._publisher as Redis).on("error", (e) => this.logger.error(`[pub] ${e.message}`));
    try {
      await (this._client as Redis).ping();
      this.logger.log("✅ Redis connected");
    } catch (e) {
      this.logger.error(`❌ Redis ping failed: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([this._client?.quit(), this._subscriber?.quit(), this._publisher?.quit()]);
  }
}
