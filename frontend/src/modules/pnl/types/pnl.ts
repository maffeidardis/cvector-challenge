/**
 * P&L Domain Types
 */

export interface Trade {
  id: string
  bid_id: string
  executed_price: number
  quantity: number
  hour: number
  timestamp: string
  pnl?: number
  real_time_avg_price?: number
}

export interface PnLSummary {
  totalPnl: number
  totalTrades: number
  profitableTrades: number
  losingTrades: number
  averagePnl: number
  bestTrade: number
  worstTrade: number
}

export interface PortfolioSummary {
  totalOrders: number
  totalVolume: number
  averageBidPrice: number
  successRate: number
}
