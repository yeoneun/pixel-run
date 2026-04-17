import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
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

  logout(token: string): void {
    this.tokens.delete(token);
  }
}
