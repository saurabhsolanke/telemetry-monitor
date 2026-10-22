import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(true);

  constructor() {
    const saved = localStorage.getItem('tm-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved !== null ? saved === 'dark' : prefersDark;
    this.isDark.set(initialDark);

    this.applyTheme(initialDark);

    effect(() => {
      const dark = this.isDark();
      this.applyTheme(dark);
      localStorage.setItem('tm-theme', dark ? 'dark' : 'light');
    });
  }

  toggleTheme(): void {
    this.isDark.update(val => !val);
  }

  private applyTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }
}

// Alias for backwards compatibility
export { ThemeService as Theme };
