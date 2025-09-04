/**
 * Orders Service - Handles all order-related API calls
 */

import type { BidOrder, OrderDraft } from '../types/order'
import { UserSessionService } from '../../../shared/services/userSession'

export class OrdersService {
  private static readonly BASE_URL = '/api/market-data'

  /**
   * Fetch all bids for the current user
   */
  static async fetchBids(): Promise<BidOrder[]> {
    try {
      const userId = UserSessionService.getUserId()
      const response = await fetch(`${this.BASE_URL}/bids?user_id=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return Array.isArray(data?.bids) ? data.bids : []
    } catch (error) {
      console.error('Failed to fetch bids:', error)
      throw error
    }
  }

  /**
   * Submit a single order
   */
  static async submitOrder(order: OrderDraft): Promise<void> {
    if (!order.hour || !order.price || !order.quantity || !order.side) {
      throw new Error('Invalid order: missing required fields')
    }

    try {
      const userId = UserSessionService.getUserId()
      const response = await fetch(
        `${this.BASE_URL}/bids?hour=${order.hour}&price=${order.price}&quantity=${order.quantity}&side=${order.side}&user_id=${encodeURIComponent(userId)}`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to submit order:', error)
      throw error
    }
  }

  /**
   * Submit multiple orders
   */
  static async submitOrders(orders: OrderDraft[]): Promise<number> {
    const validOrders = orders.filter(order => 
      order.hour !== null && order.price !== null && order.quantity !== null
    )

    if (validOrders.length === 0) {
      throw new Error('No valid orders to submit')
    }

    let successCount = 0
    const errors: string[] = []

    for (const order of validOrders) {
      try {
        await this.submitOrder(order)
        successCount++
      } catch (error) {
        errors.push(`Order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (errors.length > 0 && successCount === 0) {
      throw new Error(`All orders failed: ${errors.join(', ')}`)
    }

    return successCount
  }
}
