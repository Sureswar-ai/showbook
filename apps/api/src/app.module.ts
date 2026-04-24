import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CitiesModule } from "./modules/cities/cities.module";
import { MoviesModule } from "./modules/movies/movies.module";
import { TheatersModule } from "./modules/theaters/theaters.module";
import { ShowsModule } from "./modules/shows/shows.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { EventsModule } from "./modules/events/events.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { OffersModule } from "./modules/offers/offers.module";
import { FnbModule } from "./modules/fnb/fnb.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SearchModule } from "./modules/search/search.module";
import { AdminModule } from "./modules/admin/admin.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CitiesModule,
    MoviesModule,
    TheatersModule,
    ShowsModule,
    BookingsModule,
    PaymentsModule,
    EventsModule,
    ReviewsModule,
    OffersModule,
    FnbModule,
    NotificationsModule,
    SearchModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
