/**
 * Trading Dashboard - Main orchestrator component following DDD principles
 * Coordinates between different bounded contexts (Orders, Market, P&L)
 */

import React, { useState, useEffect } from 'react'
import { Button, Card } from '@arco-design/web-react'

// Shared components and hooks
import { TradingHeader } from '../shared/components/TradingHeader'
import { WelcomeScreen } from '../shared/components/WelcomeScreen'
import { MetricCard } from '../shared/components/MetricCard'
import { useUtcTime } from '../shared/hooks/useUtcTime'

// Domain modules
import { useMarketData } from '../modules/market/hooks/useMarketData'
import { useOrders } from '../modules/orders/hooks/useOrders'
import { usePnL } from '../modules/pnl/hooks/usePnL'

import MarketChart from '../modules/market/components/MarketChart'
import { OrdersTable } from '../modules/orders/components/OrdersTable'
import { OrderForm } from '../modules/orders/components/OrderForm'
import { PnLCard, PortfolioSummaryCard } from '../modules/pnl/components/PnLCard'

const TradingDashboard: React.FC = () => {
  // Local UI state
  const [showOrderModal, setShowOrderModal] = useState(false)
  
  // Shared hooks
  const currentUtcTime = useUtcTime()
  
  // Domain hooks
  const {
    marketSummary,
    timeseries,
    isLoading: marketLoading,
    error: marketError,
    initializeSimulation,
    refreshMarketData
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
  const handleInitialize = async (): Promise<void> => {
    const success = await initializeSimulation()
    if (success) {
      await Promise.all([
        fetchOrders(),
        fetchPnLData()
      ])
    }
  }

  const handleSubmitOrders = async (orderDrafts: any[]): Promise<boolean> => {
    const success = await submitOrders(orderDrafts)
    if (success) {
      await refreshData()
    }
    return success
  }

  const refreshData = async (): Promise<void> => {
    await Promise.all([
      refreshMarketData(),
      fetchOrders(),
      fetchPnLData()
    ])
  }

  // Auto-refresh every 30 seconds when initialized
  useEffect(() => {
    if (!isInitialized) return
    
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [isInitialized])

  // Calculate spread for display
  const spread = marketSummary.realTimePrice - marketSummary.dayAheadPrice

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TradingHeader
        isInitialized={isInitialized}
        isLoading={isLoading}
        currentUtcTime={currentUtcTime}
        onInitialize={handleInitialize}
        onPlaceOrders={() => setShowOrderModal(true)}
      />

      {!isInitialized ? (
        <WelcomeScreen
          onInitialize={handleInitialize}
          isLoading={isLoading}
        />
      ) : (
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Trading Metrics Row */}
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

          {/* Charts Section */}
          <Card 
            title={<span className="text-[#66002D] font-bold text-lg">Market Data</span>} 
            className="shadow-sm"
            style={{ borderRadius: "16px" }}
          >
            {marketError ? (
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
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="w-full">
                  <MarketChart 
                    market="DAY_AHEAD" 
                    height={280} 
                    showTitle 
                    series={timeseries.dayAhead} 
                  />
                </div>
                <div className="w-full">
                  <MarketChart 
                    market="REAL_TIME" 
                    height={280} 
                    showTitle 
                    series={timeseries.realTime} 
                  />
                </div>
              </div>
            )}
          </Card>

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
      />
    </div>
  )
}

export default TradingDashboard