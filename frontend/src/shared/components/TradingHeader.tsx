/**
 * Shared Trading Header Component
 */

import React, { useState } from 'react'
import { Button, Message } from '@arco-design/web-react'
import cvectorLogo from '../../assets/cvector-logo.png'
import { MarketService } from '../../modules/market/services/marketService'

export const TradingHeader: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(false)

  const handleInitialize = async () => {
    setIsInitializing(true)
    try {
      await MarketService.initializeSimulation()
      Message.success('Market simulation initialized successfully!')
      // Trigger a page refresh to update all components with new data
      window.location.reload()
    } catch (error) {
      console.error('Failed to initialize simulation:', error)
      Message.error('Failed to initialize market simulation. Please try again.')
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Logo and Title */}
          <div className="flex items-center">
            {/* Mobile: Just logo */}
            <img 
              src={cvectorLogo} 
              alt="CVector" 
              className="h-6 sm:hidden w-auto flex-shrink-0"
            />
            
            {/* Desktop: Logo + Title */}
            <div className="hidden sm:flex items-center space-x-4">
              <img 
                src={cvectorLogo} 
                alt="CVector" 
                className="h-8 w-auto flex-shrink-0"
              />
              <div className="border-l border-slate-300 pl-4 min-w-0">
                <h1 className="text-xl font-semibold text-[#66002D] truncate">
                  Energy Trading Platform
                </h1>
              </div>
            </div>
          </div>

          {/* Right side: Initialize Button */}
          <div className="flex items-center">
            <Button
              type="primary"
              onClick={handleInitialize}
              loading={isInitializing}
              size="small"
              className="bg-[#66002D] hover:bg-[#66002D]/90 border-[#66002D] text-xs sm:text-sm"
            >
              {isInitializing ? 'Initializing...' : 'Initialize Market'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
