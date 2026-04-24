import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { createHash, randomBytes, randomInt } from "node:crypto";
import type {
  SendOtpResponse,
  VerifyOtpResponse,
  UserDto,
} from "@showbook/types";

function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}

function toUserDto(u: {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: string;
  cityId: string | null;
}): UserDto {
  return {
    id: u.id,
    phone: u.phone,
    email: u.email,
    name: u.name,
    role: u.role as UserDto["role"],
    cityId: u.cityId,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async sendOtp(phone: string): Promise<SendOtpResponse> {
    if (!/^\+?\d{10,15}$/.test(phone)) {
      throw new BadRequestException("Invalid phone number");
    }
    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.otpRequest.create({
      data: { phone, otp, expiresAt },
    });
    // Log the OTP so the demo user can see it on the server console
    this.logger.log(`📱 OTP for ${phone}: ${otp}  (expires ${expiresAt.toISOString()})`);

    return {
      success: true,
      devOtp: process.env.DEMO_MODE === "true" ? otp : undefined,
      expiresInSec: 300,
    };
  }

  async verifyOtp(phone: string, otp: string, name?: string, email?: string): Promise<VerifyOtpResponse> {
    const bypass = process.env.DEMO_OTP_BYPASS || "123456";
    const isBypass = process.env.DEMO_MODE === "true" && otp === bypass;

    if (!isBypass) {
      const rec = await this.prisma.otpRequest.findFirst({
        where: { phone, consumedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (!rec) throw new UnauthorizedException("No OTP requested");
      if (rec.otp !== otp) throw new UnauthorizedException("Incorrect OTP");
      if (rec.expiresAt < new Date()) throw new UnauthorizedException("OTP expired");
      await this.prisma.otpRequest.update({
        where: { id: rec.id },
        data: { consumedAt: new Date() },
      });
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          name: name ?? null,
          email: email ?? null,
          phoneVerified: true,
          role: "USER",
        },
      });
    } else if (name || email) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: name ?? user.name,
          email: email ?? user.email,
          phoneVerified: true,
        },
      });
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<VerifyOtpResponse> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token invalid");
    }
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(row.user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    role: string;
    cityId: string | null;
  }): Promise<VerifyOtpResponse> {
    const accessToken = this.jwt.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });
    const refreshToken = randomBytes(48).toString("hex");
    const days = parseInt(process.env.JWT_REFRESH_TTL_DAYS || "30", 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, user: toUserDto(user) };
  }
}
