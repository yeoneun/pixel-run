import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  async getAll() {
    return this.settingsService.getAll();
  }

  @UseGuards(AuthGuard)
  @Patch('admin/settings')
  async update(@Body() body: Record<string, string>) {
    const results: Record<string, any> = {};
    for (const [key, value] of Object.entries(body)) {
      results[key] = await this.settingsService.update(key, value);
    }
    return results;
  }
}
