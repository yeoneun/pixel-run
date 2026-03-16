import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ScoresModule } from './scores/scores.module';

@Module({
  imports: [DatabaseModule, ScoresModule],
})
export class AppModule {}
