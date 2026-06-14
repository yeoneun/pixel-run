import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Res,
  NotFoundException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { SpritesService } from "./sprites.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller()
export class SpritesController {
  constructor(private readonly spritesService: SpritesService) {}

  @UseGuards(AuthGuard)
  @Post("admin/sprites/:key")
  @UseInterceptors(FileInterceptor("image"))
  async upload(
    @Param("key") key: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException("No image file provided");
    }
    return this.spritesService.upload(key, file.buffer, file.mimetype);
  }

  @UseGuards(AuthGuard)
  @Get("admin/sprites/:key")
  async getMeta(@Param("key") key: string) {
    const meta = await this.spritesService.getMeta(key);
    if (!meta) {
      throw new NotFoundException(`Sprite "${key}" not found`);
    }
    return meta;
  }

  @UseGuards(AuthGuard)
  @Delete("admin/sprites/:key")
  async delete(@Param("key") key: string) {
    const deleted = await this.spritesService.delete(key);
    if (!deleted) {
      throw new NotFoundException(`Sprite "${key}" not found`);
    }
    return { message: "Deleted" };
  }

  @Get("sprites/:key")
  async getImage(@Param("key") key: string, @Res() res: Response) {
    const sprite = await this.spritesService.getImage(key);
    if (!sprite) {
      throw new NotFoundException(`Sprite "${key}" not found`);
    }
    res.set({
      "Content-Type": sprite.mimeType,
      "Cache-Control": "public, max-age=86400",
    });
    res.send(Buffer.from(sprite.imageData));
  }
}
