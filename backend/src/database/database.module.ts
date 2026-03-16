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
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(50) NOT NULL DEFAULT 'anonymous',
        score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database table "scores" ready');
  }
}

export { PG_POOL };
