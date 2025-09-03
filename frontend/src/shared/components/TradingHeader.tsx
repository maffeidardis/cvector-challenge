/**
 * Shared Trading Header Component
 */

import React from 'react'
import { Button, Tag } from '@arco-design/web-react'
import { IconClockCircle } from '@arco-design/web-react/icon'
import cvectorLogo from '../../assets/cvector-logo.png'

interface TradingHeaderProps {
  isInitialized: boolean
  isLoading: boolean
  currentUtcTime: string
  onInitialize: () => void
  onPlaceOrders: () => void
}

export const TradingHeader: React.FC<TradingHeaderProps> = ({
  isInitialized,
  isLoading,
  currentUtcTime,
  onInitialize,
  onPlaceOrders
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        {/* Mobile: Stacked layout, Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          
          {/* Logo and Title Section */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <img 
              src={cvectorLogo} 
              alt="CVector" 
              className="h-6 sm:h-8 w-auto flex-shrink-0"
            />
            <div className="border-l border-slate-300 pl-3 sm:pl-4 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-[#66002D] truncate">
                Energy Trading Platform
              </h1>
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
                  onClick={onInitialize}
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
                  onClick={onPlaceOrders}
                >
                  Place Orders
                </Button>
              )}
            </div>
                          
            {/* UTC Time - Mobile: Full width, Desktop: Inline */}
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-sm bg-slate-50 sm:bg-transparent px-3 py-2 sm:p-0 mt-4">
              <IconClockCircle className="text-[#F55330] w-4 h-4" />
              <span className="text-[#66002D] text-xs sm:text-sm font-semibold">UTC</span>
              <span className="font-mono font-bold text-[#66002D] text-sm sm:text-base">
                {currentUtcTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
