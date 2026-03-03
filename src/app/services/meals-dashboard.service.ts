import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface MealsTableInfo {
  name: string;
  status: string;
  itemCount?: number;
  sizeBytes?: number;
  readCapacity?: number;
  writeCapacity?: number;
  billingMode?: string;
  error?: string;
}

export interface MealsLambdaInfo {
  name: string;
  status: string;
  runtime?: string;
  memoryMB?: number;
  timeout?: number;
  lastModified?: string;
  codeSize?: number;
  invocations24h?: number;
  errors24h?: number;
  avgDurationMs?: number;
  error?: string;
}

export interface MealsApiGatewayInfo {
  id?: string;
  name?: string;
  createdDate?: string;
  endpoint?: string;
  error?: string;
}

export interface MealsLogEntry {
  timestamp?: string;
  message?: string;
  error?: string;
}

export interface MealsDashboardData {
  timestamp: string;
  dynamodb: { tables: MealsTableInfo[] };
  lambdas: MealsLambdaInfo[];
  apiGateway: MealsApiGatewayInfo | null;
  logs: MealsLogEntry[];
  stats: {
    totalMeals: number;
    totalRatings: number;
    recentRatings: any[];
  };
}

@Injectable({ providedIn: 'root' })
export class MealsDashboardService {
  private readonly baseUrl = environment.apiBaseUrl + '/infra';

  constructor(private auth: AuthService) {}

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Auth-Hash': this.auth.getPassphraseHash(),
    };
  }

  async getMealsDashboard(): Promise<MealsDashboardData> {
    const res = await fetch(`${this.baseUrl}/meals`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Failed to load meals dashboard: ${res.status}`);
    return res.json();
  }
}
