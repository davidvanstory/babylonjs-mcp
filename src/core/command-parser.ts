import type { BabylonSceneManager } from './types'

export class CommandParser {
  constructor(private sceneManager: BabylonSceneManager) {}

  parseAndExecute(command: string): { success: boolean; message: string } {
    const parts = command.trim().toLowerCase().split(/\s+/)
    const cmd = parts[0]

    try {
      switch (cmd) {
        case 'create': {
          if (parts.length < 3) {
            return {
              success: false,
              message: 'Usage: create [shape] [name]'
            }
          }
          
          const shape = parts[1]
          const name = parts[2]
          
          if (!['box', 'sphere', 'cylinder', 'cone', 'torus'].includes(shape)) {
            return {
              success: false,
              message: `Invalid shape: ${shape}. Use: box, sphere, cylinder, cone, or torus`
            }
          }
          
          return this.sceneManager.createObject({ 
            shape: shape as any, 
            name 
          })
        }

        case 'delete': {
          if (parts.length < 2) {
            return {
              success: false,
              message: 'Usage: delete [name]'
            }
          }
          
          const name = parts[1]
          return this.sceneManager.deleteObject({ name })
        }

        case 'select': {
          if (parts.length < 2) {
            return {
              success: false,
              message: 'Usage: select [name]'
            }
          }
          
          const name = parts[1]
          return this.sceneManager.selectObject({ name })
        }

        case 'list': {
          const objects = this.sceneManager.listObjects()
          if (objects.length === 0) {
            return {
              success: true,
              message: 'No objects in the scene'
            }
          }
          
          const list = objects.map(obj => 
            `${obj.name} (${obj.type})${obj.selected ? ' [SELECTED]' : ''}`
          ).join(', ')
          
          return {
            success: true,
            message: `Objects: ${list}`
          }
        }

        default:
          return {
            success: false,
            message: `Unknown command: ${cmd}. Use: create, delete, select, or list`
          }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error}`
      }
    }
  }
}