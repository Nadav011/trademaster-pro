// TradeMaster Pro - Data Export/Import System
// Export and import data from localStorage

import { Trade, Capital, EntryReason, EmotionalState, User } from '@/types';

export interface ExportData {
  trades: Trade[];
  capital: Capital[];
  entryReasons: EntryReason[];
  emotionalStates: EmotionalState[];
  users: User[];
  exportDate: string;
  version: string;
}

export class DataManager {
  // Export all data to JSON
  static async exportData(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Export only available in browser');
    }

    const data: ExportData = {
      trades: JSON.parse(localStorage.getItem('trademaster_trades') || '[]'),
      capital: JSON.parse(localStorage.getItem('trademaster_capital') || '[]'),
      entryReasons: JSON.parse(localStorage.getItem('trademaster_entryReasons') || '[]'),
      emotionalStates: JSON.parse(localStorage.getItem('trademaster_emotionalStates') || '[]'),
      users: JSON.parse(localStorage.getItem('trademaster_users') || '[]'),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(data, null, 2);
  }

  // Import data from JSON
  static async importData(jsonData: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Import only available in browser');
    }

    try {
      const data: ExportData = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.trades || !data.capital || !data.entryReasons || !data.emotionalStates || !data.users) {
        throw new Error('Invalid data format');
      }

      // Import data to localStorage
      localStorage.setItem('trademaster_trades', JSON.stringify(data.trades));
      localStorage.setItem('trademaster_capital', JSON.stringify(data.capital));
      localStorage.setItem('trademaster_entryReasons', JSON.stringify(data.entryReasons));
      localStorage.setItem('trademaster_emotionalStates', JSON.stringify(data.emotionalStates));
      localStorage.setItem('trademaster_users', JSON.stringify(data.users));

      // Instead of a hard reload, notify other tabs and let the UI react
      try {
        const event = {
          type: 'DATA_SYNCED',
          timestamp: Date.now(),
          message: 'Data imported locally'
        }
        localStorage.setItem('trademaster_sync_event', JSON.stringify(event))
        setTimeout(() => {
          localStorage.removeItem('trademaster_sync_event')
        }, 1000)
      } catch {
        // no-op if localStorage fails
      }
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Download data as file
  static async downloadData(): Promise<void> {
    const data = await this.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `trademaster-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Clear only available in browser');
    }

    localStorage.removeItem('trademaster_trades');
    localStorage.removeItem('trademaster_capital');
    localStorage.removeItem('trademaster_entryReasons');
    localStorage.removeItem('trademaster_emotionalStates');
    localStorage.removeItem('trademaster_users');
  }

  // Get data statistics
  static getDataStats(): {
    trades: number;
    capital: number;
    entryReasons: number;
    emotionalStates: number;
    users: number;
  } {
    if (typeof window === 'undefined') {
      return { trades: 0, capital: 0, entryReasons: 0, emotionalStates: 0, users: 0 };
    }

    return {
      trades: JSON.parse(localStorage.getItem('trademaster_trades') || '[]').length,
      capital: JSON.parse(localStorage.getItem('trademaster_capital') || '[]').length,
      entryReasons: JSON.parse(localStorage.getItem('trademaster_entryReasons') || '[]').length,
      emotionalStates: JSON.parse(localStorage.getItem('trademaster_emotionalStates') || '[]').length,
      users: JSON.parse(localStorage.getItem('trademaster_users') || '[]').length,
    };
  }
}
