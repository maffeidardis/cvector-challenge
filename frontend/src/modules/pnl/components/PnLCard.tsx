/**
 * P&L Card Component - Displays P&L summary with highlight styling
 */

import React from 'react'
import { Card } from '@arco-design/web-react'

interface PnLCardProps {
  totalPnl: number
  isLoading?: boolean
  className?: string
}

export const PnLCard: React.FC<PnLCardProps> = ({ 
  totalPnl, 
  isLoading = false,
  className = ""
}) => {
  return (
    <Card 
      className={`shadow-sm ${className}`} 
      style={{ backgroundColor: '#EBF86C', borderRadius: "16px" }}
      loading={isLoading}
    >
      <div className="p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-bold text-[#66002D] mb-1 sm:mb-2">
          Total P&L
        </h3>
        <div 
          className="text-lg sm:text-xl lg:text-2xl font-bold"
          style={{ color: totalPnl >= 0 ? '#16a34a' : '#dc2626' }}
        >
          {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
        </div>
        <div className="text-xs text-[#66002D] mt-1 font-medium">
          unrealized
        </div>
      </div>
    </Card>
  )
}

interface PortfolioSummaryCardProps {
  totalOrders: number
  totalVolume: number
  averageBidPrice: number
  successRate: number
  isLoading?: boolean
  className?: string
}

export const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
  totalOrders,
  totalVolume,
  averageBidPrice,
  successRate,
  isLoading = false,
  className = ""
}) => {
  return (
    <Card 
      title={<span className="text-[#66002D] font-bold text-base sm:text-lg">Portfolio Summary</span>} 
      className={`shadow-sm ${className}`}
      style={{ borderRadius: "16px" }}
      loading={isLoading}
    >
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center py-1 sm:py-2 border-b border-slate-100">
          <span className="text-[#66002D] text-xs sm:text-sm font-medium">Total Orders</span>
          <span className="font-bold text-sm sm:text-base text-black">{totalOrders}</span>
        </div>
        <div className="flex justify-between items-center py-1 sm:py-2 border-b border-slate-100">
          <span className="text-[#66002D] text-xs sm:text-sm font-medium">Total Volume</span>
          <span className="font-bold text-sm sm:text-base text-black">{totalVolume.toFixed(1)} MWh</span>
        </div>
        <div className="flex justify-between items-center py-1 sm:py-2 border-b border-slate-100">
          <span className="text-[#66002D] text-xs sm:text-sm font-medium">Avg. Bid Price</span>
          <span className="font-bold text-sm sm:text-base text-black">
            ${averageBidPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center py-1 sm:py-2">
          <span className="text-[#66002D] text-xs sm:text-sm font-medium">Success Rate</span>
          <span className="font-bold text-sm sm:text-base text-black">
            {successRate}%
          </span>
        </div>
      </div>
    </Card>
  )
}
