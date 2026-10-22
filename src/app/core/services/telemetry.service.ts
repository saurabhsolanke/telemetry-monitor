import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timer, switchMap, catchError, of, tap } from 'rxjs';
import { TelemetryResponse } from '../models/telemetry.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  readonly apiUrl = environment.apiUrl;

  readonly telemetryData = signal<TelemetryResponse | null>(null);
  readonly connectionStatus = signal<'Connected' | 'Disconnected' | 'Connecting'>('Connecting');
  readonly lastSuccessfulUpdate = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly latencyMs = signal<number>(0);
  readonly packetsReceived = signal<number>(0);

  constructor(private http: HttpClient) {
    this.startPolling();
  }

  private startPolling(): void {
    let reqStart = 0;

    timer(0, environment.pollingIntervalMs || 1000)
      .pipe(
        switchMap(() => {
          reqStart = performance.now();
          return this.http.get<TelemetryResponse>(this.apiUrl).pipe(
            catchError((err) => {
              this.connectionStatus.set('Disconnected');
              this.errorMessage.set('Connection to embedded controller lost. Retrying...');
              this.isLoading.set(false);
              this.latencyMs.set(0);
              return of(null);
            })
          );
        }),
        tap((data) => {
          if (data) {
            const latency = Math.round(performance.now() - reqStart);
            this.latencyMs.set(latency);
            this.telemetryData.set(data);
            this.connectionStatus.set('Connected');
            this.lastSuccessfulUpdate.set(new Date().toLocaleTimeString());
            this.errorMessage.set(null);
            this.isLoading.set(false);
            this.packetsReceived.update((p) => p + 1);
          }
        })
      )
      .subscribe();
  }
}