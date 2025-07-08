#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { WebSocketServer, WebSocket } from 'ws'
import type { Shape } from './core/types.js'

interface SceneState {
  objects: Array<{
    name: string
    type: Shape
    position: { x: number; y: number; z: number }
    selected: boolean
  }>
}

class BabylonMCPServer {
  private server: Server
  private wss: WebSocketServer
  private connectedClients: Set<WebSocket> = new Set()
  private sceneState: SceneState = { objects: [] }
  private pendingResponses: Map<string, (result: any) => void> = new Map()

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'babylonjs-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    // Initialize WebSocket server
    this.wss = new WebSocketServer({ port: 8080 })
    this.setupWebSocketServer()
    this.setupMCPHandlers()
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.error('Browser client connected')
      this.connectedClients.add(ws)

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleBrowserMessage(message)
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      })

      ws.on('close', () => {
        console.error('Browser client disconnected')
        this.connectedClients.delete(ws)
      })

      // Send initial state
      ws.send(JSON.stringify({
        type: 'init',
        state: this.sceneState
      }))
    })

    console.error('WebSocket server listening on ws://localhost:8080')
  }

  private handleBrowserMessage(message: any): void {
    switch (message.type) {
      case 'response':
        // Handle response from browser
        const resolver = this.pendingResponses.get(message.id)
        if (resolver) {
          resolver(message.result)
          this.pendingResponses.delete(message.id)
        }
        break

      case 'state_update':
        // Update local scene state
        this.sceneState = message.state
        break

      default:
        console.error('Unknown message type:', message.type)
    }
  }

  private async sendCommandToBrowser(command: string, params: any): Promise<any> {
    if (this.connectedClients.size === 0) {
      throw new Error('No browser clients connected. Please open the Babylon.js scene in a browser.')
    }

    const id = Math.random().toString(36).substring(7)
    const message = {
      id,
      type: 'command',
      command,
      params
    }

    return new Promise((resolve, reject) => {
      // Store the resolver
      this.pendingResponses.set(id, resolve)

      // Send to all connected clients
      for (const client of this.connectedClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message))
        }
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingResponses.has(id)) {
          this.pendingResponses.delete(id)
          reject(new Error('Command timeout'))
        }
      }, 5000)
    })
  }

  private setupMCPHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_object',
          description: 'Create a 3D object in the Babylon.js scene',
          inputSchema: {
            type: 'object',
            properties: {
              shape: {
                type: 'string',
                enum: ['box', 'sphere', 'cylinder', 'cone', 'torus'],
                description: 'The shape of the object to create',
              },
              name: {
                type: 'string',
                description: 'Unique name for the object',
              },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  z: { type: 'number' },
                },
                description: 'Position of the object (optional)',
              },
              size: {
                type: 'number',
                description: 'Size of the object (optional, default: 1)',
              },
              color: {
                type: 'object',
                properties: {
                  r: { type: 'number', minimum: 0, maximum: 1 },
                  g: { type: 'number', minimum: 0, maximum: 1 },
                  b: { type: 'number', minimum: 0, maximum: 1 },
                },
                description: 'RGB color values (0-1 range, optional)',
              },
            },
            required: ['shape', 'name'],
          },
        },
        {
          name: 'delete_object',
          description: 'Delete a 3D object from the scene',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the object to delete',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'select_object',
          description: 'Select a 3D object in the scene',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the object to select',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'list_objects',
          description: 'List all objects in the scene',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }))

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        const result = await this.sendCommandToBrowser(name, args)
        
        return {
          content: [
            {
              type: 'text',
              text: result.message || 'Command executed successfully',
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error}`,
            },
          ],
        }
      }
    })
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Babylon.js MCP Server running')
    console.error('Waiting for browser connections on ws://localhost:8080')
  }
}

// Start the server
const server = new BabylonMCPServer()
server.start().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})