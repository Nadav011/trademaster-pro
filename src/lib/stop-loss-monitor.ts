// TradeMaster Pro - Stop Loss Monitor
// Monitors open trades and automatically closes them when they hit stop loss

import { tradesDb, marketDataUtils } from './database-client';
import { Trade, TradeWithCalculations } from '@/types';

interface StopLossAlert {
  tradeId: string;
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  currentPrice: number;
  direction: 'Long' | 'Short';
  positionSize: number;
  timestamp: string;
}

class StopLossMonitor {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private checkInterval = 30000; // 30 seconds
  private alerts: StopLossAlert[] = [];

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🛡️ Stop Loss Monitor started');
    
    // Check immediately
    await this.checkStopLosses();
    
    // Set up interval
    this.monitoringInterval = setInterval(async () => {
      await this.checkStopLosses();
    }, this.checkInterval);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Stop Loss Monitor stopped');
  }

  private async checkStopLosses(): Promise<void> {
    try {
      const openTrades = await tradesDb.findWhere(trade => !trade.exit_price);
      
      if (openTrades.length === 0) return;

      // Get current prices for all open trades
      const symbols = [...new Set(openTrades.map(trade => trade.symbol))];
      const marketData = await marketDataUtils.getCurrentPrices(symbols);

      for (const trade of openTrades) {
        const currentData = marketData[trade.symbol];
        if (!currentData) continue;

        const currentPrice = currentData.price;
        const shouldClose = this.shouldCloseTrade(trade, currentPrice);

        if (shouldClose) {
          await this.closeTradeAtStopLoss(trade, currentPrice);
        }
      }
    } catch (error) {
      console.error('Error checking stop losses:', error);
    }
  }

  private shouldCloseTrade(trade: Trade, currentPrice: number): boolean {
    const { entry_price, planned_stop_loss, direction } = trade;

    if (direction === 'Long') {
      // For long positions, close if price drops to or below stop loss
      return currentPrice <= planned_stop_loss;
    } else {
      // For short positions, close if price rises to or above stop loss
      return currentPrice >= planned_stop_loss;
    }
  }

  private async closeTradeAtStopLoss(trade: Trade, currentPrice: number): Promise<void> {
    try {
      console.log(`🚨 Stop Loss triggered for ${trade.symbol} at ${currentPrice}`);

      // Calculate results
      const profitLoss = trade.direction === 'Long' 
        ? (currentPrice - trade.entry_price) * trade.position_size
        : (trade.entry_price - currentPrice) * trade.position_size;

      const riskPerShare = Math.abs(trade.entry_price - trade.planned_stop_loss);
      const rUnits = riskPerShare > 0 ? profitLoss / (riskPerShare * trade.position_size) : 0;
      const percentage = ((currentPrice - trade.entry_price) / trade.entry_price) * 100;

      // Update trade with stop loss closure
      await tradesDb.update(trade.id, {
        exit_price: currentPrice,
        result_dollars: profitLoss,
        result_r_units: rUnits,
        result_percentage: percentage,
        emotional_state: 'סגירה אוטומטית',
        followed_plan: 'Yes',
        discipline_rating: 5, // Perfect discipline for following stop loss
        what_worked: 'עמדתי בתוכנית - סגירה אוטומטית בסטופ לוס',
        what_to_improve: 'שיפור במיקום הסטופ לוס',
        notes: `סגירה אוטומטית בסטופ לוס ב-${new Date().toLocaleString('he-IL')}`,
      });

      // Create alert
      const alert: StopLossAlert = {
        tradeId: trade.id,
        symbol: trade.symbol,
        entryPrice: trade.entry_price,
        stopLoss: trade.planned_stop_loss,
        currentPrice: currentPrice,
        direction: trade.direction,
        positionSize: trade.position_size,
        timestamp: new Date().toISOString(),
      };

      this.alerts.push(alert);

      // Show notification
      this.showStopLossNotification(alert);

      console.log(`✅ Trade ${trade.symbol} closed at stop loss: ${profitLoss.toFixed(2)} P&L`);
    } catch (error) {
      console.error('Error closing trade at stop loss:', error);
    }
  }

  private showStopLossNotification(alert: StopLossAlert): void {
    // Create browser notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('סטופ לוס הופעל!', {
        body: `${alert.symbol} נסגר אוטומטית בסטופ לוס`,
        icon: '/favicon.ico',
        tag: `stop-loss-${alert.tradeId}`,
      });
    }

    // Also show in console
    console.log(`🚨 STOP LOSS ALERT: ${alert.symbol} closed automatically`);
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  getAlerts(): StopLossAlert[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getMonitoringStatus(): boolean {
    return this.isMonitoring;
  }

  setCheckInterval(interval: number): void {
    this.checkInterval = interval;
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }
}

// Singleton instance
export const stopLossMonitor = new StopLossMonitor();

// Helper functions
export const stopLossUtils = {
  async startMonitoring(): Promise<void> {
    await stopLossMonitor.startMonitoring();
  },

  stopMonitoring(): void {
    stopLossMonitor.stopMonitoring();
  },

  async requestNotificationPermission(): Promise<boolean> {
    return stopLossMonitor.requestNotificationPermission();
  },

  getAlerts(): StopLossAlert[] {
    return stopLossMonitor.getAlerts();
  },

  clearAlerts(): void {
    stopLossMonitor.clearAlerts();
  },

  getMonitoringStatus(): boolean {
    return stopLossMonitor.getMonitoringStatus();
  },

  setCheckInterval(interval: number): void {
    stopLossMonitor.setCheckInterval(interval);
  },

  // Manual check function
  async checkStopLossesNow(): Promise<void> {
    await stopLossMonitor['checkStopLosses']();
  },
};

export default stopLossMonitor;
