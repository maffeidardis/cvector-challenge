/**
 * Order Form Component - Modal form for placing multiple orders
 */

import React, { useState } from 'react'
import { Modal, Button, Select, InputNumber, Message } from '@arco-design/web-react'
import type { OrderDraft, OrderSide } from '../types/order'
import cvectorLogo from '../../../assets/cvector-logo.png'

interface OrderFormProps {
  visible: boolean
  onClose: () => void
  onSubmit: (orders: OrderDraft[]) => Promise<boolean>
  isLoading?: boolean
}

export const OrderForm: React.FC<OrderFormProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [orderRows, setOrderRows] = useState<OrderDraft[]>([
    { id: 'row-1', hour: null, side: 'BUY', price: null, quantity: null }
  ])

  const addOrderRow = (): void => {
    if (orderRows.length >= 10) return
    setOrderRows(prev => [...prev, { 
      id: `row-${prev.length + 1}`, 
      hour: null, 
      side: 'BUY', 
      price: null, 
      quantity: null 
    }])
  }

  const removeOrderRow = (id: string): void => {
    setOrderRows(prev => prev.filter(r => r.id !== id))
  }

  const updateOrderRow = (id: string, updates: Partial<OrderDraft>): void => {
    setOrderRows(prev => prev.map(row => 
      row.id === id ? { ...row, ...updates } : row
    ))
  }

  const handleSubmit = async (): Promise<void> => {
    const validRows = orderRows.filter(r => r.hour !== null && r.price && r.quantity)
    
    if (validRows.length === 0) {
      Message.warning('Please fill at least one complete order')
      return
    }

    const success = await onSubmit(orderRows)
    if (success) {
      // Reset form
      setOrderRows([{ id: 'row-1', hour: null, side: 'BUY', price: null, quantity: null }])
      onClose()
    }
  }

  const handleClose = (): void => {
    setOrderRows([{ id: 'row-1', hour: null, side: 'BUY', price: null, quantity: null }])
    onClose()
  }

  const validOrdersCount = orderRows.filter(r => r.hour !== null && r.price && r.quantity).length
  const totalValue = orderRows
    .filter(r => r.price && r.quantity)
    .reduce((sum, r) => sum + ((r.price || 0) * (r.quantity || 0)), 0)

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <img 
            src={cvectorLogo} 
            alt="CVector" 
            className="h-6"
            style={{ display: "block", margin: "auto" }}
          />
        </div>
      }
      alignCenter={true}
      visible={visible}
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={isLoading}
      okButtonProps={{ 
        className: 'bg-[#F55330] hover:bg-[#E04420] border-[#F55330] w-full sm:w-auto',
        size: 'large'
      }}
      cancelButtonProps={{
        size: 'large',
        className: 'w-full sm:w-auto'
      }}
      className="top-4 sm:top-20"
      style={{ borderRadius: "16px" }}
    >
      <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <span className="text-lg font-bold text-[#66002D]">Place Day-Ahead Orders</span>
        </div>
        
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
          <p className="text-xs sm:text-sm text-[#66002D] font-medium">
            <strong className="text-[#F55330]">Trading Hours:</strong> Orders can be placed for any hour (0-23). 
            Orders will execute automatically when the current UTC time reaches the specified hour.
          </p>
        </div>
        
        {/* Order Rows */}
        {orderRows.map((row, index) => (
          <div key={row.id} className="bg-white border border-slate-200 p-4 sm:p-6 shadow-sm rounded-lg">
            
            {/* Order Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#66002D]">Order #{index + 1}</h3>
              {orderRows.length > 1 && (
                <Button 
                  size="large"
                  onClick={() => removeOrderRow(row.id)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  Remove Order
                </Button>
              )}
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Hour Selection */}
              <div>
                <label className="block text-sm font-bold text-[#66002D] mb-2">Delivery Hour</label>
                <Select
                  placeholder="Select Hour (00-23)"
                  value={row.hour ?? undefined}
                  onChange={(v) => updateOrderRow(row.id, { 
                    hour: typeof v === 'number' ? v : Number(v) 
                  })}
                  className="w-full"
                  size="large"
                  style={{ fontSize: '16px', minHeight: '48px' }}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <Select.Option key={i} value={i}>
                      <span className="text-lg font-mono">{`${i.toString().padStart(2, '0')}:00`}</span>
                      <span className="text-sm text-[#66002D] ml-2">
                        ({i === 0 ? 'Midnight' : i === 12 ? 'Noon' : i < 12 ? `${i} AM` : `${i-12} PM`})
                      </span>
                    </Select.Option>
                  ))}
                </Select>
              </div>
              
              {/* Side Selection */}
              <div>
                <label className="block text-sm font-bold text-[#66002D] mb-2">Order Type</label>
                <Select 
                  value={row.side} 
                  onChange={(v) => updateOrderRow(row.id, { side: v as OrderSide })}
                  className="w-full"
                  size="large"
                  style={{ fontSize: '16px', minHeight: '48px' }}
                >
                  <Select.Option value="BUY">
                    <span className="text-lg font-medium text-green-600">BUY</span>
                    <span className="text-sm text-[#66002D] ml-2">(Purchase Energy)</span>
                  </Select.Option>
                  <Select.Option value="SELL">
                    <span className="text-lg font-medium text-red-600">SELL</span>
                    <span className="text-sm text-[#66002D] ml-2">(Supply Energy)</span>
                  </Select.Option>
                </Select>
              </div>
              
              {/* Price Input */}
              <div>
                <label className="block text-sm font-bold text-[#66002D] mb-2">Bid Price ($/MWh)</label>
                <InputNumber
                  placeholder="Enter price (e.g., 45.50)"
                  min={0.01}
                  max={9999.99}
                  step={0.01}
                  precision={2}
                  value={row.price ?? undefined}
                  onChange={(v) => updateOrderRow(row.id, { 
                    price: typeof v === 'number' ? v : Number(v) 
                  })}
                  className="w-full"
                  size="large"
                  style={{ fontSize: '16px', minHeight: '48px' }}
                />
              </div>
              
              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-bold text-[#66002D] mb-2">Quantity (MWh)</label>
                <InputNumber
                  placeholder="Enter quantity (e.g., 100)"
                  min={1}
                  max={10000}
                  step={1}
                  value={row.quantity ?? undefined}
                  onChange={(v) => updateOrderRow(row.id, { 
                    quantity: typeof v === 'number' ? v : Number(v) 
                  })}
                  className="w-full"
                  size="large"
                  style={{ fontSize: '16px', minHeight: '48px' }}
                />
              </div>
            </div>
            
            {/* Order Summary */}
            {row.hour !== null && row.price && row.quantity && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200">
                <p className="text-sm text-[#66002D]">
                  <strong className="text-[#F55330]">Order Summary:</strong> {row.side} {row.quantity} MWh at ${row.price?.toFixed(2)}/MWh for delivery at {row.hour?.toString().padStart(2, '0')}:00
                  {row.price && row.quantity && (
                    <span className="ml-2 text-[#F55330] font-medium">
                      (Total Value: ${(row.price * row.quantity).toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
        
        {/* Footer Controls */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
            <div className="text-center sm:text-left">
              <div className="text-lg font-bold text-[#66002D] mb-2">
                Order Portfolio Status
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-[#66002D]">
                <span>Total Orders: <strong className="text-black">{orderRows.length}/10</strong></span>
                <span>Valid Orders: <strong className="text-black">{validOrdersCount}</strong></span>
                <span>Total Value: <strong className="text-black">${totalValue.toFixed(2)}</strong></span>
              </div>
            </div>
            <Button 
              onClick={addOrderRow} 
              disabled={orderRows.length >= 10}
              className="text-[#F55330] border-[#F55330] hover:bg-[#F55330] hover:text-white w-full sm:w-auto"
              size="large"
            >
              + Add Another Order
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
