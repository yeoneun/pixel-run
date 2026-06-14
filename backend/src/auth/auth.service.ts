import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  // 토큰은 인메모리 보관 → 서버 재시작 시 전부 무효화된다. 만료/회전(rotation)은 미구현.
  private tokens = new Set<string>();

  login(password: string): string {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
    if (password !== adminPassword) {
      throw new UnauthorizedException('Invalid password');
    }
    const token = randomUUID();
    this.tokens.add(token);
    return token;
  }

  validateToken(token: string): boolean {
    return this.tokens.has(token);
  }
}
