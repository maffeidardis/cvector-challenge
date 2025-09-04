/**
 * Toaster Component - Centralized toast notification configuration
 * Uses react-hot-toast with custom styling aligned with design system
 */

import { Toaster as HotToaster } from 'react-hot-toast'

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#66002D', // Primary brand color for text
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(102, 0, 45, 0.12)',
          border: '1px solid rgba(102, 0, 45, 0.08)',
          maxWidth: '420px',
          padding: '16px',
        },
        success: {
          style: {
            background: '#fff',
            color: '#27AE60',
            border: '1px solid rgba(39, 174, 96, 0.2)',
            boxShadow: '0 8px 32px rgba(39, 174, 96, 0.12)',
          },
          iconTheme: {
            primary: '#27AE60', // Success green
            secondary: '#fff',
          },
        },
        error: {
          style: {
            background: '#fff',
            color: '#E74C3C',
            border: '1px solid rgba(231, 76, 60, 0.2)',
            boxShadow: '0 8px 32px rgba(231, 76, 60, 0.12)',
          },
          iconTheme: {
            primary: '#E74C3C', // Error red
            secondary: '#fff',
          },
        },
        loading: {
          style: {
            background: '#fff',
            color: '#66002D',
            border: '1px solid rgba(102, 0, 45, 0.2)',
            boxShadow: '0 8px 32px rgba(102, 0, 45, 0.12)',
          },
          iconTheme: {
            primary: '#66002D', // Primary brand color
            secondary: '#fff',
          },
        },
      }}
    />
  )
}

export default Toaster
