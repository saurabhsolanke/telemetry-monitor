export type VelocityUnit = 'mm/s' | 'cm/s' | 'm/s' | 'km/h' | 'ft/s';
export type PressureUnit = 'Pa' | 'kPa' | 'mbar' | 'bar' | 'psi' | 'atm';
export type TemperatureUnit = '°C' | '°F' | 'K';

export type ParameterStatus = 'Normal' | 'Warning' | 'Critical';

export interface HistoryPoint {
  time: string;
  value: number;
}

export interface ParameterData {
  value: number;
  unit: string;
  history: HistoryPoint[];
}

export interface TelemetryResponse {
  timestamp: string;
  velocity: ParameterData;
  pressure: ParameterData;
  temperature: ParameterData;
}