import React, { useEffect, useRef, useState } from 'react'
import { BabylonScene } from '../core/babylon-scene'
import { CommandParser } from '../core/command-parser'
import { WebSocketClient } from '../core/websocket-client'
import type { BabylonSceneManager } from '../core/types'

interface BabylonMCPProps {
  onSceneReady?: (scene: BabylonSceneManager) => void
  className?: string
  style?: React.CSSProperties
  enableWebSocket?: boolean
  webSocketUrl?: string
}

export const BabylonMCP: React.FC<BabylonMCPProps> = ({ 
  onSceneReady, 
  className,
  style,
  enableWebSocket = false,
  webSocketUrl
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneManagerRef = useRef<BabylonScene | null>(null)
  const wsClientRef = useRef<WebSocketClient | null>(null)
  const [commandInput, setCommandInput] = useState('')
  const [logs, setLogs] = useState<Array<{ message: string; isError: boolean }>>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize Babylon.js scene
    const sceneManager = new BabylonScene(canvasRef.current)
    sceneManagerRef.current = sceneManager

    // Notify parent component
    if (onSceneReady) {
      onSceneReady(sceneManager)
    }

    // Add initial log
    setLogs([
      { message: 'Babylon.js MCP ready!', isError: false },
      { message: 'Try commands like: "create box myBox" or "list"', isError: false }
    ])

    // Initialize WebSocket client if enabled
    if (enableWebSocket) {
      const wsClient = new WebSocketClient(sceneManager, { url: webSocketUrl })
      wsClientRef.current = wsClient

      // Set up WebSocket event handlers
      wsClient.onConnectionStateChange((connected) => {
        setIsConnected(connected)
        addLog(`WebSocket ${connected ? 'connected' : 'disconnected'}`, !connected)
      })

      wsClient.onLog((message) => {
        addLog(message, false)
      })

      // Connect to WebSocket
      wsClient.connect()
    }

    // Cleanup
    return () => {
      wsClientRef.current?.disconnect()
      sceneManager.dispose()
    }
  }, [onSceneReady, enableWebSocket, webSocketUrl])

  const addLog = (message: string, isError: boolean = false) => {
    setLogs(prev => [...prev, { message, isError }])
  }

  const handleCommand = () => {
    if (!sceneManagerRef.current || !commandInput.trim()) return

    const parser = new CommandParser(sceneManagerRef.current)
    
    // Add command to logs
    addLog(`> ${commandInput}`, false)
    
    // Execute command locally
    const result = parser.parseAndExecute(commandInput)
    
    // Add result to logs
    addLog(result.message, !result.success)
    
    // Clear input
    setCommandInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand()
    }
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%', ...style }}>
      <canvas 
        ref={canvasRef}
        style={{ flex: 1, width: '100%', touchAction: 'none' }}
      />
      
      <div style={{ 
        background: '#f0f0f0', 
        padding: '20px', 
        borderTop: '1px solid #ccc' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Babylon.js MCP Commands</h3>
          {enableWebSocket && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 10px',
              background: isConnected ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isConnected ? '#4CAF50' : '#f44336'
              }} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command (e.g., 'create box myBox')"
            style={{
              width: '70%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={handleCommand}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            Send
          </button>
        </div>
        
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                margin: '5px 0',
                padding: '5px',
                borderLeft: `3px solid ${log.isError ? '#f44336' : '#4CAF50'}`,
                background: log.isError ? '#ffebee' : '#f9f9f9'
              }}
            >
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Export a hook for programmatic control
export const useBabylonMCP = (sceneManager: BabylonSceneManager | null) => {
  const parser = sceneManager ? new CommandParser(sceneManager) : null

  const executeCommand = (command: string) => {
    if (!parser) {
      return { success: false, message: 'Scene not initialized' }
    }
    return parser.parseAndExecute(command)
  }

  return { executeCommand }
}