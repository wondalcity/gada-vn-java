import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { RegisterFcmDto } from './dto/register-fcm.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Get current user profile */
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getMe(user.id);
  }

  /** Update auth profile (email) from profile settings */
  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { email?: string },
  ) {
    return this.authService.updateProfile(user.id, { email: body.email });
  }

  /** Complete profile after OTP login (register page) */
  @Post('register')
  @UseGuards(FirebaseAuthGuard)
  async register(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name?: string; email?: string; password?: string; role?: string },
  ) {
    return this.authService.updateProfile(user.id, body);
  }

  @Post('register-fcm')
  @UseGuards(FirebaseAuthGuard)
  async registerFcmToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RegisterFcmDto,
  ) {
    return this.authService.registerFcmToken(user.id, dto);
  }

  /** Verify Firebase ID token — used for web app session init */
  @Post('verify-token')
  @Public()
  async verifyToken(@Body('idToken') idToken: string) {
    return this.authService.verifyAndGetOrCreateUser(idToken);
  }

  /** Check if phone is a test account (bypass Firebase OTP) */
  @Get('is-test-phone')
  @Public()
  async isTestPhone(@Query('phone') phone: string) {
    return this.authService.isTestPhone(phone);
  }

  /** Step 1: Send OTP to phone */
  @Post('otp/send')
  @Public()
  async sendOtp(@Body('phone') phone: string) {
    return this.authService.sendOtp(phone);
  }

  /** Step 2: Verify OTP → get session token */
  @Post('otp/verify')
  @Public()
  async verifyOtp(
    @Body('phone') phone: string,
    @Body('otp') otp: string,
  ) {
    return this.authService.verifyOtp(phone, otp);
  }

  /** Email + password login */
  @Post('login')
  @Public()
  async loginEmail(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.loginEmail(email, password);
  }

  /** Facebook social login */
  @Post('social/facebook')
  @Public()
  async socialFacebook(@Body('idToken') idToken: string) {
    return this.authService.socialFacebook(idToken);
  }

  /** Link phone to Facebook account (after phone OTP verification) */
  @Post('social/link-phone')
  @UseGuards(FirebaseAuthGuard)
  async linkPhone(
    @CurrentUser() user: CurrentUserPayload,
    @Body('phoneIdToken') phoneIdToken: string,
  ) {
    await this.authService.linkPhone(user.id, phoneIdToken);
    return { success: true };
  }

  /** Logout — revoke Firebase tokens */
  @Post('logout')
  @UseGuards(FirebaseAuthGuard)
  async logout(@CurrentUser() user: CurrentUserPayload) {
    await this.authService.logout(user.firebaseUid);
    return { success: true };
  }
}
