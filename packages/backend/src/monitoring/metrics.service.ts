import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Simple metrics tracking service
 * For production, consider integrating with Prometheus/Grafana or DataDog
 */
@Injectable()
export class MetricsService {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set a gauge metric (point-in-time value)
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record a histogram value (for timing, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);

    // Keep last 1000 values
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(key, values);
  }

  /**
   * Track API request timing
   */
  trackRequestDuration(
    path: string,
    method: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.recordHistogram('http_request_duration_ms', durationMs, {
      path: this.normalizePath(path),
      method,
      status: String(statusCode),
    });

    this.incrementCounter('http_requests_total', 1, {
      path: this.normalizePath(path),
      method,
      status: String(statusCode),
    });
  }

  /**
   * Track database query timing
   */
  trackDbQueryDuration(operation: string, model: string, durationMs: number): void {
    this.recordHistogram('db_query_duration_ms', durationMs, {
      operation,
      model,
    });
  }

  /**
   * Track email sending
   */
  trackEmailSent(success: boolean, type: string): void {
    this.incrementCounter('emails_sent_total', 1, {
      success: String(success),
      type,
    });
  }

  /**
   * Track payment processing
   */
  trackPayment(success: boolean, method: string, amount: number): void {
    this.incrementCounter('payments_processed_total', 1, {
      success: String(success),
      method,
    });

    if (success) {
      this.incrementCounter('payments_amount_total', amount, {
        method,
      });
    }
  }

  /**
   * Track active users
   */
  trackActiveUsers(count: number): void {
    this.setGauge('active_users', count);
  }

  /**
   * Get all current metrics
   */
  getMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, { count: number; avg: number; p50: number; p95: number; p99: number }>;
  } {
    const histogramStats: Record<
      string,
      { count: number; avg: number; p50: number; p95: number; p99: number }
    > = {};

    this.histograms.forEach((values, key) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        histogramStats[key] = {
          count: sorted.length,
          avg: sum / sorted.length,
          p50: this.percentile(sorted, 0.5),
          p95: this.percentile(sorted, 0.95),
          p99: this.percentile(sorted, 0.99),
        };
      }
    });

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusFormat(): string {
    const lines: string[] = [];

    // Export counters
    this.counters.forEach((value, key) => {
      lines.push(`${key} ${value}`);
    });

    // Export gauges
    this.gauges.forEach((value, key) => {
      lines.push(`${key} ${value}`);
    });

    // Export histogram summaries
    this.histograms.forEach((values, key) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        lines.push(`${key}_count ${sorted.length}`);
        lines.push(`${key}_sum ${sum}`);
        lines.push(`${key}{quantile="0.5"} ${this.percentile(sorted, 0.5)}`);
        lines.push(`${key}{quantile="0.95"} ${this.percentile(sorted, 0.95)}`);
        lines.push(`${key}{quantile="0.99"} ${this.percentile(sorted, 0.99)}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelPairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `${name}{${labelPairs}}`;
  }

  private normalizePath(path: string): string {
    // Replace UUIDs and numeric IDs with placeholders
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }

  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil(p * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }
}
