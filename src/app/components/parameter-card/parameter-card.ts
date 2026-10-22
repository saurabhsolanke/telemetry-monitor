import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  signal,
  inject,
  OnInit,
  effect,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { GaugeChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import {
  ParameterData,
  ParameterStatus,
  VelocityUnit,
  PressureUnit,
  TemperatureUnit
} from '../../core/models/telemetry.model';
import { UnitConverterService } from '../../core/services/unit-converter.service';
import { ThemeService } from '../../core/services/theme.service';

echarts.use([
  GaugeChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer
]);

/**
 * Official Atlas Copco Brand Identity Color Palette
 * - Atlas Copco Blue: #0092BC (RGB: 0, 146, 188) — Hero attention & brand statement
 * - Gray:            #5B6770 (RGB: 91, 103, 112) — Contrast, axes, ticks, readable text
 * - Beige:           #F5F2EF (RGB: 245, 242, 239) — Clean backgrounds, slider track
 * - White:           #FFFFFF (RGB: 255, 255, 255) — Primary cards & tooltip surfaces
 */
export const ATLAS_BRAND = {
  blue: '#0092BC',
  gray: '#5B6770',
  beige: '#F5F2EF',
  white: '#FFFFFF',
  // Harmonized channel shades
  velocityBlue: '#0092BC',
  pressureBlue: '#007D9E',
  temperatureBlue: '#00A3D1',
  alertRed: '#B83232'
};

@Component({
  selector: 'app-parameter-card',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './parameter-card.html',
  host: {
    '[attr.title]': 'null'
  }
})
export class ParameterCardComponent implements OnInit, OnChanges {
  @Input() title!: string;
  @Input() cardTitle?: string;
  @Input({ required: true }) type!: 'velocity' | 'pressure' | 'temperature';
  @Input({ required: true }) rawData!: ParameterData;
  @Input() lastUpdated!: string | null;

  get displayTitle(): string {
    return this.cardTitle || this.title || '';
  }

  private converter = inject(UnitConverterService);
  protected themeService = inject(ThemeService);

  readonly availableUnits = computed(() => {
    switch (this.type) {
      case 'velocity':
        return ['mm/s', 'cm/s', 'm/s', 'km/h', 'ft/s'];
      case 'pressure':
        return ['Pa', 'kPa', 'mbar', 'bar', 'psi', 'atm'];
      case 'temperature':
        return ['°C', '°F', 'K'];
    }
  });

  selectedUnit = signal<string>('cm/s');
  convertedValue = signal<number>(0);
  status = signal<ParameterStatus>('Normal');
  deltaPercent = signal<number>(0);
  minValue = signal<number>(0);
  maxValue = signal<number>(0);
  avgValue = signal<number>(0);

  // Dialog state for maximized view
  isMaximized = signal<boolean>(false);

  gaugeOption: any = {};
  trendOption: any = {};
  maximizedTrendOption: any = {};

  constructor() {
    // Re-render charts when theme changes (light/dark)
    effect(() => {
      this.themeService.isDark();
      if (this.rawData) {
        this.recalculateAndPlot();
      }
    });
  }

  ngOnInit() {
    const units = this.availableUnits();
    if (this.type === 'velocity') this.selectedUnit.set('cm/s');
    else if (this.type === 'pressure') this.selectedUnit.set('mbar');
    else if (this.type === 'temperature') this.selectedUnit.set('°C');
    else this.selectedUnit.set(units[0]);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rawData'] && this.rawData) {
      this.recalculateAndPlot();
    }
  }

  onUnitChange(newUnit: string): void {
    this.selectedUnit.set(newUnit);
    this.recalculateAndPlot();
  }

  openMaximized(): void {
    this.isMaximized.set(true);
  }

  closeMaximized(): void {
    this.isMaximized.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMaximized()) {
      this.closeMaximized();
    }
  }

  private convert(val: number): number {
    const u = this.selectedUnit();
    if (this.type === 'velocity') return this.converter.convertVelocity(val, u as VelocityUnit);
    if (this.type === 'pressure') return this.converter.convertPressure(val, u as PressureUnit);
    return this.converter.convertTemperature(val, u as TemperatureUnit);
  }

  private evaluateStatus(baseVal: number): ParameterStatus {
    if (this.type === 'velocity') {
      if (baseVal > 220 || baseVal < 140) return 'Critical';
      if (baseVal > 200 || baseVal < 160) return 'Warning';
      return 'Normal';
    }
    if (this.type === 'pressure') {
      if (baseVal > 1100 || baseVal < 920) return 'Critical';
      if (baseVal > 1050 || baseVal < 970) return 'Warning';
      return 'Normal';
    }
    // temperature
    if (baseVal > 45 || baseVal < 25) return 'Critical';
    if (baseVal > 40 || baseVal < 30) return 'Warning';
    return 'Normal';
  }

  private recalculateAndPlot(): void {
    const currentConv = this.converter.round(this.convert(this.rawData.value));
    this.convertedValue.set(currentConv);
    this.status.set(this.evaluateStatus(this.rawData.value));

    const history = this.rawData.history || [];
    const convertedHistory = history.map((pt) => ({
      time: pt.time,
      value: this.converter.round(this.convert(pt.value))
    }));

    // Calculate delta from previous reading
    if (convertedHistory.length >= 2) {
      const prev = convertedHistory[convertedHistory.length - 2].value;
      const curr = currentConv;
      if (prev !== 0) {
        const delta = ((curr - prev) / prev) * 100;
        this.deltaPercent.set(this.converter.round(delta, 1));
      }
    }

    // Min, Max, Avg
    if (convertedHistory.length > 0) {
      const vals = convertedHistory.map((h) => h.value);
      this.minValue.set(this.converter.round(Math.min(...vals)));
      this.maxValue.set(this.converter.round(Math.max(...vals)));
      const sum = vals.reduce((a, b) => a + b, 0);
      this.avgValue.set(this.converter.round(sum / vals.length));
    }

    const isDark = this.themeService.isDark();

    // Atlas Copco Theme Tokens
    const textColor = isDark ? '#9EADB8' : ATLAS_BRAND.gray; // #5B6770
    const strongTextColor = isDark ? '#F8FAFC' : '#1D252C';
    const gridLineColor = isDark ? 'rgba(91, 103, 112, 0.35)' : 'rgba(91, 103, 112, 0.22)';
    const splitLineColor = isDark ? 'rgba(91, 103, 112, 0.20)' : 'rgba(91, 103, 112, 0.12)';

    // Channel Hero Waveform Accent Color (all rooted in Atlas Copco Blue #0092BC)
    let brandAccent = ATLAS_BRAND.blue; // #0092BC
    if (this.type === 'pressure') {
      brandAccent = ATLAS_BRAND.pressureBlue; // #007D9E
    } else if (this.type === 'temperature') {
      brandAccent = ATLAS_BRAND.temperatureBlue; // #00A3D1
    }

    const gradientStart = 'rgba(0, 146, 188, 0.35)';
    const gradientEnd = 'rgba(0, 146, 188, 0.00)';

    const vals = convertedHistory.map((h) => h.value);
    const minVal = vals.length ? Math.floor(Math.min(...vals) * 0.9) : 0;
    const maxVal = vals.length ? Math.ceil(Math.max(...vals) * 1.1) : 100;

    // 1. Atlas Copco Circular Gauge Configuration
    this.gaugeOption = {
      series: [
        {
          type: 'gauge',
          center: ['50%', '54%'],
          radius: '80%',
          startAngle: 205,
          endAngle: -25,
          min: minVal,
          max: maxVal,
          splitNumber: 4,
          axisLine: {
            lineStyle: {
              width: 8,
              color: [
                [0.72, ATLAS_BRAND.blue],       // #0092BC Atlas Copco Blue (Nominal)
                [0.88, ATLAS_BRAND.gray],       // #5B6770 Atlas Copco Gray (Elevated caution)
                [1.00, ATLAS_BRAND.alertRed]    // Out of spec threshold
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '55%',
            width: 5,
            offsetCenter: [0, '-4%'],
            itemStyle: {
              color: brandAccent
            }
          },
          axisTick: {
            distance: -10,
            length: 4,
            lineStyle: { color: isDark ? '#6E7D8A' : ATLAS_BRAND.gray, width: 1 }
          },
          splitLine: {
            distance: -12,
            length: 7,
            lineStyle: { color: isDark ? '#8A99A6' : ATLAS_BRAND.gray, width: 2 }
          },
          axisLabel: {
            color: textColor,
            distance: 12,
            fontSize: 9,
            fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Noto Sans', sans-serif"
          },
          detail: {
            valueAnimation: true,
            formatter: (v: number) => `${v.toFixed(1)}`,
            color: strongTextColor,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Noto Sans', sans-serif",
            offsetCenter: [0, '72%']
          },
          data: [{ value: currentConv }]
        }
      ]
    };

    // 2. Atlas Copco Trend Area Chart Configuration (Card View)
    this.trendOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(22, 28, 34, 0.96)' : 'rgba(255, 255, 255, 0.98)',
        borderColor: isDark ? 'rgba(91, 103, 112, 0.5)' : ATLAS_BRAND.gray,
        borderWidth: 1,
        textStyle: {
          color: strongTextColor,
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace'
        },
        padding: [8, 12],
        extraCssText: 'box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.18); border-radius: 8px; backdrop-filter: blur(8px);',
        formatter: (params: any) => {
          const pt = params[0];
          return `
            <div style="font-size: 11px; color: ${textColor}; margin-bottom: 2px;">TIME: ${pt.axisValue}</div>
            <div style="font-weight: 700; font-size: 13px; color: ${brandAccent};">
              ${pt.data} <span style="font-size: 11px; color: ${textColor}; font-weight: normal;">${this.selectedUnit()}</span>
            </div>
          `;
        }
      },
      grid: {
        left: 50,
        right: 14,
        top: 14,
        bottom: 38
      },
      xAxis: {
        type: 'category',
        data: convertedHistory.map((h) => h.time),
        axisLine: { lineStyle: { color: gridLineColor } },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Noto Sans', sans-serif",
          interval: (idx: number) => {
            const len = convertedHistory.length;
            return idx === 0 || idx === Math.floor(len / 2) || idx === len - 1;
          },
          hideOverlap: true
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Noto Sans', sans-serif",
          margin: 6,
          hideOverlap: true
        },
        splitLine: {
          lineStyle: {
            color: splitLineColor,
            type: 'dashed'
          }
        }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          show: true,
          bottom: 2,
          height: 8,
          borderColor: 'transparent',
          backgroundColor: isDark ? 'rgba(91, 103, 112, 0.22)' : ATLAS_BRAND.beige, // #F5F2EF
          fillerColor: 'rgba(0, 146, 188, 0.25)', // #0092BC
          handleSize: '100%',
          showDataShadow: false,
          showDetail: false
        }
      ],
      series: [
        {
          data: convertedHistory.map((h) => h.value),
          type: 'line',
          smooth: 0.35,
          showSymbol: false,
          lineStyle: { width: 2.2, color: brandAccent },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: gradientStart },
              { offset: 1, color: gradientEnd }
            ])
          }
        }
      ]
    };

    // 3. Maximized High-Resolution Waveform Dialog Configuration
    this.maximizedTrendOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(22, 28, 34, 0.96)' : 'rgba(255, 255, 255, 0.98)',
        borderColor: isDark ? 'rgba(91, 103, 112, 0.5)' : ATLAS_BRAND.gray,
        borderWidth: 1,
        textStyle: {
          color: strongTextColor,
          fontSize: 12,
          fontFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif"
        },
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25); border-radius: 8px; backdrop-filter: blur(8px);',
        formatter: (params: any) => {
          const pt = params[0];
          return `
            <div style="font-size: 11px; color: ${textColor}; font-weight: 600; margin-bottom: 4px;">TIMESTAMP: ${pt.axisValue}</div>
            <div style="font-weight: 700; font-size: 15px; color: ${brandAccent};">
              ${pt.data} <span style="font-size: 12px; color: ${textColor}; font-weight: normal;">${this.selectedUnit()}</span>
            </div>
          `;
        }
      },
      grid: {
        left: 65,
        right: 35,
        top: 35,
        bottom: 55
      },
      xAxis: {
        type: 'category',
        data: convertedHistory.map((h) => h.time),
        axisLine: { lineStyle: { color: gridLineColor } },
        axisTick: { show: true, lineStyle: { color: gridLineColor } },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Noto Sans', sans-serif",
          hideOverlap: true
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Noto Sans', sans-serif",
          margin: 8,
          formatter: (v: number) => v.toLocaleString()
        },
        splitLine: {
          lineStyle: {
            color: splitLineColor,
            type: 'dashed'
          }
        }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          show: true,
          bottom: 10,
          height: 20,
          borderColor: isDark ? 'rgba(91, 103, 112, 0.4)' : 'rgba(91, 103, 112, 0.25)',
          backgroundColor: isDark ? 'rgba(91, 103, 112, 0.25)' : ATLAS_BRAND.beige,
          fillerColor: 'rgba(0, 146, 188, 0.25)',
          handleSize: '100%',
          handleStyle: {
            color: ATLAS_BRAND.blue,
            borderColor: 'transparent'
          },
          textStyle: {
            color: textColor,
            fontSize: 10,
            fontFamily: "'Source Sans 3', sans-serif"
          },
          showDataShadow: true
        }
      ],
      animation: false,
      series: [
        {
          data: convertedHistory.map((h) => h.value),
          type: 'line',
          smooth: 0.35,
          showSymbol: false,
          lineStyle: { width: 3, color: brandAccent },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: gradientStart },
              { offset: 1, color: gradientEnd }
            ])
          }
        }
      ]
    };
  }
}