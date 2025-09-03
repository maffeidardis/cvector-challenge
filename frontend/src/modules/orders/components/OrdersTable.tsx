/**
 * Orders Table Component - Pure UI component for displaying orders
 */

import React from 'react'
import { Table, Tag, Card } from '@arco-design/web-react'
import type { BidOrder, BidStatus, OrderSummary } from '../types/order'

interface OrdersTableProps {
  orders: BidOrder[]
  summary: OrderSummary
  isLoading?: boolean
}

export const OrdersTable: React.FC<OrdersTableProps> = ({ 
  orders, 
  summary, 
  isLoading = false 
}) => {
  const statusConfig = {
    'EXECUTED': { color: 'green', text: 'Exec' },
    'PENDING': { color: 'orange', text: 'Pend' },
    'REJECTED': { color: 'red', text: 'Rej' }
  }

  const columns = [
    { 
      title: <span className="font-bold text-[#66002D]">Hour</span>, 
      dataIndex: 'hour',
      width: 70,
      render: (hour: number) => (
        <span className="font-mono text-xs sm:text-sm text-black">
          {hour.toString().padStart(2, '0')}:00
        </span>
      )
    },
    { 
      title: <span className="font-bold text-[#66002D]">Bid Price</span>, 
      dataIndex: 'price',
      width: 100,
      render: (price: number) => (
        <span className="font-mono text-xs sm:text-sm text-black">
          ${Number(price).toFixed(2)}
        </span>
      )
    },
    { 
      title: <span className="font-bold text-[#66002D]">Clearing</span>, 
      dataIndex: 'clearing_price',
      width: 100,
      render: (clearingPrice: number | undefined) => 
        clearingPrice ? (
          <span className="font-mono text-xs sm:text-sm text-black">
            ${Number(clearingPrice).toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-400 text-xs sm:text-sm">-</span>
        )
    },
    { 
      title: <span className="font-bold text-[#66002D]">Qty</span>, 
      dataIndex: 'quantity',
      width: 80,
      render: (quantity: number) => (
        <span className="font-mono text-xs sm:text-sm text-black">
          {quantity} MWh
        </span>
      )
    },
    { 
      title: <span className="font-bold text-[#66002D]">Status</span>, 
      dataIndex: 'status',
      width: 90,
      render: (status: BidStatus) => {
        const config = statusConfig[status]
        return (
          <Tag color={config.color} className="text-xs">
            {config.text}
          </Tag>
        )
      }
    },
  ]

  return (
    <Card 
      style={{ borderRadius: "16px" }}
      title={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <span className="text-[#66002D] font-bold text-base sm:text-lg">Order Book</span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <span className="text-green-600 font-medium">● {summary.executedOrders} Executed</span>
            <span className="text-[#F55330] font-medium">● {summary.pendingOrders} Pending</span>
            <span className="text-red-600 font-medium">● {summary.rejectedOrders} Rejected</span>
          </div>
        </div>
      }
      className="border-0 shadow-sm"
    >
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          data={orders}
          loading={isLoading}
          pagination={false}
          scroll={{ y: 250, x: 400 }}
          size="small"
        />
      </div>
    </Card>
  )
}
