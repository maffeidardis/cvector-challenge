/**
 * User Session Service - Simple UUID-based user identification
 * Stores user ID in localStorage for persistence across sessions
 */

import { v4 as uuidv4 } from 'uuid'

const USER_ID_KEY = 'cvector_user_id'
const USER_NAME_KEY = 'cvector_user_name'

export class UserSessionService {
  private static _userId: string | null = null
  private static _userName: string | null = null

  /**
   * Get current user ID, create one if doesn't exist
   */
  static getUserId(): string {
    if (this._userId) {
      return this._userId
    }

    // Try to get from localStorage first
    const storedUserId = localStorage.getItem(USER_ID_KEY)
    if (storedUserId) {
      this._userId = storedUserId
      return storedUserId
    }

    // Generate new UUID if none exists
    const newUserId = uuidv4()
    this._userId = newUserId
    localStorage.setItem(USER_ID_KEY, newUserId)
    
    console.log('Generated new user ID:', newUserId)
    return newUserId
  }

  /**
   * Get user display name (for UI purposes)
   */
  static getUserName(): string {
    if (this._userName) {
      return this._userName
    }

    const storedUserName = localStorage.getItem(USER_NAME_KEY)
    if (storedUserName) {
      this._userName = storedUserName
      return storedUserName
    }

    // Generate a friendly name based on UUID
    const userId = this.getUserId()
    const shortId = userId.slice(0, 8)
    const userName = `Trader-${shortId}`
    
    this._userName = userName
    localStorage.setItem(USER_NAME_KEY, userName)
    
    return userName
  }

  /**
   * Set custom user name (optional)
   */
  static setUserName(name: string): void {
    this._userName = name
    localStorage.setItem(USER_NAME_KEY, name)
  }

  /**
   * Clear user session (for testing/reset purposes)
   */
  static clearSession(): void {
    this._userId = null
    this._userName = null
    localStorage.removeItem(USER_ID_KEY)
    localStorage.removeItem(USER_NAME_KEY)
    console.log('User session cleared')
  }

  /**
   * Get session info for display
   */
  static getSessionInfo(): { userId: string; userName: string } {
    return {
      userId: this.getUserId(),
      userName: this.getUserName()
    }
  }
}
