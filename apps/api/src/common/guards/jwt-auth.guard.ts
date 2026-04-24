import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }
    const token = auth.slice(7);
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      req.user = {
        id: payload.sub,
        phone: payload.phone,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
