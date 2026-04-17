import { Module } from '@nestjs/common';
import { SpritesController } from './sprites.controller';
import { SpritesService } from './sprites.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SpritesController],
  providers: [SpritesService],
})
export class SpritesModule {}
