/**
 * socket.js
 * Socket.IO client service for the ChessMate application.
 *
 * Usage:
 *   import socket, { connectSocket, disconnectSocket, emitEvent, onEvent, offEvent } from './socket'
 *
 *   connectSocket()          — establish the connection
 *   disconnectSocket()       — cleanly close the connection
 *   emitEvent('move', data)  — send an event to the server
 *   onEvent('move', handler) — subscribe to a server event
 *   offEvent('move', handler)— unsubscribe from a server event
 */

import { io } from 'socket.io-client'

// ---------------------------------------------------------------------------
// Determine the server URL.
// In development the Vite proxy forwards /socket.io → localhost:5000, so we
// connect to '/' (relative).  An explicit VITE_SERVER_URL env var overrides
// this for production or Docker deployments.
// ---------------------------------------------------------------------------
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '/'

// ---------------------------------------------------------------------------
// Create the socket instance (NOT auto-connected – call connectSocket() when ready)
// ---------------------------------------------------------------------------
const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
})

// ---------------------------------------------------------------------------
// Optional debug logging in development
// ---------------------------------------------------------------------------
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('[Socket] Connected — id:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected — reason:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`[Socket] Reconnect attempt #${attempt}`)
  })

  socket.on('reconnect', (attempt) => {
    console.log(`[Socket] Reconnected after ${attempt} attempt(s)`)
  })

  socket.on('reconnect_failed', () => {
    console.error('[Socket] Reconnection failed after maximum attempts')
  })
}

// ---------------------------------------------------------------------------
// Helper: connectSocket
// Establishes the socket connection (idempotent – safe to call multiple times)
// ---------------------------------------------------------------------------
export function connectSocket() {
  if (!socket.connected) {
    socket.connect()
  }
}

// ---------------------------------------------------------------------------
// Helper: disconnectSocket
// Cleanly closes the socket connection
// ---------------------------------------------------------------------------
export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}

// ---------------------------------------------------------------------------
// Helper: emitEvent
// Sends an event with an optional payload to the server.
// Returns a Promise that resolves with the server acknowledgement (if any).
//
// @param {string} event — Socket.IO event name
// @param {*}      data  — Payload to send (can be any serialisable value)
// @returns {Promise<*>}
// ---------------------------------------------------------------------------
export function emitEvent(event, data) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error(`[Socket] Cannot emit "${event}" — socket is not connected`))
      return
    }

    socket.emit(event, data, (ack) => {
      if (ack && ack.error) {
        reject(new Error(ack.error))
      } else {
        resolve(ack)
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Helper: onEvent
// Subscribes a callback to a socket event.
//
// @param {string}   event    — Socket.IO event name
// @param {Function} callback — Handler function (receives the event payload)
// ---------------------------------------------------------------------------
export function onEvent(event, callback) {
  socket.on(event, callback)
}

// ---------------------------------------------------------------------------
// Helper: offEvent
// Unsubscribes a previously registered callback from a socket event.
// If no callback is provided, ALL listeners for that event are removed.
//
// @param {string}    event    — Socket.IO event name
// @param {Function} [callback] — The specific handler to remove
// ---------------------------------------------------------------------------
export function offEvent(event, callback) {
  if (callback) {
    socket.off(event, callback)
  } else {
    socket.removeAllListeners(event)
  }
}

// ---------------------------------------------------------------------------
// Default export — the raw socket instance (for direct use if needed)
// ---------------------------------------------------------------------------
export default socket
