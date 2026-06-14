import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const ALLOWED_MIME_TYPES = ['image/webp', 'image/png', 'image/svg+xml'];

@Injectable()
export class SpritesService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(key: string, imageData: Buffer | Uint8Array, mimeType: string) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Unsupported format: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // width/height 컬럼은 픽셀 크기 검증 기능을 위해 예약돼 있으나 현재 미구현(항상 null).
    return this.prisma.sprite.upsert({
      where: { key },
      create: {
        key,
        imageData: new Uint8Array(imageData),
        mimeType,
      },
      update: {
        imageData: new Uint8Array(imageData),
        mimeType,
        updatedAt: new Date(),
      },
      select: {
        key: true,
        mimeType: true,
        width: true,
        height: true,
        updatedAt: true,
      },
    });
  }

  async getMeta(key: string) {
    return this.prisma.sprite.findUnique({
      where: { key },
      select: {
        key: true,
        mimeType: true,
        width: true,
        height: true,
        updatedAt: true,
      },
    });
  }

  async getImage(key: string) {
    return this.prisma.sprite.findUnique({
      where: { key },
      select: {
        imageData: true,
        mimeType: true,
      },
    });
  }

  async delete(key: string) {
    try {
      await this.prisma.sprite.delete({ where: { key } });
      return true;
    } catch {
      return false;
    }
  }
}
