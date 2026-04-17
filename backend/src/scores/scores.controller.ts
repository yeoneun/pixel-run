import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ScoresService } from './scores.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Post()
  async create(
    @Body() body: { player_name?: string; contact?: string; score: number },
    @Req() req: Request,
  ) {
    const playerName = body.player_name || 'anonymous';
    const contact = body.contact || '';
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    return this.scoresService.create(playerName, contact, body.score, userAgent, ipAddress);
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll() {
    return this.scoresService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const score = await this.scoresService.findOne(Number(id));
    if (!score) {
      throw new NotFoundException(`Score #${id} not found`);
    }
    return score;
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { player_name?: string; score?: number },
  ) {
    const existing = await this.scoresService.findOne(Number(id));
    if (!existing) {
      throw new NotFoundException(`Score #${id} not found`);
    }
    const playerName = body.player_name ?? existing.player_name;
    const score = body.score ?? existing.score;
    return this.scoresService.update(Number(id), playerName, score);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const score = await this.scoresService.remove(Number(id));
    if (!score) {
      throw new NotFoundException(`Score #${id} not found`);
    }
    return score;
  }
}
