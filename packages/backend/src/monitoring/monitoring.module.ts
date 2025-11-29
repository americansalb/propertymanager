import { Module, Global, type OnModuleInit } from '@nestjs/common';
import { initializeSentry } from './sentry.config';
import { MetricsService } from './metrics.service';
import { AlertsService } from './alerts.service';

@Global()
@Module({
  providers: [MetricsService, AlertsService],
  exports: [MetricsService, AlertsService],
})
export class MonitoringModule implements OnModuleInit {
  onModuleInit(): void {
    // Initialize Sentry on module init
    initializeSentry();
  }
}
