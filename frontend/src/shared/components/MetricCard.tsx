/**
 * Shared Metric Card Component
 */

import React from 'react'
import { Card } from '@arco-design/web-react'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  valueColor?: string
  backgroundColor?: string
  isLoading?: boolean
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  valueColor = 'text-black',
  backgroundColor,
  isLoading = false,
  className = ""
}) => {
  const cardStyle = backgroundColor ? { backgroundColor, borderRadius: "16px" } : { borderRadius: "16px" }

  return (
    <Card 
      className={`shadow-sm ${className}`} 
      style={cardStyle}
      loading={isLoading}
    >
      <div className="p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-bold text-[#66002D] mb-1 sm:mb-2">
          {title}
        </h3>
        <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${valueColor}`}>
          {typeof value === 'number' ? value.toFixed(2) : value}
        </div>
        {unit && (
          <div className="text-xs text-black mt-1 font-medium">
            {unit}
          </div>
        )}
      </div>
    </Card>
  )
}
