/**
 * Orders Domain Types
 */

export type BidStatus = 'PENDING' | 'EXECUTED' | 'REJECTED'

export type OrderSide = 'BUY' | 'SELL'

export interface BidOrder {
  id: string
  hour: number
  price: number
  quantity: number
  user_id: string
  timestamp: string
  status: BidStatus
  clearing_price?: number
}

export interface OrderDraft {
  id: string
  hour: number | null
  side: OrderSide
  price: number | null
  quantity: number | null
}

export interface OrderSummary {
  totalOrders: number
  executedOrders: number
  pendingOrders: number
  rejectedOrders: number
  totalVolume: number
  averageBidPrice: number
  successRate: number
}
