/**
 * Virtual Energy Trading Dashboard
 */

import React, { useState, useEffect } from 'react'
import { Button, Card, Table, InputNumber, Select, Message, Modal, Tag } from '@arco-design/web-react'
import { IconClockCircle } from '@arco-design/web-react/icon'

import type { MarketData } from '../types/trading.types'
import PriceChart from './market/PriceChart'

// Type definitions
type BidStatus = 'PENDING' | 'EXECUTED' | 'REJECTED'
interface BidRow { 
  id: string
  hour: number
  price: number
  quantity: number
  user_id: string
  timestamp: string
  status: BidStatus
  clearing_price?: number
}

interface TimeseriesPoint { 
  timestamp: string
  price: number
}
type OrderDraft = { 
  id: string
  hour: number | null
  side: 'BUY' | 'SELL'
  price: number | null
  quantity: number | null
}

const TradingDashboard: React.FC = () => {
  // State
  const [, setMarketData] = useState<MarketData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [seriesDA, setSeriesDA] = useState<TimeseriesPoint[]>([])
  const [seriesRT, setSeriesRT] = useState<TimeseriesPoint[]>([])
  const [bids, setBids] = useState<BidRow[]>([])
  const [totalPnl, setTotalPnl] = useState<number>(0)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderRows, setOrderRows] = useState<OrderDraft[]>([
    { id: 'row-1', hour: null, side: 'BUY', price: null, quantity: null }
  ])
  const [currentUtcTime, setCurrentUtcTime] = useState<string>('')

  // Helper functions
  const addOrderRow = (): void => {
    if (orderRows.length >= 10) return
    setOrderRows(prev => [...prev, { 
      id: `row-${prev.length + 1}`, 
      hour: null, 
      side: 'BUY', 
      price: null, 
      quantity: null 
    }])
  }

  const removeOrderRow = (id: string): void => {
    setOrderRows(prev => prev.filter(r => r.id !== id))
  }

  const submitOrders = async (): Promise<void> => {
    try {
      const validRows = orderRows.filter(r => r.hour !== null && r.price && r.quantity)
      if (validRows.length === 0) {
        Message.warning('Please fill at least one complete order')
        return
      }
      
      for (const r of validRows) {
        await fetch(`/api/market-data/bids?hour=${r.hour}&price=${r.price}&quantity=${r.quantity}`, { 
          method: 'POST' 
        })
      }
      
      Message.success(`${validRows.length} order(s) submitted`)
      setShowOrderModal(false)
      setOrderRows([{ id: 'row-1', hour: null, side: 'BUY', price: null, quantity: null }])
      await refreshData()
    } catch {
      Message.error('Failed to submit orders')
    }
  }

  const fetchMarketData = async (): Promise<void> => {
    try {
      setError(null)
      setIsLoading(true)
      
      const response = await fetch('/api/market-data/summary')
      if (response.ok) {
        const data = await response.json()
        const items: MarketData[] = []
        
        if (data?.day_ahead?.price) {
          items.push({
            id: 'day_ahead',
            price: Number(data.day_ahead.price) || 0,
            timestamp: data.day_ahead.timestamp ? 
              new Date(data.day_ahead.timestamp).toISOString() : 
              new Date().toISOString(),
            market: 'DAY_AHEAD',
            source: 'gridstatus'
          })
        }
        
        if (data?.real_time?.price) {
          items.push({
            id: 'real_time',
            price: Number(data.real_time.price) || 0,
            timestamp: data.real_time.timestamp ? 
              new Date(data.real_time.timestamp).toISOString() : 
              new Date().toISOString(),
            market: 'REAL_TIME',
            source: 'gridstatus'
          })
        }
        
        setMarketData(items)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      console.error('Failed to fetch market data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const initializeSimulation = async (): Promise<void> => {
    try {
      setError(null)
      setIsLoading(true)
      
      const res = await fetch('/api/market-data/initialize', { method: 'POST' })
      if (res.ok) {
        setIsInitialized(true)
        
        await fetchMarketData()
        
        const ts = await fetch('/api/market-data/timeseries')
        if (ts.ok) {
          const body = await ts.json()
          setSeriesDA(Array.isArray(body?.day_ahead) ? (body.day_ahead as TimeseriesPoint[]) : [])
          setSeriesRT(Array.isArray(body?.real_time) ? (body.real_time as TimeseriesPoint[]) : [])
        }
        
        await refreshData()
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
    } catch (err) {
      console.error('Failed to initialize simulation:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    try {
      const [tsRes, bidsRes, tradesRes] = await Promise.all([
        fetch('/api/market-data/timeseries'),
        fetch('/api/market-data/bids'),
        fetch('/api/market-data/trades')
      ])
      
      if (tsRes.ok) {
        const body = await tsRes.json()
        setSeriesDA(Array.isArray(body?.day_ahead) ? (body.day_ahead as TimeseriesPoint[]) : [])
        setSeriesRT(Array.isArray(body?.real_time) ? (body.real_time as TimeseriesPoint[]) : [])
      }
      
      if (bidsRes.ok) {
        const b = await bidsRes.json()
        setBids(Array.isArray(b?.bids) ? (b.bids as BidRow[]) : [])
      }
      
      if (tradesRes.ok) {
        const t = await tradesRes.json()
        setTotalPnl(Number(t?.total_pnl || 0))
      }
    } catch (err) {
      console.error('Failed to refresh data:', err)
    }
  }

  // Effects
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/market-data/simulation/status')
        if (res.ok) {
          const status = await res.json()
          setIsInitialized(Boolean(status?.data_initialized))
          
          if (status?.data_initialized) {
            await fetchMarketData()
            await refreshData()
          } else {
            setIsLoading(false)
          }
        } else {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
      } catch (err) {
        console.error('Failed to get simulation status:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setIsLoading(false)
      }
    }
    checkStatus()
  }, [])
  
  // Auto-refresh every 30 seconds to show progression and execute orders
  useEffect(() => {
    if (!isInitialized) return
    
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [isInitialized])

  // Update UTC time every second
  useEffect(() => {
    const updateUtcTime = () => {
      const now = new Date()
      setCurrentUtcTime(now.toLocaleString('en-US', {
        timeZone: 'UTC',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }))
    }
    
    updateUtcTime() // Initial update
    const interval = setInterval(updateUtcTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculate trading metrics
  const executedOrders = bids.filter(b => b.status === 'EXECUTED').length
  const pendingOrders = bids.filter(b => b.status === 'PENDING').length
  const rejectedOrders = bids.filter(b => b.status === 'REJECTED').length
  const totalVolume = bids.reduce((sum, bid) => sum + bid.quantity, 0)

  // Get current prices
  const dayAheadPrice = seriesDA.length > 0 ? seriesDA[seriesDA.length - 1]?.price : 0
  const realTimePrice = seriesRT.length > 0 ? seriesRT[seriesRT.length - 1]?.price : 0
  const spread = realTimePrice - dayAheadPrice

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Responsive Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          {/* Mobile: Stacked layout, Desktop: Side by side */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            
            {/* Logo and Title Section */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <img 
                src="/cvector-logo.png" 
                alt="CVector" 
                className="h-6 sm:h-8 w-auto flex-shrink-0"
              />
              <div className="border-l border-slate-300 pl-3 sm:pl-4 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-[#66002D] truncate">Energy Trading Platform</h1>
              </div>
            </div>
            
            {/* Controls Section */}
            <div className="flex flex-col sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
              {/* Action Buttons */}
              <div className="flex items-center justify-between sm:justify-start space-x-3">
                <Tag 
                  color={isInitialized ? 'green' : 'red'}
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                >
                  {isInitialized ? 'LIVE' : 'OFFLINE'}
                </Tag>
                
                {!isInitialized ? (
                  <Button 
                    type="primary" 
                    size="large"
                    className="bg-[#66002D] hover:bg-[#4A001F] border-[#66002D] flex-1 sm:flex-none" 
                    onClick={initializeSimulation}
                    loading={isLoading}
                  >
                    <span className="hidden sm:inline">Initialize Market</span>
                    <span className="sm:hidden">Initialize</span>
                  </Button>
                ) : (
                  <Button 
                    type="primary"
                    size="large"
                    status='warning'
                    shape='round'
                    onClick={() => setShowOrderModal(true)}
                  >
                    Place Orders
                  </Button>
                )}
              </div>
                            
              {/* UTC Time - Mobile: Full width, Desktop: Inline */}
              <div className="flex items-center justify-center sm:justify-start space-x-2 text-sm bg-slate-50 sm:bg-transparent px-3 py-2 sm:p-0 mt-4">
                <IconClockCircle className="text-[#F55330] w-4 h-4" />
                <span className="text-[#66002D] text-xs sm:text-sm font-semibold">UTC</span>
                <span className="font-mono font-bold text-[#66002D] text-sm sm:text-base">{currentUtcTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {!isInitialized ? (
        // Welcome Screen - Responsive
        <div className="flex items-center justify-center min-h-[70vh] sm:min-h-[80vh] px-4">
          <div className="text-center max-w-sm sm:max-w-md bg-white p-6 sm:p-8 shadow-lg border border-slate-100">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <IconClockCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#66002D]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#66002D] mb-3 sm:mb-4">Ready to Start Trading</h2>
            <p className="text-[#F55330] mb-6 sm:mb-8 text-sm sm:text-base font-medium">Initialize the market simulation to begin trading energy contracts with real D-1 market data.</p>
            <Button 
              type="primary" 
              size="large"
              className="bg-[#66002D] hover:bg-[#4A001F] border-[#66002D] px-6 sm:px-8 w-full sm:w-auto" 
              onClick={initializeSimulation}
              loading={isLoading}
            >
              Initialize Market Data
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Trading Metrics Row - Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <Card className="shadow-sm" style={{borderRadius: "16px"}}>
              <div className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-bold text-[#66002D] mb-1 sm:mb-2">Day-Ahead Price</h3>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
                  ${dayAheadPrice.toFixed(2)}
                </div>
                <div className="text-xs text-black mt-1 font-medium">per MWh</div>
              </div>
            </Card>
            
            <Card className="shadow-sm" style={{borderRadius: "16px"}}>
              <div className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-bold text-[#66002D] mb-1 sm:mb-2">Real-Time Price</h3>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
                  ${realTimePrice.toFixed(2)}
                </div>
                <div className="text-xs text-black mt-1 font-medium">per MWh</div>
              </div>
            </Card>
            
            <Card className="shadow-sm" style={{borderRadius: "16px"}}>
              <div className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-bold text-[#66002D] mb-1 sm:mb-2">RT-DA Spread</h3>
                <div 
                  className="text-lg sm:text-xl lg:text-2xl font-bold"
                  style={{ color: spread >= 0 ? '#16a34a' : '#dc2626' }}
                >
                  {spread >= 0 ? '+' : '-'}${Math.abs(spread).toFixed(2)}
                </div>
                <div className="text-xs text-black mt-1 font-medium">price difference</div>
              </div>
            </Card>
            
            <Card className="shadow-sm" style={{ backgroundColor: '#EBF86C', borderRadius: "16px" }}>
              <div className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-bold text-[#66002D] mb-1 sm:mb-2">Total P&L</h3>
                <div 
                  className="text-lg sm:text-xl lg:text-2xl font-bold"
                  style={{ color: totalPnl >= 0 ? '#16a34a' : '#dc2626' }}
                >
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Section - Responsive */}
          <Card 
            title={<span className="text-[#66002D] font-bold text-lg">Market Data</span>} 
            className="shadow-sm"
            style={{borderRadius: "16px"}}
          >
            {error ? (
              <div className="text-center py-8 sm:py-16 px-4">
                <div className="text-red-600 font-medium mb-4 text-sm sm:text-base">{error}</div>
                <Button 
                  onClick={initializeSimulation}
                  className="bg-[#F55330] hover:bg-[#E04420] border-[#F55330] text-white w-full sm:w-auto"
                >
                  Retry Initialization
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="w-full">
                  <PriceChart market="DAY_AHEAD" height={280} showTitle series={seriesDA} />
                </div>
                <div className="w-full">
                  <PriceChart market="REAL_TIME" height={280} showTitle series={seriesRT} />
                </div>
              </div>
            )}
          </Card>

          {/* Orders and Portfolio Row - Responsive */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Order Book - Full width on mobile/tablet, 3/4 width on desktop */}
            <div className="xl:col-span-3">
              <Card style={{borderRadius: "16px"}}
                title={
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <span className="text-[#66002D] font-bold text-base sm:text-lg">Order Book</span>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                      <span className="text-green-600 font-medium">● {executedOrders} Executed</span>
                      <span className="text-[#F55330] font-medium">● {pendingOrders} Pending</span>
                      <span className="text-red-600 font-medium">● {rejectedOrders} Rejected</span>
                    </div>
                  </div>
                }
                className="border-0 shadow-sm"
              >
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      { 
                        title: <span className="font-bold text-[#66002D]">Hour</span>, 
                        dataIndex: 'hour',
                        width: 70,
                        render: (hour: number) => <span className="font-mono text-xs sm:text-sm text-black">{hour.toString().padStart(2, '0')}:00</span>
                      },
                      { 
                        title: <span className="font-bold text-[#66002D]">Bid Price</span>, 
                        dataIndex: 'price',
                        width: 100,
                        render: (v: number) => <span className="font-mono text-xs sm:text-sm text-black">${Number(v).toFixed(2)}</span>
                      },
                      { 
                        title: <span className="font-bold text-[#66002D]">Clearing</span>, 
                        dataIndex: 'clearing_price',
                        width: 100,
                        render: (v: number | undefined) => 
                          v ? <span className="font-mono text-xs sm:text-sm text-black">${Number(v).toFixed(2)}</span> : 
                          <span className="text-slate-400 text-xs sm:text-sm">-</span>
                      },
                      { 
                        title: <span className="font-bold text-[#66002D]">Qty</span>, 
                        dataIndex: 'quantity',
                        width: 80,
                        render: (v: number) => <span className="font-mono text-xs sm:text-sm text-black">{v} MWh</span>
                      },
                      { 
                        title: <span className="font-bold text-[#66002D]">Status</span>, 
                        dataIndex: 'status',
                        width: 90,
                        render: (status: BidStatus) => {
                          const statusConfig = {
                            'EXECUTED': { color: 'green', text: 'Exec' },
                            'PENDING': { color: 'orange', text: 'Pend' },
                            'REJECTED': { color: 'red', text: 'Rej' }
                          }
                          const config = statusConfig[status]
                          return <Tag color={config.color} className="text-xs">{config.text}</Tag>
                        }
                      },
                    ]}
                    data={bids}
                    pagination={false}
                    scroll={{ y: 250, x: 400 }}
                    size="small"
                  />
                </div>
              </Card>
            </div>
            
            {/* Portfolio Summary */}
            <div className="xl:col-span-1">
              <Card 
                title={<span className="text-[#66002D] font-bold text-base sm:text-lg">Portfolio Summary</span>} 
                className="shadow-sm"
                style={{borderRadius: "16px"}}
              >
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center py-1 sm:py-2 border-b border-slate-100">
                    <span className="text-[#66002D] text-xs sm:text-sm font-medium">Total Orders</span>
                    <span className="font-bold text-sm sm:text-base text-black">{bids.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 sm:py-2 border-b border-slate-100">
                    <span className="text-[#66002D] text-xs sm:text-sm font-medium">Total Volume</span>
                    <span className="font-bold text-sm sm:text-base text-black">{totalVolume.toFixed(1)} MWh</span>
                  </div>
                  <div className="flex justify-between items-center py-1 sm:py-2 border-b border-slate-100">
                    <span className="text-[#66002D] text-xs sm:text-sm font-medium">Avg. Bid Price</span>
                    <span className="font-bold text-sm sm:text-base text-black">
                      ${bids.length > 0 ? (bids.reduce((sum, b) => sum + b.price, 0) / bids.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 sm:py-2">
                    <span className="text-[#66002D] text-xs sm:text-sm font-medium">Success Rate</span>
                    <span className="font-bold text-sm sm:text-base text-black">
                      {bids.length > 0 ? Math.round((executedOrders / bids.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      <Modal
        title={
          <div style={{textAlign: 'center'}}>
            <img 
              src="/cvector-logo.png" 
              alt="CVector" 
              className="h-6"
              style={{display: "block", margin: "auto"}}
            />
          </div>
        }
        alignCenter={true}
        visible={showOrderModal}
        onOk={submitOrders}
        onCancel={() => setShowOrderModal(false)}
        okButtonProps={{ 
          className: 'bg-[#F55330] hover:bg-[#E04420] border-[#F55330] w-full sm:w-auto',
          size: 'large'
        }}
        cancelButtonProps={{
          size: 'large',
          className: 'w-full sm:w-auto'
        }}
        className="top-4 sm:top-20"
        style={{borderRadius: "16px"}}

      >
        <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <span className="text-lg font-bold text-[#66002D]">Place Day-Ahead Orders</span>
          </div>
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-[#66002D] font-medium">
              <strong className="text-[#F55330]">Trading Hours:</strong> Orders can be placed for any hour (0-23). 
              Orders will execute automatically when the current UTC time reaches the specified hour.
            </p>
          </div>
          
          {/* Order Rows - Enhanced Layout */}
          {orderRows.map((row, index) => (
            <div key={row.id} className="bg-white border border-slate-200 p-4 sm:p-6 shadow-sm rounded-lg">
              
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#66002D]">Order #{index + 1}</h3>
                {orderRows.length > 1 && (
                  <Button 
                    size="large"
                    onClick={() => removeOrderRow(row.id)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    Remove Order
                  </Button>
                )}
              </div>

              {/* Form Grid - 2x2 Layout for Better Visibility */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Hour Selection - Much Larger */}
                <div>
                  <label className="block text-sm font-bold text-[#66002D] mb-2">Delivery Hour</label>
                  <Select
                    placeholder="Select Hour (00-23)"
                    value={row.hour ?? undefined}
                    onChange={(v) => setOrderRows(prev => 
                      prev.map(r => r.id === row.id ? { 
                        ...r, 
                        hour: typeof v === 'number' ? v : Number(v) 
                      } : r)
                    )}
                    className="w-full"
                    size="large"
                    style={{ fontSize: '16px', minHeight: '48px' }}
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <Select.Option key={i} value={i}>
                        <span className="text-lg font-mono">{`${i.toString().padStart(2, '0')}:00`}</span>
                        <span className="text-sm text-[#66002D] ml-2">
                          ({i === 0 ? 'Midnight' : i === 12 ? 'Noon' : i < 12 ? `${i} AM` : `${i-12} PM`})
                        </span>
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                
                {/* Side Selection - Enhanced */}
                <div>
                  <label className="block text-sm font-bold text-[#66002D] mb-2">Order Type</label>
                  <Select 
                    value={row.side} 
                    onChange={(v) => setOrderRows(prev => 
                      prev.map(r => r.id === row.id ? { 
                        ...r, 
                        side: v as 'BUY' | 'SELL' 
                      } : r)
                    )}
                    className="w-full"
                    size="large"
                    style={{ fontSize: '16px', minHeight: '48px' }}
                  >
                    <Select.Option value="BUY">
                      <span className="text-lg font-medium text-green-600">BUY</span>
                      <span className="text-sm text-[#66002D] ml-2">(Purchase Energy)</span>
                    </Select.Option>
                    <Select.Option value="SELL">
                      <span className="text-lg font-medium text-red-600">SELL</span>
                      <span className="text-sm text-[#66002D] ml-2">(Supply Energy)</span>
                    </Select.Option>
                  </Select>
                </div>
                
                {/* Price Input - Enhanced */}
                <div>
                  <label className="block text-sm font-bold text-[#66002D] mb-2">Bid Price ($/MWh)</label>
                  <InputNumber
                    placeholder="Enter price (e.g., 45.50)"
                    min={0.01}
                    max={9999.99}
                    step={0.01}
                    precision={2}
                    value={row.price ?? undefined}
                    onChange={(v) => setOrderRows(prev => 
                      prev.map(r => r.id === row.id ? { 
                        ...r, 
                        price: typeof v === 'number' ? v : Number(v) 
                      } : r)
                    )}
                    className="w-full"
                    size="large"
                    style={{ fontSize: '16px', minHeight: '48px' }}
                  />
                </div>
                
                {/* Quantity Input - Enhanced */}
                <div>
                  <label className="block text-sm font-bold text-[#66002D] mb-2">Quantity (MWh)</label>
                  <InputNumber
                    placeholder="Enter quantity (e.g., 100)"
                    min={1}
                    max={10000}
                    step={1}
                    value={row.quantity ?? undefined}
                    onChange={(v) => setOrderRows(prev => 
                      prev.map(r => r.id === row.id ? { 
                        ...r, 
                        quantity: typeof v === 'number' ? v : Number(v) 
                      } : r)
                    )}
                    className="w-full"
                    size="large"
                    style={{ fontSize: '16px', minHeight: '48px' }}
                  />
                </div>
              </div>
              
              {/* Order Summary */}
              {row.hour !== null && row.price && row.quantity && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200">
                  <p className="text-sm text-[#66002D]">
                    <strong className="text-[#F55330]">Order Summary:</strong> {row.side} {row.quantity} MWh at ${row.price?.toFixed(2)}/MWh for delivery at {row.hour?.toString().padStart(2, '0')}:00
                    {row.price && row.quantity && (
                      <span className="ml-2 text-[#F55330] font-medium">
                        (Total Value: ${(row.price * row.quantity).toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
          
          {/* Footer Controls - Enhanced */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div className="text-center sm:text-left">
                <div className="text-lg font-bold text-[#66002D] mb-2">
                  Order Portfolio Status
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-[#66002D]">
                  <span>Total Orders: <strong className="text-black">{orderRows.length}/10</strong></span>
                  <span>Valid Orders: <strong className="text-black">{orderRows.filter(r => r.hour !== null && r.price && r.quantity).length}</strong></span>
                  <span>Total Value: <strong className="text-black">
                    ${orderRows
                      .filter(r => r.price && r.quantity)
                      .reduce((sum, r) => sum + ((r.price || 0) * (r.quantity || 0)), 0)
                      .toFixed(2)}
                  </strong></span>
                </div>
              </div>
              <Button 
                onClick={addOrderRow} 
                disabled={orderRows.length >= 10}
                className="text-[#F55330] border-[#F55330] hover:bg-[#F55330] hover:text-white w-full sm:w-auto"
                size="large"
              >
                + Add Another Order
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TradingDashboard