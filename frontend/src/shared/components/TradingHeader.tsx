/**
 * Shared Trading Header Component
 */

import React from 'react'
import { Button, Tag, Message } from '@arco-design/web-react'
import { IconClockCircle } from '@arco-design/web-react/icon'
import cvectorLogo from '../../assets/cvector-logo.png'

interface TradingHeaderProps {
  isInitialized: boolean
  isLoading: boolean
  currentUtcTime: string
  onInitialize: () => void
  onPlaceOrders: () => void
  // Simulation additions
  phase?: 'BIDDING' | 'TRADING'
  canPlaceBids?: boolean
  secondsToCutoff?: number
  pendingOrders?: number
  executedOrders?: number
  biddingDate?: string  // D-1 date (e.g., "2024-09-02")
  deliveryDate?: string // D0 date (e.g., "2024-09-03")
  onAdvance?: () => Promise<void>
  onBackToD1?: () => Promise<void>
  onSetSimTime?: (hour: number, minute?: number) => void
}

export const TradingHeader: React.FC<TradingHeaderProps> = ({
  isInitialized,
  isLoading,
  currentUtcTime,
  onInitialize,
  onPlaceOrders,
  phase = 'BIDDING',
  canPlaceBids = true,
  secondsToCutoff = 0,
  pendingOrders = 0,
  executedOrders = 0,
  biddingDate,
  deliveryDate,
  onAdvance,
  onBackToD1,
  onSetSimTime
}) => {
  const [isAdvancing, setIsAdvancing] = React.useState(false)
  const [isGoingBack, setIsGoingBack] = React.useState(false)
  
  const cutoffH = Math.max(0, Math.floor(secondsToCutoff / 3600))
  const cutoffM = Math.max(0, Math.floor((secondsToCutoff % 3600) / 60))
  const cutoffS = Math.max(0, secondsToCutoff % 60)
  
  const handleAdvance = async () => {
    if (onAdvance) {
      setIsAdvancing(true)
      try {
        await onAdvance()
        Message.success('Successfully advanced to D0! Orders have been cleared.')
      } catch (error) {
        Message.error('Failed to advance to D0. Please try again.')
      } finally {
        setIsAdvancing(false)
      }
    }
  }

  const handleBackToD1 = async () => {
    if (onBackToD1) {
      setIsGoingBack(true)
      try {
        await onBackToD1()
        Message.success('Returned to D-1 bidding phase. You can place new orders.')
      } catch (error) {
        Message.error('Failed to go back to D-1. Please try again.')
      } finally {
        setIsGoingBack(false)
      }
    }
  }

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
                color={phase === 'BIDDING' ? 'orange' : 'green'}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
              >
                {phase === 'BIDDING' 
                  ? `Bidding (D-1)${biddingDate ? ` - ${biddingDate}` : ''}` 
                  : `Trading (D0)${deliveryDate ? ` - ${deliveryDate}` : ''}`
                }
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
                <>
                  {phase === 'BIDDING' ? (
                    <>
                      <Button 
                        type="primary"
                        size="large"
                        status='warning'
                        shape='round'
                        onClick={onPlaceOrders}
                        disabled={!canPlaceBids}
                      >
                        Place Orders
                      </Button>
                      <Button
                        size="large"
                        onClick={handleAdvance}
                        className="border-[#F55330] text-[#F55330] hover:bg-[#F55330] hover:text-white"
                        disabled={pendingOrders === 0}
                        loading={isAdvancing}
                      >
                        {isAdvancing ? 'Advancing...' : `Advance to D0 ${pendingOrders === 0 ? '(No Orders)' : `(${pendingOrders} Orders)`}`}
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Show Back to D-1 button only if user has executed orders */}
                      {executedOrders > 0 ? (
                        <Button 
                          type="primary"
                          size="large"
                          status='warning'
                          shape='round'
                          onClick={handleBackToD1}
                          className="bg-[#66002D] hover:bg-[#4A001F] border-[#66002D]"
                          loading={isGoingBack}
                        >
                          {isGoingBack ? 'Going back...' : '← Back to D-1'}
                        </Button>
                      ) : (
                        <Button 
                          type="primary"
                          size="large"
                          status='warning'
                          shape='round'
                          onClick={onPlaceOrders}
                          disabled
                        >
                          Place Orders
                        </Button>
                      )}
                      <Button
                        size="large"
                        onClick={onPlaceOrders}
                        className="border-slate-300 text-slate-500"
                        disabled
                      >
                        D0 Trading View
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
                          
            {/* UTC Time and countdown - Mobile: Full width, Desktop: Inline */}
            <div className="flex items-center justify-center sm:justify-start space-x-4 text-sm bg-slate-50 sm:bg-transparent px-3 py-2 sm:p-0 mt-4">
              <IconClockCircle className="text-[#F55330] w-4 h-4" />
              <span className="text-[#66002D] text-xs sm:text-sm font-semibold">UTC</span>
              <span className="font-mono font-bold text-[#66002D] text-sm sm:text-base">
                {currentUtcTime}
              </span>
              {phase === 'BIDDING' && (
                <span className="text-xs sm:text-sm text-[#66002D]">
                  Cutoff 11:00 • {cutoffH.toString().padStart(2,'0')}:{cutoffM.toString().padStart(2,'0')}:{cutoffS.toString().padStart(2,'0')}
                </span>
              )}
              {/* Sim time selector (compact) */}
              {onSetSimTime && (
                <div className="flex items-center space-x-1">
                  <select
                    className="border border-slate-300 px-1 py-0.5 text-xs"
                    onChange={(e) => onSetSimTime(Number(e.target.value))}
                    defaultValue={new Date().getUTCHours()}
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2,'0')}:00</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
