/**
 * Shared UTC Time Hook
 */

import { useState, useEffect } from 'react'

export function useUtcTime() {
  const [currentUtcTime, setCurrentUtcTime] = useState<string>('')

  useEffect(() => {
    const updateUtcTime = () => {
      const now = new Date()
      setCurrentUtcTime(now.toLocaleString('en-US', {
        timeZone: 'UTC',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }))
    }
    
    updateUtcTime() // Initial update
    const interval = setInterval(updateUtcTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return currentUtcTime
}
