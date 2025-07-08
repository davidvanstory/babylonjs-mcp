import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { BabylonSceneManager, Shape } from './types'

export class BabylonMCPServer {
  private server: Server
  private sceneManager: BabylonSceneManager | null = null

  constructor() {
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

    this.setupHandlers()
  }

  setSceneManager(sceneManager: BabylonSceneManager): void {
    this.sceneManager = sceneManager
  }

  private setupHandlers(): void {
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
      if (!this.sceneManager) {
        throw new Error('Scene manager not initialized')
      }

      const { name, arguments: args } = request.params

      if (!args) {
        throw new Error('Missing arguments')
      }

      switch (name) {
        case 'create_object': {
          const result = this.sceneManager.createObject({
            shape: args.shape as Shape,
            name: args.name as string,
            position: args.position as { x: number; y: number; z: number },
            size: args.size as number,
            color: args.color as { r: number; g: number; b: number },
          })
          return {
            content: [
              {
                type: 'text',
                text: result.message,
              },
            ],
          }
        }

        case 'delete_object': {
          const result = this.sceneManager.deleteObject({
            name: args.name as string,
          })
          return {
            content: [
              {
                type: 'text',
                text: result.message,
              },
            ],
          }
        }

        case 'select_object': {
          const result = this.sceneManager.selectObject({
            name: args.name as string,
          })
          return {
            content: [
              {
                type: 'text',
                text: result.message,
              },
            ],
          }
        }

        case 'list_objects': {
          const objects = this.sceneManager.listObjects()
          const text = objects.length === 0
            ? 'No objects in the scene'
            : 'Objects in scene:\n' + objects.map(obj => 
                `- ${obj.name} (${obj.type}) at (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})${obj.selected ? ' [SELECTED]' : ''}`
              ).join('\n')
          
          return {
            content: [
              {
                type: 'text',
                text,
              },
            ],
          }
        }

        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    })
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
  }
}