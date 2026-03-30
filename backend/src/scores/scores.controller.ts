import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const score = await this.scoresService.findOne(Number(id));
    if (!score) {
      throw new NotFoundException(`Score #${id} not found`);
    }
    return score;
  }

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

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const score = await this.scoresService.remove(Number(id));
    if (!score) {
      throw new NotFoundException(`Score #${id} not found`);
    }
    return score;
  }
}
