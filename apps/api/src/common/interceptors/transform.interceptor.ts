import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Normalize Prisma Decimal / BigInt to numbers/strings for JSON
        return normalize(data);
      })
    );
  }
}

function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(normalize);
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "object") {
    const anyV = v as { toNumber?: () => number; toISOString?: () => string };
    if (typeof anyV.toNumber === "function") return anyV.toNumber();
    if (v instanceof Date) return v.toISOString();
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = normalize(val);
    }
    return out;
  }
  return v;
}
