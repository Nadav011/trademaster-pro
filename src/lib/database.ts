// TradeMaster Pro - JSON Database System
// Simple file-based database for storing entities

import fs from 'fs/promises';
import path from 'path';
import { Trade, Capital, EntryReason, EmotionalState, User, ApiResponse } from '@/types';
import { generateId } from '@/lib/utils';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
const ensureDataDir = async () => {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
};

// Generic database operations
class JsonDatabase<T extends { id: string }> {
  private filename: string;

  constructor(entityName: string) {
    this.filename = path.join(DATA_DIR, `${entityName}.json`);
  }

  private async readData(): Promise<T[]> {
    try {
      await ensureDataDir();
      const data = await fs.readFile(this.filename, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async writeData(data: T[]): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(this.filename, JSON.stringify(data, null, 2));
  }

  async findAll(): Promise<T[]> {
    return this.readData();
  }

  async findById(id: string): Promise<T | null> {
    const data = await this.readData();
    return data.find(item => item.id === id) || null;
  }

  async create(item: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const data = await this.readData();
    const newItem = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as T;
    
    data.push(newItem);
    await this.writeData(data);
    return newItem;
  }

  async update(id: string, updates: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
    const data = await this.readData();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    await this.writeData(data);
    return data[index];
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.readData();
    const filteredData = data.filter(item => item.id !== id);
    
    if (filteredData.length === data.length) return false;
    
    await this.writeData(filteredData);
    return true;
  }

  async findWhere(predicate: (item: T) => boolean): Promise<T[]> {
    const data = await this.readData();
    return data.filter(predicate);
  }

  async count(): Promise<number> {
    const data = await this.readData();
    return data.length;
  }
}

// Initialize database instances
export const tradesDb = new JsonDatabase<Trade>('trades');
export const capitalDb = new JsonDatabase<Capital>('capital');
export const entryReasonsDb = new JsonDatabase<EntryReason>('entry_reasons');
export const emotionalStatesDb = new JsonDatabase<EmotionalState>('emotional_states');
export const usersDb = new JsonDatabase<User>('users');

// Database helper functions
export const initializeDatabase = async () => {
  await ensureDataDir();
  
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
};

// Trade-specific database operations
export const tradeDatabase = {
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
};

export default {
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
