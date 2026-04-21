import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SpritesModule } from './sprites/sprites.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [DatabaseModule, AuthModule, SpritesModule, SettingsModule],
})
export class AppModule {}
