import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class SettingsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getAll(): Promise<Record<string, string>> {
    const result = await this.pool.query('SELECT key, value FROM game_settings');
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async update(key: string, value: string) {
    const result = await this.pool.query(
      `UPDATE game_settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *`,
      [value, key],
    );
    return result.rows[0] || null;
  }
}
