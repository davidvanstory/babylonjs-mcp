import {
  Scene,
  Engine,
  UniversalCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  AbstractMesh,
  Mesh,
  HighlightLayer,
  Color4
} from '@babylonjs/core'
import type { 
  BabylonSceneManager, 
  CreateObjectParams, 
  DeleteObjectParams, 
  SelectObjectParams, 
  MCPResponse,
  SceneObject,
  Shape 
} from './types'

export class BabylonScene implements BabylonSceneManager {
  private engine: Engine
  private scene: Scene
  private camera: UniversalCamera
  private selectedMesh: AbstractMesh | null = null
  private highlightLayer: HighlightLayer
  private meshCounter: number = 0

  constructor(canvas: HTMLCanvasElement) {
    // Initialize Babylon.js engine and scene
    this.engine = new Engine(canvas, true)
    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.9, 0.9, 0.9, 1)

    // Create camera
    this.camera = new UniversalCamera('camera', new Vector3(0, 5, -10), this.scene)
    this.camera.setTarget(Vector3.Zero())
    this.camera.attachControl(canvas, true)

    // Create lights
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene)
    light.intensity = 0.7

    // Create highlight layer for selection
    this.highlightLayer = new HighlightLayer('highlight', this.scene)

    // Create ground
    const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, this.scene)
    const groundMaterial = new StandardMaterial('groundMat', this.scene)
    groundMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8)
    ground.material = groundMaterial
    ground.isPickable = false

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize()
    })

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render()
    })

    // Enable clicking on meshes
    this.setupMeshInteraction()
  }

  private setupMeshInteraction(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === 16) { // POINTERPICK
        const pickedMesh = pointerInfo.pickInfo?.pickedMesh
        if (pickedMesh && pickedMesh.name !== 'ground') {
          this.selectObjectByMesh(pickedMesh as AbstractMesh)
        }
      }
    })
  }

  createObject(params: CreateObjectParams): MCPResponse {
    try {
      let mesh: AbstractMesh

      // Create mesh based on shape
      switch (params.shape) {
        case 'box':
          mesh = MeshBuilder.CreateBox(params.name, { size: params.size || 1 }, this.scene)
          break
        case 'sphere':
          mesh = MeshBuilder.CreateSphere(params.name, { diameter: params.size || 1 }, this.scene)
          break
        case 'cylinder':
          mesh = MeshBuilder.CreateCylinder(params.name, { 
            height: params.size || 2, 
            diameter: params.size || 1 
          }, this.scene)
          break
        case 'cone':
          mesh = MeshBuilder.CreateCylinder(params.name, { 
            height: params.size || 2, 
            diameterTop: 0,
            diameterBottom: params.size || 1 
          }, this.scene)
          break
        case 'torus':
          mesh = MeshBuilder.CreateTorus(params.name, { 
            diameter: params.size || 1,
            thickness: (params.size || 1) * 0.3 
          }, this.scene)
          break
        default:
          return {
            success: false,
            message: `Unknown shape: ${params.shape}`
          }
      }

      // Set position
      if (params.position) {
        mesh.position = new Vector3(params.position.x, params.position.y, params.position.z)
      } else {
        // Random position if not specified
        mesh.position = new Vector3(
          (Math.random() - 0.5) * 8,
          (params.size || 1) / 2,
          (Math.random() - 0.5) * 8
        )
      }

      // Create material
      const material = new StandardMaterial(`${params.name}_material`, this.scene)
      if (params.color) {
        material.diffuseColor = new Color3(params.color.r, params.color.g, params.color.b)
      } else {
        // Random color if not specified
        material.diffuseColor = new Color3(Math.random(), Math.random(), Math.random())
      }
      mesh.material = material

      // Store shape type as metadata
      mesh.metadata = { shape: params.shape }

      // Make it pickable
      mesh.isPickable = true

      this.meshCounter++

      return {
        success: true,
        message: `Created ${params.shape} named "${params.name}"`
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to create object: ${error}`
      }
    }
  }

  deleteObject(params: DeleteObjectParams): MCPResponse {
    try {
      const mesh = this.scene.getMeshByName(params.name)
      if (!mesh) {
        return {
          success: false,
          message: `Object "${params.name}" not found`
        }
      }

      // Remove from selection if selected
      if (this.selectedMesh === mesh) {
        this.highlightLayer.removeMesh(mesh as Mesh)
        this.selectedMesh = null
      }

      mesh.dispose()

      return {
        success: true,
        message: `Deleted object "${params.name}"`
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete object: ${error}`
      }
    }
  }

  selectObject(params: SelectObjectParams): MCPResponse {
    try {
      const mesh = this.scene.getMeshByName(params.name)
      if (!mesh || mesh.name === 'ground') {
        return {
          success: false,
          message: `Object "${params.name}" not found`
        }
      }

      this.selectObjectByMesh(mesh as AbstractMesh)

      return {
        success: true,
        message: `Selected object "${params.name}"`
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to select object: ${error}`
      }
    }
  }

  private selectObjectByMesh(mesh: AbstractMesh): void {
    // Clear previous selection
    if (this.selectedMesh) {
      this.highlightLayer.removeMesh(this.selectedMesh as Mesh)
    }

    // Highlight new selection
    this.selectedMesh = mesh
    this.highlightLayer.addMesh(mesh as Mesh, Color3.Green())
  }

  listObjects(): SceneObject[] {
    const objects: SceneObject[] = []
    
    this.scene.meshes.forEach(mesh => {
      if (mesh.name !== 'ground' && mesh.name !== 'camera') {
        objects.push({
          name: mesh.name,
          type: (mesh.metadata?.shape || 'unknown') as Shape,
          position: {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z
          },
          selected: mesh === this.selectedMesh
        })
      }
    })

    return objects
  }

  getSelectedObject(): AbstractMesh | null {
    return this.selectedMesh
  }

  dispose(): void {
    this.engine.dispose()
  }
}