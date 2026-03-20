import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType | null = null;
  private connected = false;

  async getClient(): Promise<RedisClientType | null> {
    if (this.client && this.connected) return this.client;

    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    try {
      this.client = createClient({ url: redisUrl }) as RedisClientType;
      this.client.on('error', (err: Error) => {
        this.logger.warn(`Redis error: ${err.message}`);
        this.connected = false;
      });
      await this.client.connect();
      this.connected = true;
      return this.client;
    } catch (err) {
      this.logger.warn('Redis unavailable — cache disabled');
      this.client = null;
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    if (!client) return null;
    try {
      const val = await client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch {
      // cache write failure is non-fatal
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    try {
      await client.del(key);
    } catch {
      // non-fatal
    }
  }

  async delPattern(pattern: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) await client.del(keys);
    } catch {
      // non-fatal
    }
  }

  async onModuleDestroy() {
    if (this.client && this.connected) {
      await this.client.quit();
    }
  }
}
