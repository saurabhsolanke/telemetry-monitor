import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from './core/services/telemetry.service';
import { ThemeService } from './core/services/theme.service';
import { ExportService } from './core/services/export.service';
import { ParameterCardComponent } from './components/parameter-card/parameter-card';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ParameterCardComponent],
  templateUrl: './app.html'
})
export class AppComponent {
  protected telemetry = inject(TelemetryService);
  protected theme = inject(ThemeService);
  private exporter = inject(ExportService);

  exportTelemetry(format: 'csv' | 'xlsx'): void {
    const data = this.telemetry.telemetryData();
    if (!data) return;

    this.exporter.exportData(
      format,
      data.velocity.history,
      data.pressure.history,
      data.temperature.history,
      {
        v: data.velocity.unit,
        p: data.pressure.unit,
        t: data.temperature.unit
      }
    );
  }
}