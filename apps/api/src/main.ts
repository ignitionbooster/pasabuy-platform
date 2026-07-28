import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./redis/redis-io.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
  );

  // Ride events (driver location, matches, status changes) fan out over Redis
  // pub/sub so this works correctly once you run more than one API instance.
  const redisUrl = config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
  const redisAdapter = new RedisIoAdapter(app, redisUrl);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  const port = config.get<number>("PORT") ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Sakay API listening on :${port}`);
}
bootstrap();
