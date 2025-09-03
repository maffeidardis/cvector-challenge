/**
 * Shared Welcome Screen Component
 */

import React from 'react'
import { Button } from '@arco-design/web-react'
import { IconClockCircle } from '@arco-design/web-react/icon'

interface WelcomeScreenProps {
  onInitialize: () => void
  isLoading: boolean
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onInitialize,
  isLoading
}) => {
  return (
    <div className="flex items-center justify-center min-h-[70vh] sm:min-h-[80vh] px-4">
      <div className="text-center max-w-sm sm:max-w-md bg-white p-6 sm:p-8 shadow-lg border border-slate-100">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <IconClockCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#66002D]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#66002D] mb-3 sm:mb-4">
          Ready to Start Trading
        </h2>
        <p className="text-[#F55330] mb-6 sm:mb-8 text-sm sm:text-base font-medium">
          Initialize the market simulation to begin trading energy contracts with real D-1 market data.
        </p>
        <Button 
          type="primary" 
          size="large"
          className="bg-[#66002D] hover:bg-[#4A001F] border-[#66002D] px-6 sm:px-8 w-full sm:w-auto" 
          onClick={onInitialize}
          loading={isLoading}
        >
          Initialize Market Data
        </Button>
      </div>
    </div>
  )
}
