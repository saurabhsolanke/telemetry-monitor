import { Injectable } from '@angular/core';
import { VelocityUnit, PressureUnit, TemperatureUnit } from '../models/telemetry.model';

@Injectable({ providedIn: 'root' })
export class UnitConverterService {
  // Base: cm/s
  convertVelocity(val: number, to: VelocityUnit): number {
    switch (to) {
      case 'mm/s': return val * 10;
      case 'cm/s': return val;
      case 'm/s': return val / 100;
      case 'km/h': return (val / 100) * 3.6;
      case 'ft/s': return val * 0.0328084;
    }
  }

  // Base: mbar
  convertPressure(val: number, to: PressureUnit): number {
    switch (to) {
      case 'Pa': return val * 100;
      case 'kPa': return val * 0.1;
      case 'mbar': return val;
      case 'bar': return val * 0.001;
      case 'psi': return val * 0.0145038;
      case 'atm': return val * 0.000986923;
    }
  }

  // Base: °C
  convertTemperature(val: number, to: TemperatureUnit): number {
    switch (to) {
      case '°C': return val;
      case '°F': return (val * 9 / 5) + 32;
      case 'K': return val + 273.15;
    }
  }

  round(value: number, decimals: number = 2): number {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
  }
}