import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class ScoresService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(playerName: string, score: number) {
    const result = await this.pool.query(
      'INSERT INTO scores (player_name, score) VALUES ($1, $2) RETURNING *',
      [playerName, score],
    );
    return result.rows[0];
  }

  async findTop10() {
    const result = await this.pool.query(
      'SELECT * FROM scores ORDER BY score DESC LIMIT 10',
    );
    return result.rows;
  }
}
