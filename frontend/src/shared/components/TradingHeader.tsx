/**
 * Shared Trading Header Component
 */

import React from 'react'
import { Tag } from '@arco-design/web-react'
import cvectorLogo from '../../assets/cvector-logo.png'
import { UserSessionService } from '../services/userSession'

export const TradingHeader: React.FC = () => {
  const userSession = UserSessionService.getSessionInfo()

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

          {/* Right side: User Info */}
          <div className="flex items-center">
            <Tag color="blue" className="text-xs">
              {userSession.userName}
            </Tag>
          </div>
        </div>
      </div>
    </header>
  )
}
