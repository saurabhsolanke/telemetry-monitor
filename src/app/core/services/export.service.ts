import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { HistoryPoint } from '../models/telemetry.model';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      saveFile: (options: {
        defaultFilename: string;
        content: string;
        format: 'csv' | 'xlsx';
        isBase64: boolean;
      }) => Promise<{ success?: boolean; canceled?: boolean; filePath?: string; error?: string }>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  async exportData(
    format: 'csv' | 'xlsx',
    velocityHistory: HistoryPoint[],
    pressureHistory: HistoryPoint[],
    temperatureHistory: HistoryPoint[],
    units: { v: string; p: string; t: string }
  ): Promise<void> {
    const rows = velocityHistory.map((v, i) => ({
      Timestamp: v.time,
      [`Velocity (${units.v})`]: v.value,
      [`Pressure (${units.p})`]: pressureHistory[i]?.value ?? '',
      [`Temperature (${units.t})`]: temperatureHistory[i]?.value ?? ''
    }));

    const filename = `telemetry_${new Date().toISOString().replace(/[:.]/g, '-')}`;

    // 1. If running inside Electron desktop app -> use native save dialog & filesystem
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Telemetry_Log');
        const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        await window.electronAPI.saveFile({
          defaultFilename: `${filename}.xlsx`,
          content: base64Data,
          format: 'xlsx',
          isBase64: true
        });
      } else {
        const headers = Object.keys(rows[0] || {}).join(',');
        const csvContent = [
          headers,
          ...rows.map((r) => Object.values(r).map((val) => `"${val}"`).join(','))
        ].join('\r\n');

        await window.electronAPI.saveFile({
          defaultFilename: `${filename}.csv`,
          content: csvContent,
          format: 'csv',
          isBase64: false
        });
      }
      return;
    }

    // 2. Browser fallback (Blob download / XLSX.writeFile)
    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Telemetry_Log');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } else {
      const headers = Object.keys(rows[0] || {}).join(',');
      const csvContent = [
        headers,
        ...rows.map((r) => Object.values(r).map((val) => `"${val}"`).join(','))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}