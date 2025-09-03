/**
 * P&L Hook - Manages P&L state and calculations
 */

import { useState, useCallback } from 'react'
import type { Trade, PnLSummary } from '../types/pnl'
import { PnLService } from '../services/pnlService'

export function usePnL() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [totalPnl, setTotalPnl] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch trades and P&L data
   */
  const fetchPnLData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [tradesData, totalPnlData] = await Promise.all([
        PnLService.fetchTrades(),
        PnLService.getTotalPnL()
      ])
      
      setTrades(tradesData)
      setTotalPnl(totalPnlData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch P&L data'
      setError(errorMessage)
      console.error('Error fetching P&L data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get P&L summary statistics
   */
  const getPnLSummary = useCallback((): PnLSummary => {
    return PnLService.calculatePnLSummary(trades)
  }, [trades])

  return {
    trades,
    totalPnl,
    isLoading,
    error,
    fetchPnLData,
    getPnLSummary
  }
}
