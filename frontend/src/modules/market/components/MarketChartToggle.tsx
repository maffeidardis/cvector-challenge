/**
 * Market Chart Toggle Component - Single chart with Day-Ahead/Real-Time toggle
 */

import React, { useState } from 'react'
import { Card, Radio } from '@arco-design/web-react'
import { IconDashboard, IconThunderbolt } from '@arco-design/web-react/icon'
import MarketChart from './MarketChart'

interface ChartDataPoint {
  timestamp: string
  price: number
}

interface MarketChartToggleProps {
  dayAheadSeries: ChartDataPoint[]
  realTimeSeries: ChartDataPoint[]
  isLoading?: boolean
  height?: number
}

export const MarketChartToggle: React.FC<MarketChartToggleProps> = ({
  dayAheadSeries,
  realTimeSeries,
  isLoading = false,
  height = 320
}) => {
  const [activeChart, setActiveChart] = useState<'DAY_AHEAD' | 'REAL_TIME'>('REAL_TIME')

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span className="text-[#66002D] font-bold text-lg">Market Data</span>
          
          {/* Chart Toggle */}
          <Radio.Group
            type="button"
            value={activeChart}
            onChange={(value) => setActiveChart(value as 'REAL_TIME' | 'DAY_AHEAD')}
          >
            <Radio value="REAL_TIME">
              <div className="flex items-center space-x-2">
                <IconThunderbolt className="text-[#F55330] w-4 h-4" />
                <span className="font-medium text-[#F55330]">Real-Time</span>
              </div>
            </Radio>
            <Radio value="DAY_AHEAD">
              <div className="flex items-center space-x-2">
                <IconDashboard className="text-[#66002D] w-4 h-4" />
                <span className="font-medium text-[#66002D]">Day-Ahead</span>
              </div>
            </Radio>
          </Radio.Group>
        </div>
      }
      className="shadow-sm"
      style={{ borderRadius: "16px" }}
      loading={isLoading}
    >
      <div className="w-full">
        <MarketChart
          market={activeChart}
          height={height}
          showTitle={false}
          series={activeChart === 'DAY_AHEAD' ? dayAheadSeries : realTimeSeries}
        />
      </div>
    </Card>
  )
}
