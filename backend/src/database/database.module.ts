import { Module, Global, OnModuleInit, Inject } from '@nestjs/common';
import { Pool } from 'pg';

const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        return new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5433', 10),
          database: process.env.DB_NAME || 'dino',
          user: process.env.DB_USER || 'dino',
          password: process.env.DB_PASSWORD || 'dino1234',
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleInit {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleInit() {
    // game_settings 테이블 생성
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS game_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 초기 데이터 삽입 (이미 있으면 무시)
    await this.pool.query(`
      INSERT INTO game_settings (key, value) VALUES ('happy_ending_score', '10000')
      ON CONFLICT (key) DO NOTHING;
    `);

    // sprites 테이블 생성
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sprites (
        key VARCHAR(100) PRIMARY KEY,
        image_data BYTEA NOT NULL,
        mime_type VARCHAR(20) NOT NULL,
        width INTEGER,
        height INTEGER,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Database tables ready: game_settings, sprites');
  }
}

export { PG_POOL };
