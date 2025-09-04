/**
 * Orders Hook - Manages order state and operations
 */

import { useState, useCallback } from 'react'
import type { BidOrder, OrderDraft, OrderSummary } from '../types/order'
import { OrdersService } from '../services/ordersService'

export function useOrders() {
  const [orders, setOrders] = useState<BidOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch orders from the API
   */
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const fetchedOrders = await OrdersService.fetchBids()
      setOrders(fetchedOrders)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders'
      setError(errorMessage)
      console.error('Error fetching orders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Submit multiple orders
   */
  const submitOrders = useCallback(async (orderDrafts: OrderDraft[]): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      //const successCount = await OrdersService.submitOrders(orderDrafts)
      
      // Refresh orders after submission
      await fetchOrders()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit orders'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [fetchOrders])

  /**
   * Calculate order summary statistics
   */
  const getOrderSummary = useCallback((): OrderSummary => {
    const executedOrders = orders.filter(order => order.status === 'EXECUTED').length
    const pendingOrders = orders.filter(order => order.status === 'PENDING').length
    const rejectedOrders = orders.filter(order => order.status === 'REJECTED').length
    const totalVolume = orders.reduce((sum, order) => sum + order.quantity, 0)
    const averageBidPrice = orders.length > 0 
      ? orders.reduce((sum, order) => sum + order.price, 0) / orders.length 
      : 0
    const successRate = orders.length > 0 ? Math.round((executedOrders / orders.length) * 100) : 0

    return {
      totalOrders: orders.length,
      executedOrders,
      pendingOrders,
      rejectedOrders,
      totalVolume,
      averageBidPrice,
      successRate
    }
  }, [orders])

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    submitOrders,
    getOrderSummary
  }
}
