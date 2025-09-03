/**
 * Real-time PJM LMP Price Chart Component
 */

import React from 'react'
import { Card, Spin, Alert, Tag } from '@arco-design/web-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatPrice, formatTimestamp, formatTime } from '../../../shared/utils/formatters'
import type { MarketType } from '../types/market'

interface PriceChartProps {
  market: MarketType
  height?: number
  showTitle?: boolean
  series?: { timestamp: string; price: number }[]
}

interface ChartDataPoint {
  timestamp: string
  price: number
  formattedTime: string
  energy?: number
  congestion?: number
  loss?: number
}

const MarketChart: React.FC<PriceChartProps> = ({ 
  market, 
  height = 400, 
  showTitle = true,
  series,
}) => {
  // Accept series from parent; fallback to empty
  const isLoading = false
  const error: string | null = null
  const isConnected = true
  const lastUpdated: string | null = null

  // Filter and format data for the chart
  const inputSeries: { timestamp: string; price: number }[] = series ?? []
  const chartData: ChartDataPoint[] = inputSeries
    .map((point: { timestamp: string; price: number }) => ({
      timestamp: point.timestamp,
      price: point.price,
      formattedTime: formatTime(point.timestamp),
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-48) // Show last 48 data points

  // Calculate current price and change
  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0
  const previousPrice = chartData.length > 1 ? chartData[chartData.length - 2].price : currentPrice
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            {formatTimestamp(data.timestamp)}
          </p>
          <p style={{ margin: '4px 0', color: '#66002D' }}>
            LMP: {formatPrice(data.price)}
          </p>
          {data.energy && (
            <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
              Energy: {formatPrice(data.energy)}
            </p>
          )}
          {data.congestion && (
            <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
              Congestion: {formatPrice(data.congestion)}
            </p>
          )}
          {data.loss && (
            <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
              Loss: {formatPrice(data.loss)}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const title = showTitle ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{market === 'REAL_TIME' ? 'Real-Time' : 'Day-Ahead'} PJM LMP</span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Tag color={isConnected ? 'green' : 'red'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Tag>
        {currentPrice > 0 && (
          <Tag color={priceChange >= 0 ? 'green' : 'red'}>
            {formatPrice(currentPrice)} ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%)
          </Tag>
        )}
      </div>
    </div>
  ) : undefined

  if (error) {
    return (
      <Card title={title} style={{ height }}>
        <Alert
          type="error"
          content={
            <div>
              <strong>Failed to load market data</strong>
              <br />
              {error}
            </div>
          }
          showIcon
        />
      </Card>
    )
  }

  if (isLoading && chartData.length === 0) {
    return (
      <Card title={title} style={{ height }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: height - 100 
        }}>
          <Spin tip="Loading PJM market data..." />
        </div>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card title={title} style={{ height }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: height - 100,
          color: '#86909c'
        }}>
          No market data available for {market === 'REAL_TIME' ? 'Real-Time' : 'Day-Ahead'} market
        </div>
      </Card>
    )
  }

  return (
    <Card title={title} style={{ height }}>
      <ResponsiveContainer width="100%" height={height - 80}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedTime" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={market === 'DAY_AHEAD' ? '#66002D' : '#F55330'} 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: market === 'DAY_AHEAD' ? '#66002D' : '#F55330', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {lastUpdated && (
        <div style={{ 
          textAlign: 'right', 
          fontSize: '12px', 
          color: '#86909c', 
          marginTop: '8px' 
        }}>
          Last updated: {formatTimestamp(lastUpdated)}
        </div>
      )}
    </Card>
  )
}

export default MarketChart
