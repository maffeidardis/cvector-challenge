/**
 * Quick Trade Component - Fast single order placement widget
 */

import React, { useState } from 'react'
import { Card, Button, Select, InputNumber, Message, Radio } from '@arco-design/web-react'
import { IconThunderbolt, IconUp, IconDown } from '@arco-design/web-react/icon'

interface QuickTradeProps {
  onSubmit: (order: {
    side: 'BUY' | 'SELL'
    hour: number
    price: number
    quantity: number
  }) => Promise<boolean>
  isLoading?: boolean
  className?: string
  canPlaceBids?: boolean
}

export const QuickTrade: React.FC<QuickTradeProps> = ({ 
  onSubmit, 
  isLoading = false,
  className = "",
  canPlaceBids = true
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [hour, setHour] = useState<number | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get current UTC hour for smart defaults
  const currentHour = new Date().getUTCHours()
  const nextHours = Array.from({ length: 6 }, (_, i) => (currentHour + i + 1) % 24)

  const handleSubmit = async () => {
    if (!hour || !price || !quantity) {
      Message.error('Please fill all fields')
      return
    }

    if (price <= 0) {
      Message.error('Price must be greater than 0')
      return
    }

    if (quantity <= 0) {
      Message.error('Quantity must be greater than 0')
      return
    }

    try {
      setIsSubmitting(true)
      const success = await onSubmit({ side, hour, price, quantity })
      
      if (success) {
        Message.success(`${side} order placed successfully!`)
        // Reset form
        setHour(null)
        setPrice(null)
        setQuantity(null)
      }
    } catch {
      Message.error('Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = hour !== null && price !== null && quantity !== null && price > 0 && quantity > 0
  const totalValue = (price || 0) * (quantity || 0)

  return (
    <Card
      title={
        <div className="flex items-center space-x-2">
          <IconThunderbolt className="text-[#F55330] w-5 h-5" />
          <span className="text-[#66002D] font-bold">Quick Trade</span>
        </div>
      }
      className={`shadow-sm ${className}`}
      style={{ borderRadius: "16px" }}
      size='small'
    >
      <div className="space-y-3">
        {!canPlaceBids && (
          <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-[#66002D]">
            Bidding closed (after 11:00 UTC). Debug: canPlaceBids={String(canPlaceBids)}
          </div>
        )}
        {/* Buy/Sell Toggle */}
        <div>
          <label className="block text-xs font-bold text-[#66002D] mb-1">
            Order Type
          </label>
          <Radio.Group
            type="button"
            value={side}
            onChange={(value) => setSide(value as 'BUY' | 'SELL')}
            className="w-full"
          >
            <Radio value="BUY" className="flex-1">
              <div className="flex items-center justify-center space-x-2 py-2">
                <IconUp className="text-green-600 w-4 h-4" />
                <span className="font-medium text-green-600">BUY</span>
              </div>
            </Radio>
            <Radio value="SELL" className="flex-1">
              <div className="flex items-center justify-center space-x-2 py-2">
                <IconDown className="text-red-600 w-4 h-4" />
                <span className="font-medium text-red-600">SELL</span>
              </div>
            </Radio>
          </Radio.Group>
        </div>

        {/* Hour Selection */}
        <div>
          <label className="block text-xs font-bold text-[#66002D] mb-1">
            Delivery Hour (UTC)
          </label>
          
          {/* Quick Hour Buttons */}
          <div className="flex flex-wrap gap-1 mb-2">
            {nextHours.slice(0, 4).map(h => (
              <Button
                key={h}
                size="small"
                type={hour === h ? 'primary' : 'secondary'}
                onClick={() => setHour(h)}
                className={hour === h ? 'bg-[#F55330] border-[#F55330]' : 'text-[#66002D] border-[#66002D]'}
              >
                {h.toString().padStart(2, '0')}:00
              </Button>
            ))}
          </div>
          
          {/* Hour Dropdown */}
          <Select
            placeholder="Select hour"
            value={hour ?? undefined}
            onChange={(value) => setHour(value as number)}
            className="w-full"
            allowClear
          >
            {Array.from({ length: 24 }, (_, i) => (
              <Select.Option key={i} value={i}>
                {`${i.toString().padStart(2, '0')}:00 UTC`}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Price Input */}
        <div>
          <label className="block text-xs font-bold text-[#66002D] mb-1">
            Price ($/MWh)
          </label>
          <InputNumber
            placeholder="e.g., 45.50"
            min={0.01}
            max={9999.99}
            step={0.01}
            precision={2}
            value={price ?? undefined}
            onChange={(value) => setPrice(value)}
            className="w-full"
            size="large"
          />
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-xs font-bold text-[#66002D] mb-1">
            Quantity (MWh)
          </label>
          <InputNumber
            placeholder="e.g., 100"
            min={1}
            max={10000}
            step={1}
            value={quantity ?? undefined}
            onChange={(value) => setQuantity(value)}
            className="w-full"
            size="large"
          />
        </div>

        {/* Order Summary */}
        {isFormValid && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="text-sm text-[#66002D] space-y-1">
              <div className="flex justify-between">
                <span>Order:</span>
                <span className="font-medium">{side} {quantity} MWh</span>
              </div>
              <div className="flex justify-between">
                <span>Hour:</span>
                <span className="font-medium">{hour?.toString().padStart(2, '0')}:00 UTC</span>
              </div>
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-medium">${price?.toFixed(2)}/MWh</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1 mt-2">
                <span className="font-bold text-[#F55330]">Total Value:</span>
                <span className="font-bold text-[#F55330]">${totalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          status="warning"
          type='primary'
          size="large"
          shape='round'
          onClick={handleSubmit}
          loading={isSubmitting || isLoading}
          disabled={!isFormValid || !canPlaceBids}
          className="w-full bg-[#F55330] hover:bg-[#E04420] border-[#F55330]"
        >
          {isSubmitting ? 'Placing Order...' : `Place ${side} Order`}
        </Button>
      </div>
    </Card>
  )
}
