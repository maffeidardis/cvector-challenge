/**
 * Trading domain types for PJM Energy Trading Platform
 */

export type MarketType = 'REAL_TIME' | 'DAY_AHEAD'


export interface MarketData {
  id: string
  price: number
  volume?: number
  load?: number
  timestamp: string
  market: MarketType
  source: string
  location?: string
  energy?: number
  congestion?: number
  loss?: number
}

export interface PriceData {
  timestamp: string
  price: number
  volume?: number
  load?: number
}
