import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './config/prisma/prisma.module';
import { ClerkModule } from './config/clerk/clerk.module';
import { QueueModule } from './config/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { VoiceModule } from './modules/voice/voice.module';
import { SmsModule } from './modules/sms/sms.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { PublicBookingModule } from './modules/public-booking/public-booking.module';
import { ServicesModule } from './modules/services/services.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TeamModule } from './modules/team/team.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ReviewRequestsModule } from './modules/review-requests/review-requests.module';
import { HealthModule } from './modules/health/health.module';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { ThrottleModule } from './config/throttle/throttle.module';
import { CacheConfigModule } from './config/cache/cache.module';
import { StorageModule } from './config/storage/storage.module';
import { EventsModule } from './config/events/events.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CustomerContextModule } from './modules/customer-context/customer-context.module';
import { OutboundCampaignsModule } from './modules/outbound-campaigns/outbound-campaigns.module';
import { PhotoQuotesModule } from './modules/photo-quotes/photo-quotes.module';
import { AiSchedulingModule } from './modules/ai-scheduling/ai-scheduling.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { GatewaysModule } from './gateways/gateways.module';
import { NpsModule } from './modules/nps/nps.module';
import { PredictiveMaintenanceModule } from './modules/predictive-maintenance/predictive-maintenance.module';
import { DynamicPricingModule } from './modules/dynamic-pricing/dynamic-pricing.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PaymentReminderModule } from './modules/payment-reminders/payment-reminder.module';
import { NoshowPreventionModule } from './modules/noshow-prevention/noshow-prevention.module';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { CustomerRetentionModule } from './modules/customer-retention/customer-retention.module';
import { AiCommunicationModule } from './modules/ai-communication/ai-communication.module';
import { AiCopilotModule } from './modules/ai-copilot/ai-copilot.module';
import { SpecialistAgentsModule } from './modules/specialist-agents/specialist-agents.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { ClerkAuthGuard } from './common/guards/clerk-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ClerkModule,
    QueueModule,
    AiEngineModule,
    AuthModule,
    TenantsModule,
    CustomersModule,
    AppointmentsModule,
    QuotesModule,
    InvoicesModule,
    VoiceModule,
    SmsModule,
    PaymentsModule,
    AvailabilityModule,
    PublicBookingModule,
    ServicesModule,
    CalendarModule,
    TeamModule,
    JobsModule,
    ReportsModule,
    SettingsModule,
    ReviewRequestsModule,
    HealthModule,
    CircuitBreakerModule,
    ThrottleModule,
    CacheConfigModule,
    StorageModule,
    EventsModule,
    NotificationsModule,
    CustomerContextModule,
    OutboundCampaignsModule,
    PhotoQuotesModule,
    AiSchedulingModule,
    CustomerPortalModule,
    GatewaysModule,
    NpsModule,
    PredictiveMaintenanceModule,
    DynamicPricingModule,
    MessagingModule,
    PaymentReminderModule,
    NoshowPreventionModule,
    CustomerRetentionModule,
    AiCommunicationModule,
    AiCopilotModule,
    SpecialistAgentsModule,
    MarketingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
