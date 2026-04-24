import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RedisService } from "../../redis/redis.service";

@Injectable()
@WebSocketGateway({
  cors: { origin: (process.env.API_CORS_ORIGIN || "http://localhost:3000").split(","), credentials: true },
})
export class SeatGateway implements OnGatewayInit {
  private readonly logger = new Logger(SeatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly redis: RedisService) {}

  async afterInit() {
    await this.redis.subscriber.subscribe("seat-events");
    this.redis.subscriber.on("message", (_channel, message) => {
      try {
        const payload = JSON.parse(message) as {
          type: "locked" | "released" | "booked";
          showId: string;
          seatIds: string[];
          lockedByUserId?: string;
          lockExpiresAt?: string;
        };
        const room = `show:${payload.showId}`;
        if (payload.type === "locked") {
          this.server.to(room).emit("seat:locked", {
            showId: payload.showId,
            seatIds: payload.seatIds,
            lockedByUserId: payload.lockedByUserId,
            lockExpiresAt: payload.lockExpiresAt,
          });
        } else if (payload.type === "released") {
          this.server.to(room).emit("seat:released", {
            showId: payload.showId,
            seatIds: payload.seatIds,
          });
        } else if (payload.type === "booked") {
          this.server.to(room).emit("seat:booked", {
            showId: payload.showId,
            seatIds: payload.seatIds,
          });
        }
      } catch (e) {
        this.logger.error(`Bad seat-event payload: ${(e as Error).message}`);
      }
    });
    this.logger.log("Seat gateway initialised, subscribed to seat-events");
  }

  @SubscribeMessage("show:join")
  onJoin(@MessageBody() data: { showId: string }, @ConnectedSocket() client: Socket) {
    if (!data?.showId) return { ok: false };
    client.join(`show:${data.showId}`);
    return { ok: true, room: `show:${data.showId}` };
  }

  @SubscribeMessage("show:leave")
  onLeave(@MessageBody() data: { showId: string }, @ConnectedSocket() client: Socket) {
    if (!data?.showId) return { ok: false };
    client.leave(`show:${data.showId}`);
    return { ok: true };
  }
}
