/**
 * Market Data Hook - Manages market data state and operations
 */

import { useState, useCallback, useEffect } from 'react'
import type { MarketData, MarketSummary, MarketTimeseries } from '../types/market'
import { MarketService } from '../services/marketService'

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [marketSummary, setMarketSummary] = useState<MarketSummary>({
    dayAheadPrice: 0,
    realTimePrice: 0,
    spread: 0,
    isInitialized: false
  })
  const [timeseries, setTimeseries] = useState<MarketTimeseries>({
    dayAhead: [],
    realTime: [],
    referenceDate: '',
    simulationMode: false,
    currentSimulationTime: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Check simulation status
   */
  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      const isInitialized = await MarketService.checkSimulationStatus()
      setMarketSummary(prev => ({ ...prev, isInitialized }))
      return isInitialized
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check status'
      setError(errorMessage)
      return false
    }
  }, [])

  /**
   * Fetch market summary
   */
  const fetchMarketSummary = useCallback(async () => {
    try {
      const summary = await MarketService.fetchMarketSummary()
      setMarketSummary(summary)
      
      // Convert to MarketData format for backward compatibility
      const marketDataItems = MarketService.convertToMarketData({
        day_ahead: { price: summary.dayAheadPrice, timestamp: new Date().toISOString() },
        real_time: { price: summary.realTimePrice, timestamp: new Date().toISOString() }
      })
      setMarketData(marketDataItems)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market summary'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Fetch timeseries data
   */
  const fetchTimeseries = useCallback(async () => {
    try {
      const timeseriesData = await MarketService.fetchMarketTimeseries()
      setTimeseries(timeseriesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch timeseries'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Initialize market simulation
   */
  const initializeSimulation = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      await MarketService.initializeSimulation()
      
      // Fetch initial data after initialization
      await Promise.all([
        fetchMarketSummary(),
        fetchTimeseries()
      ])
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize simulation'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [fetchMarketSummary, fetchTimeseries])

  /**
   * Refresh all market data
   */
  const refreshMarketData = useCallback(async () => {
    try {
      await Promise.all([
        fetchMarketSummary(),
        fetchTimeseries()
      ])
    } catch (err) {
      console.error('Failed to refresh market data:', err)
    }
  }, [fetchMarketSummary, fetchTimeseries])

  /**
   * Initialize on mount (only once)
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        const isInitialized = await checkStatus()
        
        if (isInitialized) {
          await Promise.all([
            fetchMarketSummary(),
            fetchTimeseries()
          ])
        }
      } catch (err) {
        console.error('Failed to initialize market data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, []) // Empty dependency array - run only once on mount

  return {
    marketData,
    marketSummary,
    timeseries,
    isLoading,
    error,
    initializeSimulation,
    refreshMarketData,
    checkStatus
  }
}
