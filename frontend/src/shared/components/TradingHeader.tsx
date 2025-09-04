/**
 * Shared Trading Header Component
 */

import React from 'react'
import cvectorLogo from '../../assets/cvector-logo.png'

export const TradingHeader: React.FC = () => {

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-center sm:justify-start">
          {/* Mobile: Just logo centered */}
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
      </div>
    </header>
  )
}
