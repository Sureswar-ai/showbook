import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const logger = new Logger("Bootstrap");

  const origin = process.env.API_CORS_ORIGIN || "http://localhost:3000";
  app.enableCors({
    origin: origin.split(",").map((s) => s.trim()),
    credentials: true,
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  );

  const port = parseInt(process.env.API_PORT || "3001", 10);
  await app.listen(port);
  logger.log(`🚀 API ready on http://localhost:${port}/api/v1`);
  logger.log(`🔌 WebSocket on http://localhost:${port}`);
  if (process.env.DEMO_MODE === "true") {
    logger.log(`🧪 DEMO_MODE=true — OTP bypass: ${process.env.DEMO_OTP_BYPASS || "123456"}`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal:", err);
  process.exit(1);
});
