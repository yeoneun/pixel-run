import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

const ALLOWED_MIME_TYPES = ['image/webp', 'image/png'];

@Injectable()
export class SpritesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upload(
    key: string,
    imageData: Buffer,
    mimeType: string,
    width?: number,
    height?: number,
  ) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Unsupported format: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const result = await this.pool.query(
      `INSERT INTO sprites (key, image_data, mime_type, width, height, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (key) DO UPDATE SET
         image_data = EXCLUDED.image_data,
         mime_type = EXCLUDED.mime_type,
         width = EXCLUDED.width,
         height = EXCLUDED.height,
         updated_at = NOW()
       RETURNING key, mime_type, width, height, updated_at`,
      [key, imageData, mimeType, width || null, height || null],
    );
    return result.rows[0];
  }

  async getMeta(key: string) {
    const result = await this.pool.query(
      'SELECT key, mime_type, width, height, updated_at FROM sprites WHERE key = $1',
      [key],
    );
    return result.rows[0] || null;
  }

  async getImage(key: string) {
    const result = await this.pool.query(
      'SELECT image_data, mime_type FROM sprites WHERE key = $1',
      [key],
    );
    return result.rows[0] || null;
  }
}
