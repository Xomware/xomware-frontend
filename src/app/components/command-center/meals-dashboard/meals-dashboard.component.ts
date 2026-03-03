import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import {
  MealsDashboardService,
  MealsDashboardData,
  MealsLambdaInfo,
} from '../../../services/meals-dashboard.service';

@Component({
  selector: 'app-meals-dashboard',
  templateUrl: './meals-dashboard.component.html',
  styleUrls: ['./meals-dashboard.component.scss'],
})
export class MealsDashboardComponent implements OnInit {
  @Output() back = new EventEmitter<void>();

  data: MealsDashboardData | null = null;
  loading = false;
  error = '';
  showLogs = false;

  constructor(private mealsService: MealsDashboardService) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.data = await this.mealsService.getMealsDashboard();
    } catch (e: any) {
      this.error = e.message || 'Failed to load meals dashboard';
    } finally {
      this.loading = false;
    }
  }

  get healthyLambdas(): number {
    if (!this.data) return 0;
    return this.data.lambdas.filter(l => l.status === 'Active').length;
  }

  get totalLambdas(): number {
    return this.data?.lambdas.length || 0;
  }

  get tablesHealthy(): boolean {
    if (!this.data) return false;
    return this.data.dynamodb.tables.every(t => t.status === 'ACTIVE');
  }

  get apiHealthy(): boolean {
    return !!this.data?.apiGateway?.id;
  }

  get overallStatus(): 'healthy' | 'degraded' | 'error' {
    if (!this.data) return 'error';
    if (this.tablesHealthy && this.healthyLambdas === this.totalLambdas && this.apiHealthy) {
      return 'healthy';
    }
    if (this.healthyLambdas > 0 || this.tablesHealthy) return 'degraded';
    return 'error';
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  shortName(name: string): string {
    return name.replace('meals-meals-', '').replace('meals-', '');
  }

  getStatusClass(fn: MealsLambdaInfo): string {
    if (fn.status === 'Active') return 'status-ok';
    if (fn.status === 'NOT_FOUND') return 'status-missing';
    return 'status-error';
  }

  getStatusIcon(fn: MealsLambdaInfo): string {
    if (fn.status === 'Active') return '✅';
    if (fn.status === 'NOT_FOUND') return '❌';
    return '⚠️';
  }
}
