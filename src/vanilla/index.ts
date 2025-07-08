import { BabylonScene } from '../core/babylon-scene'
import { CommandParser } from '../core/command-parser'
import { WebSocketClient } from '../core/websocket-client'

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Get canvas element
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('Canvas element not found!')
    return
  }

  // Initialize Babylon.js scene
  const sceneManager = new BabylonScene(canvas)
  
  // Initialize command parser
  const parser = new CommandParser(sceneManager)
  
  // Initialize WebSocket client
  const enableWebSocket = true // Can be configured
  let wsClient: WebSocketClient | null = null

  // Get UI elements
  const commandInput = document.getElementById('commandInput') as HTMLInputElement
  const sendButton = document.getElementById('sendButton') as HTMLButtonElement
  const output = document.getElementById('output') as HTMLDivElement

  // Function to add log entry
  function addLogEntry(message: string, isError: boolean = false) {
    const entry = document.createElement('div')
    entry.className = `log-entry ${isError ? 'error' : ''}`
    entry.textContent = message
    output.appendChild(entry)
    output.scrollTop = output.scrollHeight
  }

  // Function to handle command
  function handleCommand() {
    const command = commandInput.value.trim()
    if (!command) return

    // Log the command
    addLogEntry(`> ${command}`)

    // Parse and execute
    const result = parser.parseAndExecute(command)
    
    // Log the result
    addLogEntry(result.message, !result.success)

    // Clear input
    commandInput.value = ''
  }

  // Set up event listeners
  sendButton.addEventListener('click', handleCommand)
  commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleCommand()
    }
  })

  // Add some initial help text
  addLogEntry('Babylon.js MCP Test Interface ready!')
  addLogEntry('Try commands like: "create box myBox" or "list"')

  // Set up WebSocket connection if enabled
  if (enableWebSocket) {
    wsClient = new WebSocketClient(sceneManager)
    
    // Add connection status indicator
    const statusDiv = document.createElement('div')
    statusDiv.id = 'ws-status'
    statusDiv.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    `
    
    const statusDot = document.createElement('div')
    statusDot.style.cssText = `
      width: 10px;
      height: 10px;
      border-radius: 50%;
    `
    
    const statusText = document.createElement('span')
    
    statusDiv.appendChild(statusDot)
    statusDiv.appendChild(statusText)
    document.body.appendChild(statusDiv)
    
    // Update status function
    const updateStatus = (connected: boolean) => {
      statusDiv.style.background = connected ? '#e8f5e9' : '#ffebee'
      statusDot.style.background = connected ? '#4CAF50' : '#f44336'
      statusText.textContent = connected ? 'Connected' : 'Disconnected'
    }
    
    // Set up WebSocket event handlers
    wsClient.onConnectionStateChange((connected) => {
      updateStatus(connected)
      addLogEntry(`WebSocket ${connected ? 'connected' : 'disconnected'}`, !connected)
    })
    
    wsClient.onLog((message) => {
      addLogEntry(message)
    })
    
    // Start connection
    updateStatus(false)
    wsClient.connect()
  }

  // Make scene manager available globally for debugging
  (window as any).sceneManager = sceneManager
})