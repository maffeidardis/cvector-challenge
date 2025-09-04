/**
 * Trading Controls Component - Separate from header
 */

import React from 'react'
import { Button, Tag, Message, Space } from '@arco-design/web-react'
import { IconClockCircle } from '@arco-design/web-react/icon'

interface TradingControlsProps {
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
  onReset?: () => Promise<void>
}

export const TradingControls: React.FC<TradingControlsProps> = ({
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
  onReset,
}) => {
  const [isAdvancing, setIsAdvancing] = React.useState(false)
  const [isGoingBack, setIsGoingBack] = React.useState(false)
  const [isResetting, setIsResetting] = React.useState(false)
  
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

  const handleReset = async () => {
    if (onReset) {
      setIsResetting(true)
      try {
        await onReset()
        Message.success('Order book cleared successfully')
      } catch (error) {
        Message.error('Failed to clear order book')
      } finally {
        setIsResetting(false)
      }
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      {/* Phase Tag */}
      <div className="flex justify-center">
        <Tag 
          color={phase === 'BIDDING' ? 'orange' : 'green'}
          className="px-3 py-1 text-sm"
        >
          {phase === 'BIDDING' 
            ? `Bidding (D-1)${biddingDate ? ` - ${biddingDate}` : ''}` 
            : `Trading (D0)${deliveryDate ? ` - ${deliveryDate}` : ''}`
          }
        </Tag>
      </div>
      
      {/* UTC Time */}
      <div className="flex items-center justify-center space-x-2 text-sm bg-slate-50 px-3 py-2 rounded-md">
        <IconClockCircle className="text-[#F55330] w-4 h-4" />
        <span className="text-[#66002D] text-xs font-semibold">UTC</span>
        <span className="font-mono font-bold text-[#66002D] text-sm">
          {currentUtcTime}
        </span>
      </div>

      {/* Cutoff countdown */}
      {phase === 'BIDDING' && (
        <div className="text-center text-xs text-[#66002D] bg-amber-50 px-2 py-1 rounded">
          Cutoff 11:00 • {cutoffH.toString().padStart(2,'0')}:{cutoffM.toString().padStart(2,'0')}:{cutoffS.toString().padStart(2,'0')}
        </div>
      )}
      
      {/* Action Buttons */}
      <Space direction="vertical" className="w-full">
        {/* Reset Button - Available when there are orders */}
        {isInitialized && (pendingOrders > 0 || executedOrders > 0) && (
          <Button 
            size="default"
            shape='round'
            onClick={handleReset}
            status='danger'
            loading={isResetting}
            long
          >
            {isResetting ? 'Clearing...' : 'Reset Orders'}
          </Button>
        )}
        
        {!isInitialized ? (
          <Button 
            type="primary" 
            size="default"
            onClick={onInitialize}
            loading={isLoading}
            long
          >
            Initialize Market
          </Button>
        ) : (
          <>
            {phase === 'BIDDING' ? (
              <>
                <Button 
                  type="primary"
                  size="default"
                  status='warning'
                  shape='round'
                  onClick={onPlaceOrders}
                  disabled={!canPlaceBids}
                  style={{marginBottom: "10px"}}
                  long
                >
                  Place Orders
                </Button>
                <Button
                  size="default"
                  shape='round'
                  onClick={handleAdvance}
                  disabled={pendingOrders === 0}
                  loading={isAdvancing}
                  style={{marginBottom: "10px"}}
                  long
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
                    size="default"
                    status='warning'
                    shape='round'
                    onClick={handleBackToD1}
                    className="bg-[#66002D] hover:bg-[#4A001F] border-[#66002D]"
                    loading={isGoingBack}
                    style={{marginBottom: "10px"}}
                    long
                  >
                    {isGoingBack ? 'Going back...' : '← Back to D-1'}
                  </Button>
                ) : (
                  <Button 
                    type="primary"
                    size="default"
                    status='warning'
                    shape='round'
                    onClick={onPlaceOrders}
                    style={{marginBottom: "10px"}}
                    disabled
                    long
                  >
                    Place Orders
                  </Button>
                )}
                <Button
                  size="default"
                  onClick={onPlaceOrders}
                  className="border-slate-300 text-slate-500"
                  disabled
                  style={{marginBottom: "10px"}}
                  long
                >
                  D0 Trading View
                </Button>
              </>
            )}
          </>
        )}
      </Space>
    </div>
  )
}
