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
  const [phase, setPhase] = useState<'BIDDING' | 'TRADING'>('BIDDING')
  const [canPlaceBids, setCanPlaceBids] = useState<boolean>(true)
  const [secondsToCutoff, setSecondsToCutoff] = useState<number>(0)
  const [biddingDate, setBiddingDate] = useState<string>('')
  const [deliveryDate, setDeliveryDate] = useState<string>('')

  /**
   * Check simulation status and return current simulated time
   */
  const checkStatus = useCallback(async (): Promise<{isInitialized: boolean, simulatedTime?: string}> => {
    try {
      setError(null)
      const status = await MarketService.getSimulationStatus()
      setPhase(status.phase)
      setCanPlaceBids(status.can_place_bids)
      setSecondsToCutoff(status.seconds_to_cutoff)
      setBiddingDate(status.bidding_date || '')
      setDeliveryDate(status.delivery_date || '')
      setMarketSummary(prev => ({ ...prev, isInitialized: status.data_initialized }))
      return {
        isInitialized: status.data_initialized,
        simulatedTime: status.simulated_time
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check status'
      setError(errorMessage)
      return { isInitialized: false }
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
      console.log('DEBUG: Fetching timeseries data...')
      const timeseriesData = await MarketService.fetchMarketTimeseries()
      console.log('DEBUG: Received timeseries data:', {
        referenceDate: timeseriesData.referenceDate,
        dayAheadPoints: timeseriesData.dayAhead.length,
        realTimePoints: timeseriesData.realTime.length,
        firstDAPoint: timeseriesData.dayAhead[0]?.timestamp,
        firstRTPoint: timeseriesData.realTime[0]?.timestamp
      })
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
  const initializeSimulation = useCallback(async (): Promise<{success: boolean, simulatedTime?: string}> => {
    try {
      setIsLoading(true)
      setError(null)
      
      await MarketService.initializeSimulation()
      
      // Fetch initial data after initialization directly
      const [summary, timeseriesData] = await Promise.all([
        MarketService.fetchMarketSummary(),
        MarketService.fetchMarketTimeseries()
      ])
      
      setMarketSummary(summary)
      setTimeseries(timeseriesData)
      
      // Convert to MarketData format for backward compatibility
      const marketDataItems = MarketService.convertToMarketData({
        day_ahead: { price: summary.dayAheadPrice, timestamp: new Date().toISOString() },
        real_time: { price: summary.realTimePrice, timestamp: new Date().toISOString() }
      })
      setMarketData(marketDataItems)
      
      // Get updated status with simulated time
      const status = await MarketService.getSimulationStatus()
      setPhase(status.phase)
      setCanPlaceBids(status.can_place_bids)
      setSecondsToCutoff(status.seconds_to_cutoff)
      setBiddingDate(status.bidding_date || '')
      setDeliveryDate(status.delivery_date || '')
      setMarketSummary(prev => ({ ...prev, isInitialized: status.data_initialized }))
      
      return {
        success: true,
        simulatedTime: status.simulated_time
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize simulation'
      setError(errorMessage)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, []) // No dependencies - use MarketService directly

  /**
   * Advance to D0 and refresh everything
   */
  const advanceToD0 = useCallback(async (): Promise<string | undefined> => {
    try {
      console.log('Advancing to D0...')
      await MarketService.advanceSimulation()
      console.log('Advance successful, refreshing data...')
      const statusResult = await checkStatus()
      await Promise.all([
        fetchMarketSummary(),
        fetchTimeseries()
      ])
      console.log('D0 advance complete!')
      return statusResult.simulatedTime
    } catch (error) {
      console.error('Error advancing to D0:', error)
      setError(error instanceof Error ? error.message : 'Failed to advance to D0')
      return undefined
    }
  }, [checkStatus, fetchMarketSummary, fetchTimeseries])

  /**
   * Go back to D-1 bidding phase and refresh everything
   */
  const backToD1 = useCallback(async (): Promise<string | undefined> => {
    try {
      console.log('Going back to D-1...')
      await MarketService.backToBiddingDay()
      console.log('Back to D-1 successful, refreshing data...')
      const statusResult = await checkStatus()
      await Promise.all([
        fetchMarketSummary(),
        fetchTimeseries()
      ])
      console.log('Back to D-1 complete!')
      return statusResult.simulatedTime
    } catch (error) {
      console.error('Error going back to D-1:', error)
      setError(error instanceof Error ? error.message : 'Failed to go back to D-1')
      return undefined
    }
  }, [checkStatus, fetchMarketSummary, fetchTimeseries])

  /**
   * Set simulated UTC time and refresh status/timeseries (for UX/testing)
   */
  const setSimulatedTime = useCallback(async (hour: number, minute: number = 0): Promise<void> => {
    await MarketService.setSimulatedTime(hour, minute)
    await checkStatus()
    await fetchTimeseries()
  }, [checkStatus, fetchTimeseries])

  /**
   * Refresh all market data - simplified to avoid dependency changes
   */
  const refreshMarketData = useCallback(async () => {
    try {
      const [summary, timeseriesData] = await Promise.all([
        MarketService.fetchMarketSummary(),
        MarketService.fetchMarketTimeseries()
      ])
      
      setMarketSummary(summary)
      setTimeseries(timeseriesData)
      
      // Convert to MarketData format for backward compatibility
      const marketDataItems = MarketService.convertToMarketData({
        day_ahead: { price: summary.dayAheadPrice, timestamp: new Date().toISOString() },
        real_time: { price: summary.realTimePrice, timestamp: new Date().toISOString() }
      })
      setMarketData(marketDataItems)
    } catch (err) {
      console.error('Failed to refresh market data:', err)
    }
  }, []) // No dependencies - use MarketService directly

  /**
   * Auto-initialize on mount (only once)
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        
        // Check status first
        setError(null)
        const status = await MarketService.getSimulationStatus()
        setPhase(status.phase)
        setCanPlaceBids(status.can_place_bids)
        setSecondsToCutoff(status.seconds_to_cutoff)
        setBiddingDate(status.bidding_date || '')
        setDeliveryDate(status.delivery_date || '')
        setMarketSummary(prev => ({ ...prev, isInitialized: status.data_initialized }))
        
        if (status.data_initialized) {
          // Already initialized, just fetch data
          console.log('Market already initialized, fetching data...')
          const [summary, timeseriesData] = await Promise.all([
            MarketService.fetchMarketSummary(),
            MarketService.fetchMarketTimeseries()
          ])
          
          setMarketSummary(summary)
          setTimeseries(timeseriesData)
          
          // Convert to MarketData format for backward compatibility
          const marketDataItems = MarketService.convertToMarketData({
            day_ahead: { price: summary.dayAheadPrice, timestamp: new Date().toISOString() },
            real_time: { price: summary.realTimePrice, timestamp: new Date().toISOString() }
          })
          setMarketData(marketDataItems)
        } else {
          // Not initialized, initialize automatically
          console.log('Market not initialized, auto-initializing...')
          await MarketService.initializeSimulation()
          
          // Fetch data after initialization
          const [summary, timeseriesData] = await Promise.all([
            MarketService.fetchMarketSummary(),
            MarketService.fetchMarketTimeseries()
          ])
          
          setMarketSummary(summary)
          setTimeseries(timeseriesData)
          
          // Convert to MarketData format for backward compatibility
          const marketDataItems = MarketService.convertToMarketData({
            day_ahead: { price: summary.dayAheadPrice, timestamp: new Date().toISOString() },
            real_time: { price: summary.realTimePrice, timestamp: new Date().toISOString() }
          })
          setMarketData(marketDataItems)
          
          console.log('Auto-initialization successful')
        }
      } catch (err) {
        console.error('Failed to auto-initialize market data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize market data'
        setError(errorMessage)
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
    checkStatus,
    // Simulation status & controls
    phase,
    canPlaceBids,
    secondsToCutoff,
    biddingDate,
    deliveryDate,
    advanceToD0,
    backToD1,
    setSimulatedTime,
  }
}
