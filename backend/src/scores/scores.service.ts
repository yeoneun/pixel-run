import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class ScoresService {
  private readonly maxRankingSize: number;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.maxRankingSize = parseInt(process.env.MAX_RANKING_SIZE || '500', 10);
  }

  async create(
    playerName: string,
    contact: string,
    score: number,
    userAgent?: string,
    ipAddress?: string,
  ) {
    // contact가 있으면 UPSERT (높은 점수만 갱신)
    let result;
    if (contact) {
      result = await this.pool.query(
        `INSERT INTO scores (player_name, contact, score, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (contact) WHERE contact != ''
         DO UPDATE SET
           player_name = EXCLUDED.player_name,
           score = GREATEST(scores.score, EXCLUDED.score),
           user_agent = EXCLUDED.user_agent,
           ip_address = EXCLUDED.ip_address,
           created_at = NOW()
         RETURNING *`,
        [playerName, contact, score, userAgent || null, ipAddress || null],
      );
    } else {
      result = await this.pool.query(
        `INSERT INTO scores (player_name, contact, score, user_agent, ip_address)
         VALUES ($1, '', $2, $3, $4) RETURNING *`,
        [playerName, score, userAgent || null, ipAddress || null],
      );
    }

    // 상위 N개만 보관
    await this.pool.query(
      `DELETE FROM scores WHERE id NOT IN (
        SELECT id FROM scores ORDER BY score DESC LIMIT $1
      )`,
      [this.maxRankingSize],
    );

    return result.rows[0];
  }

  async findAll() {
    const result = await this.pool.query(
      'SELECT * FROM scores ORDER BY score DESC',
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
