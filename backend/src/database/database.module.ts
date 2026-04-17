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
    // scores 테이블 생성 (신규 DB용)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(50) NOT NULL DEFAULT 'anonymous',
        contact VARCHAR(100) NOT NULL DEFAULT '',
        score INTEGER NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 기존 테이블에 새 컬럼이 없으면 추가 (마이그레이션)
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'contact') THEN
          ALTER TABLE scores ADD COLUMN contact VARCHAR(100) NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'user_agent') THEN
          ALTER TABLE scores ADD COLUMN user_agent TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'ip_address') THEN
          ALTER TABLE scores ADD COLUMN ip_address VARCHAR(45);
        END IF;
      END $$;
    `);

    // contact 유니크 인덱스 (빈 문자열 제외)
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_unique_contact
        ON scores (contact) WHERE contact != '';
    `);

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

    console.log('Database tables ready: scores, game_settings, sprites');
  }
}

export { PG_POOL };
