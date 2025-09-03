/**
 * P&L Service - Handles all P&L and trading performance API calls
 */

import type { Trade, PnLSummary } from '../types/pnl'

export class PnLService {
  private static readonly BASE_URL = '/api/market-data'

  /**
   * Fetch all trades with P&L data
   */
  static async fetchTrades(): Promise<Trade[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/trades`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return Array.isArray(data?.trades) ? data.trades : []
    } catch (error) {
      console.error('Failed to fetch trades:', error)
      throw error
    }
  }

  /**
   * Get total P&L from trades
   */
  static async getTotalPnL(): Promise<number> {
    try {
      const response = await fetch(`${this.BASE_URL}/trades`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return Number(data?.total_pnl || 0)
    } catch (error) {
      console.error('Failed to fetch total P&L:', error)
      throw error
    }
  }

  /**
   * Calculate P&L summary statistics
   */
  static calculatePnLSummary(trades: Trade[]): PnLSummary {
    if (trades.length === 0) {
      return {
        totalPnl: 0,
        totalTrades: 0,
        profitableTrades: 0,
        losingTrades: 0,
        averagePnl: 0,
        bestTrade: 0,
        worstTrade: 0
      }
    }

    const pnlValues = trades.map(trade => trade.pnl || 0)
    const totalPnl = pnlValues.reduce((sum, pnl) => sum + pnl, 0)
    const profitableTrades = pnlValues.filter(pnl => pnl > 0).length
    const losingTrades = pnlValues.filter(pnl => pnl < 0).length
    const averagePnl = totalPnl / trades.length
    const bestTrade = Math.max(...pnlValues)
    const worstTrade = Math.min(...pnlValues)

    return {
      totalPnl,
      totalTrades: trades.length,
      profitableTrades,
      losingTrades,
      averagePnl,
      bestTrade,
      worstTrade
    }
  }
}
