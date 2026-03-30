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

  async findOne(id: number) {
    const result = await this.pool.query(
      'SELECT * FROM scores WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: number, playerName: string, score: number) {
    const result = await this.pool.query(
      'UPDATE scores SET player_name = $1, score = $2 WHERE id = $3 RETURNING *',
      [playerName, score, id],
    );
    return result.rows[0] || null;
  }

  async remove(id: number) {
    const result = await this.pool.query(
      'DELETE FROM scores WHERE id = $1 RETURNING *',
      [id],
    );
    return result.rows[0] || null;
  }
}
