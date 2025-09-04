/**
 * Shared UTC Time Hook
 */

import { useState, useEffect, useRef } from 'react'

export function useUtcTime(initial?: string) {
  const [currentUtcTime, setCurrentUtcTime] = useState<string>('')
  const secondsRef = useRef<number>(0)

  useEffect(() => {
    if (!initial) {
      setCurrentUtcTime('')
      return
    }
    
    // Parse the UTC time string properly
    // Backend sends ISO format like "2025-09-02T10:00:00+00:00"
    const base = new Date(initial)
    secondsRef.current = 0
    
    console.log('Base', base);
    // Seed exactly with backend UTC time - now that backend sends proper UTC
    setCurrentUtcTime(base.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }))
    console.log('After formating', base.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }));
    
    const id = setInterval(() => {
      secondsRef.current += 1
      const progressed = new Date(base.getTime() + secondsRef.current * 1000)
      setCurrentUtcTime(progressed.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }))
    }, 1000)
    
    return () => clearInterval(id)
  }, [initial])

  return currentUtcTime
}
