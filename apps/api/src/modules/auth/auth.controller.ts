import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { RegisterFcmDto } from './dto/register-fcm.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(FirebaseAuthGuard)
  async register(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(user, dto);
  }

  @Post('register-fcm')
  @UseGuards(FirebaseAuthGuard)
  async registerFcmToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RegisterFcmDto,
  ) {
    return this.authService.registerFcmToken(user.id, dto);
  }

  @Post('verify-token')
  @Public()
  async verifyToken(@Body('idToken') idToken: string) {
    return this.authService.verifyAndGetOrCreateUser(idToken);
  }
}
