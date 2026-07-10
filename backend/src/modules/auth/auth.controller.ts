import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtPayload } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (SSO simulation)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive access + refresh token pair' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate token pair using refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh token' })
  logout(@CurrentUser() user: JwtPayload) {
    return this.auth.logout(user.sub);
  }
}
