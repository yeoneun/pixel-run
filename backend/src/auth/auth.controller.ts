import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { password: string }) {
    const token = this.authService.login(body.password);
    return { token };
  }
}
