/**
 * Market Domain Types
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

export interface TimeseriesPoint {
  timestamp: string
  price: number
}

export interface MarketSummary {
  dayAheadPrice: number
  realTimePrice: number
  spread: number
  isInitialized: boolean
  referenceDate?: string
}

export interface MarketTimeseries {
  dayAhead: TimeseriesPoint[]
  realTime: TimeseriesPoint[]
  referenceDate: string
  simulationMode: boolean
  currentSimulationTime: string
}
