import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "../../common/decorators/public.decorator";
import { IsOptional, IsString, Length, Matches } from "class-validator";

class SendOtpDto {
  @Matches(/^\+?\d{10,15}$/, { message: "Phone must be 10-15 digits" })
  phone!: string;
}

class VerifyOtpDto {
  @Matches(/^\+?\d{10,15}$/)
  phone!: string;

  @IsString()
  @Length(4, 8)
  otp!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("send-otp")
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone);
  }

  @Public()
  @Post("verify-otp")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.otp, dto.name, dto.email);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
    return { success: true };
  }
}
