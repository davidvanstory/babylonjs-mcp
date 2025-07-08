import type { AbstractMesh } from '@babylonjs/core'

export type Shape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus'

export interface CreateObjectParams {
  shape: Shape
  name: string
  position?: { x: number; y: number; z: number }
  size?: number
  color?: { r: number; g: number; b: number }
}

export interface DeleteObjectParams {
  name: string
}

export interface SelectObjectParams {
  name: string
}

export interface SceneObject {
  name: string
  type: Shape
  position: { x: number; y: number; z: number }
  selected: boolean
}

export interface MCPResponse {
  success: boolean
  message: string
  data?: any
}

export interface BabylonSceneManager {
  createObject(params: CreateObjectParams): MCPResponse
  deleteObject(params: DeleteObjectParams): MCPResponse
  selectObject(params: SelectObjectParams): MCPResponse
  listObjects(): SceneObject[]
  getSelectedObject(): AbstractMesh | null
}