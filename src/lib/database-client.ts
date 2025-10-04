// TradeMaster Pro - Client-Side Database System
// Browser-compatible database using localStorage

import { Trade, Capital, EntryReason, EmotionalState, User, ApiResponse, CapitalSummary } from '@/types';
import { generateId } from '@/lib/utils';

// Generic database operations for browser
class LocalStorageDatabase<T extends { id: string }> {
  private key: string;

  constructor(entityName: string) {
    this.key = `trademaster_${entityName}`;
  }

  private readData(): T[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private writeData(data: T[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
    }
  }

  async findAll(): Promise<T[]> {
    return this.readData();
  }

  async findById(id: string): Promise<T | null> {
    const data = this.readData();
    return data.find(item => item.id === id) || null;
  }

  async create(item: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const data = this.readData();
    const newItem = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as T;
    
    data.push(newItem);
    this.writeData(data);
    return newItem;
  }

  async update(id: string, updates: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
    const data = this.readData();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    this.writeData(data);
    return data[index];
  }

  async delete(id: string): Promise<boolean> {
    const data = this.readData();
    const filteredData = data.filter(item => item.id !== id);
    
    if (filteredData.length === data.length) return false;
    
    this.writeData(filteredData);
    return true;
  }

  async findWhere(predicate: (item: T) => boolean): Promise<T[]> {
    const data = this.readData();
    return data.filter(predicate);
  }

  async count(): Promise<number> {
    const data = this.readData();
    return data.length;
  }
}

// Initialize database instances
export const tradesDb = new LocalStorageDatabase<Trade>('trades');
export const capitalDb = new LocalStorageDatabase<Capital>('capital');
export const entryReasonsDb = new LocalStorageDatabase<EntryReason>('entry_reasons');
export const emotionalStatesDb = new LocalStorageDatabase<EmotionalState>('emotional_states');
export const usersDb = new LocalStorageDatabase<User>('users');

// Database helper functions
export const initializeDatabase = async () => {
  // Initialize default entry reasons if none exist
  const entryReasons = await entryReasonsDb.findAll();
  if (entryReasons.length === 0) {
    const defaultReasons = [
      { name: 'פיבונאצ\'י', is_active: true },
      { name: 'פריצת התנגדות', is_active: true },
      { name: 'תמיכה חזקה', is_active: true },
      { name: 'נרות אוחז', is_active: true },
      { name: 'דגל', is_active: true },
      { name: 'דגלון', is_active: true },
      { name: 'משולש', is_active: true },
      { name: 'כפול תחתית', is_active: true },
      { name: 'כפול ראש', is_active: true },
    ];
    
    for (const reason of defaultReasons) {
      await entryReasonsDb.create(reason);
    }
  }

  // Initialize default emotional states if none exist
  const emotionalStates = await emotionalStatesDb.findAll();
  if (emotionalStates.length === 0) {
    const defaultStates = [
      { name: 'בטוח', is_active: true },
      { name: 'חמדן', is_active: true },
      { name: 'סבלני', is_active: true },
      { name: 'חרד', is_active: true },
      { name: 'מתרגש', is_active: true },
      { name: 'מאוכזב', is_active: true },
      { name: 'אופטימי', is_active: true },
      { name: 'פסימי', is_active: true },
      { name: 'רגוע', is_active: true },
      { name: 'מתח', is_active: true },
    ];
    
    for (const state of defaultStates) {
      await emotionalStatesDb.create(state);
    }
  }

  // Initialize default user if none exist
  const users = await usersDb.findAll();
  if (users.length === 0) {
    await usersDb.create({
      email: 'trader@trademaster.pro',
      full_name: 'סוחר מקצועי',
      role: 'trader',
      risk_per_trade_percent: 1.0,
      initial_capital_historical: 10000,
    });
  }

  // Note: We don't initialize demo data anymore - we preserve existing user data
  // Only initialize default entry reasons and emotional states if none exist
};

// Trade-specific database operations
export const tradeDatabase = {
  async findAll(): Promise<Trade[]> {
    return tradesDb.findAll();
  },

  async getOpenTrades(): Promise<Trade[]> {
    return tradesDb.findWhere(trade => !trade.exit_price);
  },

  async getClosedTrades(): Promise<Trade[]> {
    return tradesDb.findWhere(trade => !!trade.exit_price);
  },

  async getTradesBySymbol(symbol: string): Promise<Trade[]> {
    return tradesDb.findWhere(trade => trade.symbol === symbol);
  },

  async getTradesByDateRange(startDate: string, endDate: string): Promise<Trade[]> {
    return tradesDb.findWhere(trade => {
      const tradeDate = new Date(trade.datetime);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return tradeDate >= start && tradeDate <= end;
    });
  },

  async getWinningTrades(): Promise<Trade[]> {
    return tradesDb.findWhere(trade => 
      trade.result_dollars !== undefined && trade.result_dollars > 0
    );
  },

  async getLosingTrades(): Promise<Trade[]> {
    return tradesDb.findWhere(trade => 
      trade.result_dollars !== undefined && trade.result_dollars < 0
    );
  },
};

// Capital-specific database operations
export const capitalDatabase = {
  async getLastReconciliation(): Promise<Capital | null> {
    const reconciliations = await capitalDb.findWhere(capital => 
      capital.type === 'Reconciliation'
    );
    
    if (reconciliations.length === 0) return null;
    
    return reconciliations.sort((a, b) => 
      new Date(b.actual_datetime).getTime() - new Date(a.actual_datetime).getTime()
    )[0];
  },

  async getCapitalHistory(): Promise<Capital[]> {
    const allCapital = await capitalDb.findAll();
    return allCapital.sort((a, b) => 
      new Date(a.actual_datetime).getTime() - new Date(b.actual_datetime).getTime()
    );
  },

  async getBaseCapital(): Promise<number> {
    const lastReconciliation = await this.getLastReconciliation();
    if (!lastReconciliation) return 0;
    
    return lastReconciliation.amount;
  },

  async getCapitalSummary(): Promise<CapitalSummary> {
    const allCapital = await capitalDb.findAll();
    const lastReconciliation = await this.getLastReconciliation();
    
    const baseCapital = lastReconciliation ? lastReconciliation.amount : 0;
    
    // Calculate realized P&L from trades
    const trades = await tradeDatabase.findAll();
    const closedTrades = trades.filter(trade => trade.exit_price);
    
    let realizedPnl = 0;
    if (closedTrades.length > 0) {
      // Filter trades based on last reconciliation date
      const reconciliationDate = lastReconciliation 
        ? new Date(lastReconciliation.actual_datetime) 
        : new Date(0);
      
      const tradesAfterReconciliation = closedTrades.filter(trade => 
        new Date(trade.datetime) > reconciliationDate
      );
      
      realizedPnl = tradesAfterReconciliation.reduce((sum, trade) => 
        sum + (trade.result_dollars || 0), 0
      );
    }
    
    // Calculate unrealized P&L from open trades
    const openTrades = trades.filter(trade => !trade.exit_price);
    let unrealizedPnl = 0;
    
    if (openTrades.length > 0) {
      // Calculate unrealized P&L based on current prices or entry prices
      unrealizedPnl = openTrades.reduce((sum, trade) => {
        const currentPrice = trade.current_price || trade.entry_price;
        const profitLoss = trade.direction === 'Long' 
          ? (currentPrice - trade.entry_price) * trade.position_size
          : (trade.entry_price - currentPrice) * trade.position_size;
        return sum + profitLoss;
      }, 0);
    }
    
    const totalEquity = baseCapital + realizedPnl + unrealizedPnl;
    
    // Optimized logging for performance
    if (process.env.NODE_ENV === 'development') {
      console.log('💰 Capital Summary Calculation:');
      console.log('Base Capital:', baseCapital);
      console.log('Realized P&L:', realizedPnl);
      console.log('Unrealized P&L:', unrealizedPnl);
      console.log('Total Equity:', totalEquity);
    }
    
    return {
      base_capital: baseCapital,
      realized_pnl: realizedPnl,
      unrealized_pnl: unrealizedPnl,
      total_equity: totalEquity,
      last_reconciliation_date: lastReconciliation?.actual_datetime
    };
  },

  // Import/Export functions for sync
  async exportData(): Promise<Capital[]> {
    return capitalDb.findAll();
  },

  async importData(data: Capital[]): Promise<void> {
    // Clear existing data
    const allItems = await capitalDb.findAll();
    for (const item of allItems) {
      await capitalDb.delete(item.id);
    }
    
    // Import new data
    for (const item of data) {
      await capitalDb.create(item);
    }
  },

  async clearAll(): Promise<void> {
    const allItems = await capitalDb.findAll();
    for (const item of allItems) {
      await capitalDb.delete(item.id);
    }
  },
};

// Utility functions for calculations
export const calculateTradeMetrics = {
  calculatePositionSize(
    entryPrice: number,
    stopLoss: number,
    riskPercent: number,
    totalEquity: number
  ): number {
    const riskAmount = totalEquity * (riskPercent / 100);
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    return Math.floor(riskAmount / riskPerShare);
  },

  calculateRUnits(
    entryPrice: number,
    exitPrice: number,
    direction: 'Long' | 'Short',
    stopLoss: number
  ): number {
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    if (riskPerShare === 0) return 0;
    
    const profitLoss = direction === 'Long' 
      ? exitPrice - entryPrice 
      : entryPrice - exitPrice;
    
    return profitLoss / riskPerShare;
  },

  calculateProfitLoss(
    entryPrice: number,
    exitPrice: number,
    direction: 'Long' | 'Short',
    positionSize: number
  ): number {
    const priceDiff = direction === 'Long' 
      ? exitPrice - entryPrice 
      : entryPrice - exitPrice;
    
    return priceDiff * positionSize;
  },

  calculatePercentage(
    entryPrice: number,
    exitPrice: number,
    direction: 'Long' | 'Short'
  ): number {
    const priceDiff = direction === 'Long' 
      ? exitPrice - entryPrice 
      : entryPrice - exitPrice;
    
    return (priceDiff / entryPrice) * 100;
  },

  // Import/Export functions for sync
  async exportData(): Promise<Trade[]> {
    return tradeDatabase.findAll();
  },

  async importData(data: Trade[]): Promise<void> {
    // Clear existing data
    const allItems = await tradeDatabase.findAll();
    for (const item of allItems) {
      await tradesDb.delete(item.id);
    }
    
    // Import new data
    for (const item of data) {
      await tradesDb.create(item);
    }
  },

  async clearAll(): Promise<void> {
    const allItems = await tradeDatabase.findAll();
    for (const item of allItems) {
      await tradesDb.delete(item.id);
    }
  },

  // Remove duplicate trades based on multiple criteria
  async removeDuplicates(): Promise<number> {
    const allTrades = await tradeDatabase.findAll();
    const uniqueTrades = new Map<string, Trade>();
    let duplicatesRemoved = 0;

    console.log(`🔍 Checking ${allTrades.length} trades for duplicates...`);

    for (const trade of allTrades) {
      // Create multiple unique keys to catch different types of duplicates
      const keys = [
        `${trade.symbol}-${trade.datetime}-${trade.entry_price}`, // Same trade
        `${trade.symbol}-${trade.datetime}`, // Same symbol and time
        `${trade.id}`, // Same ID (should not happen but might)
      ];
      
      let isDuplicate = false;
      let duplicateKey = '';
      
      // Check if any key already exists
      for (const key of keys) {
        if (uniqueTrades.has(key)) {
          isDuplicate = true;
          duplicateKey = key;
          break;
        }
      }
      
      if (isDuplicate) {
        // This is a duplicate - keep the one with the latest updated_at
        const existingTrade = uniqueTrades.get(duplicateKey)!;
        const existingUpdated = new Date(existingTrade.updated_at || existingTrade.created_at);
        const currentUpdated = new Date(trade.updated_at || trade.created_at);
        
        if (currentUpdated > existingUpdated) {
          // Current trade is newer - remove the old one and keep current
          console.log(`🔄 Replacing duplicate trade: ${existingTrade.symbol} (${existingTrade.id}) with newer version (${trade.id})`);
          await tradesDb.delete(existingTrade.id);
          // Update the map with the new trade
          for (const key of keys) {
            uniqueTrades.delete(key);
            uniqueTrades.set(key, trade);
          }
          duplicatesRemoved++;
        } else {
          // Existing trade is newer - remove current one
          console.log(`🗑️ Removing older duplicate trade: ${trade.symbol} (${trade.id})`);
          await tradesDb.delete(trade.id);
          duplicatesRemoved++;
        }
      } else {
        // First occurrence - keep it and add all keys
        for (const key of keys) {
          uniqueTrades.set(key, trade);
        }
      }
    }

    console.log(`🧹 Removed ${duplicatesRemoved} duplicate trades`);
    return duplicatesRemoved;
  },

  // Force clean sync - clear all data and reimport from cloud
  async forceCleanSync(): Promise<{ tradesImported: number, capitalImported: number }> {
    console.log('🧹 Starting force clean sync...');
    
    // Clear all existing data
    const allTrades = await tradeDatabase.findAll();
    const allCapital = await capitalDatabase.getCapitalHistory();
    
    console.log(`🗑️ Clearing ${allTrades.length} trades and ${allCapital.length} capital records...`);
    
    // Clear trades
    for (const trade of allTrades) {
      await tradesDb.delete(trade.id);
    }
    
    // Clear capital
    for (const capital of allCapital) {
      await capitalDb.delete(capital.id);
    }
    
    console.log('✅ Local data cleared, ready for clean import');
    
    return { tradesImported: 0, capitalImported: 0 };
  },
};

// Re-export marketDataUtils from finnhub
export { marketDataUtils } from './finnhub';

const databaseClient = {
  tradesDb,
  capitalDb,
  entryReasonsDb,
  emotionalStatesDb,
  usersDb,
  tradeDatabase,
  capitalDatabase,
  calculateTradeMetrics,
  initializeDatabase,
};

export default databaseClient;
