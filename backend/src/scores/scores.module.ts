import { Module } from '@nestjs/common';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ScoresController],
  providers: [ScoresService],
})
export class ScoresModule {}
