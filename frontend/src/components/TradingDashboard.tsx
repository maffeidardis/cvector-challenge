/**
 * Trading Dashboard - Main orchestrator component following DDD principles
 * Coordinates between different bounded contexts (Orders, Market, P&L)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Button, Card } from '@arco-design/web-react'

// Shared components and hooks
import { TradingHeader } from '../shared/components/TradingHeader'

import { MetricCard } from '../shared/components/MetricCard'
import { QuickTrade } from '../shared/components/QuickTrade'
import { useUtcTime } from '../shared/hooks/useUtcTime'

// Domain modules
import { useMarketData } from '../modules/market/hooks/useMarketData'
import { useOrders } from '../modules/orders/hooks/useOrders'
import { usePnL } from '../modules/pnl/hooks/usePnL'

import { MarketChartToggle } from '../modules/market/components/MarketChartToggle'
import { OrdersTable } from '../modules/orders/components/OrdersTable'
import { OrderForm } from '../modules/orders/components/OrderForm'
import { PnLCard, PortfolioSummaryCard } from '../modules/pnl/components/PnLCard'

const TradingDashboard: React.FC = () => {
  // Local UI state
  const [showOrderModal, setShowOrderModal] = useState(false)
  
  // Shared hooks - start with backend simulated time if available
  const [simTime, setSimTime] = useState<string>('')
  
  // Domain hooks
  const {
    marketSummary,
    timeseries,
    isLoading: marketLoading,
    error: marketError,
    initializeSimulation,
    refreshMarketData,
    // Simulation status & controls
    phase,
    canPlaceBids,
    secondsToCutoff,
    biddingDate,
    deliveryDate,
    advanceToD0,
    backToD1,
    setSimulatedTime
  } = useMarketData()
  
  const {
    orders,
    isLoading: ordersLoading,
    submitOrders,
    fetchOrders,
    getOrderSummary
  } = useOrders()
  
  const {
    totalPnl,
    isLoading: pnlLoading,
    fetchPnLData
  } = usePnL()

  // Derived state
  const isInitialized = marketSummary.isInitialized
  const isLoading = marketLoading || ordersLoading || pnlLoading
  const orderSummary = getOrderSummary()

  // Event handlers
  const handleInitialize = useCallback(async (): Promise<void> => {
    const result = await initializeSimulation()
    if (result.success) {
      await Promise.all([
        fetchOrders(),
        fetchPnLData()
      ])
      // Update simulation time if provided
      if (result.simulatedTime) {
        setSimTime(result.simulatedTime)
      }
    }
  }, [initializeSimulation, fetchOrders, fetchPnLData])

  const handleSubmitOrders = async (orderDrafts: Array<{
    id: string
    hour: number | null
    side: 'BUY' | 'SELL'
    price: number | null
    quantity: number | null
  }>): Promise<boolean> => {
    const success = await submitOrders(orderDrafts)
    if (success) {
      await refreshData()
    }
    return success
  }

  const handleQuickTrade = async (order: {
    side: 'BUY' | 'SELL'
    hour: number
    price: number
    quantity: number
  }): Promise<boolean> => {
    const orderDraft = {
      id: `quick-${Date.now()}`,
      hour: order.hour,
      side: order.side,
      price: order.price,
      quantity: order.quantity
    }
    
    return await handleSubmitOrders([orderDraft])
  }

  const refreshData = useCallback(async (): Promise<void> => {
    await Promise.all([
      refreshMarketData(),
      fetchOrders(),
      fetchPnLData()
    ])
  }, [refreshMarketData, fetchOrders, fetchPnLData])

  const refreshSimTimeFromStatus = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/market-data/simulation/status')
      if (res.ok) {
        const json = await res.json()
        if (json?.simulated_time) setSimTime(json.simulated_time)
      }
    } catch { /* noop */ }
  }, [])

  // Wrapper functions to update simulation time
  const handleAdvanceToD0 = useCallback(async (): Promise<void> => {
    const newSimTime = await advanceToD0()
    if (newSimTime) {
      setSimTime(newSimTime)
    }
    // Refresh other data
    await Promise.all([
      fetchOrders(),
      fetchPnLData()
    ])
  }, [advanceToD0, fetchOrders, fetchPnLData])

  const handleBackToD1 = useCallback(async (): Promise<void> => {
    const newSimTime = await backToD1()
    if (newSimTime) {
      setSimTime(newSimTime)
    }
    // Refresh other data
    await Promise.all([
      fetchOrders(),
      fetchPnLData()
    ])
  }, [backToD1, fetchOrders, fetchPnLData])

  // Auto-initialize simulation on component mount (only once)
  useEffect(() => {
    const initializeOnMount = async () => {
      if (!isInitialized && !isLoading) {
        await handleInitialize()
      }
      // Pull status to get simulated time
      await refreshSimTimeFromStatus()
    }
    
    initializeOnMount()
  }, []) // Empty dependency array - run only once on mount

  // Auto-refresh every 30 seconds when initialized
  useEffect(() => {
    if (!isInitialized) return
    
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [isInitialized, refreshData])

  // Calculate spread for display
  const spread = marketSummary.realTimePrice - marketSummary.dayAheadPrice
  const currentUtcTime = useUtcTime(simTime)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TradingHeader
        isInitialized={isInitialized}
        isLoading={isLoading}
        currentUtcTime={currentUtcTime}
        onInitialize={handleInitialize}
        onPlaceOrders={() => setShowOrderModal(true)}
        phase={phase}
        canPlaceBids={canPlaceBids}
        secondsToCutoff={secondsToCutoff}
        pendingOrders={orderSummary.pendingOrders}
        executedOrders={orderSummary.executedOrders}
        biddingDate={biddingDate}
        deliveryDate={deliveryDate}
        onAdvance={handleAdvanceToD0}
        onBackToD1={handleBackToD1}
      />

      {!isInitialized ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F55330] mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-[#66002D] mb-2">Initializing Trading Platform</h2>
            <p className="text-[#F55330]">Loading D-1 market data and setting up simulation...</p>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <MetricCard
              title="Day-Ahead Price"
              value={`$${marketSummary.dayAheadPrice.toFixed(2)}`}
              unit="per MWh"
              isLoading={marketLoading}
            />
            
            <MetricCard
              title="Real-Time Price"
              value={`$${marketSummary.realTimePrice.toFixed(2)}`}
              unit="per MWh"
              isLoading={marketLoading}
            />
            
            <MetricCard
              title="RT-DA Spread"
              value={`${spread >= 0 ? '+' : '-'}$${Math.abs(spread).toFixed(2)}`}
              unit="price difference"
              valueColor={spread >= 0 ? 'text-green-600' : 'text-red-600'}
              isLoading={marketLoading}
            />
            
            <PnLCard
              totalPnl={totalPnl}
              isLoading={pnlLoading}
            />
          </div>

          {/* Main Content Grid: Chart + Quick Trade */}
          <div className={`grid grid-cols-1 ${phase === 'BIDDING' ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-4 sm:gap-6`}>
            {/* Chart Section - Takes 3/4 width on D-1, full width on D0 */}
            <div className={phase === 'BIDDING' ? 'lg:col-span-3' : 'lg:col-span-1'}>
              {marketError ? (
                <Card 
                  title={<span className="text-[#66002D] font-bold text-lg">Market Data</span>}
                  className="shadow-sm"
                  style={{ borderRadius: "16px" }}
                >
                  <div className="text-center py-8 sm:py-16 px-4">
                    <div className="text-red-600 font-medium mb-4 text-sm sm:text-base">
                      {marketError}
                    </div>
                    <Button 
                      onClick={handleInitialize}
                      className="bg-[#F55330] hover:bg-[#E04420] border-[#F55330] text-white w-full sm:w-auto"
                    >
                      Retry Initialization
                    </Button>
                  </div>
                </Card>
              ) : (
                <MarketChartToggle
                  dayAheadSeries={timeseries.dayAhead}
                  realTimeSeries={timeseries.realTime}
                  isLoading={marketLoading}
                  height={360}
                />
              )}
            </div>
            
            {/* Quick Trade Section - Only show during D-1 bidding phase */}
            {phase === 'BIDDING' && (
              <div className="lg:col-span-1">
                <QuickTrade
                  onSubmit={handleQuickTrade}
                  isLoading={ordersLoading}
                  canPlaceBids={canPlaceBids}
                />
              </div>
            )}
          </div>

          {/* Orders and Portfolio Row */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Order Book */}
            <div className="xl:col-span-3">
              <OrdersTable
                orders={orders}
                summary={orderSummary}
                isLoading={ordersLoading}
              />
            </div>
            
            {/* Portfolio Summary */}
            <div className="xl:col-span-1">
              <PortfolioSummaryCard
                totalOrders={orderSummary.totalOrders}
                totalVolume={orderSummary.totalVolume}
                averageBidPrice={orderSummary.averageBidPrice}
                successRate={orderSummary.successRate}
                isLoading={ordersLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      <OrderForm
        visible={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSubmit={handleSubmitOrders}
        isLoading={ordersLoading}
        canPlaceBids={canPlaceBids}
      />
    </div>
  )
}

export default TradingDashboard