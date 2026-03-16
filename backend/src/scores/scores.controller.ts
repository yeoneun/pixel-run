import { Controller, Get, Post, Body } from '@nestjs/common';
import { ScoresService } from './scores.service';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Post()
  async create(@Body() body: { player_name?: string; score: number }) {
    const playerName = body.player_name || 'anonymous';
    return this.scoresService.create(playerName, body.score);
  }

  @Get()
  async findAll() {
    return this.scoresService.findTop10();
  }
}
