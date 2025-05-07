import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import type { Cell, Cell3D } from "../types/Cell"
import type { RGB } from "../types/RGB"
import { pickColors } from "../utils/pickColors"
import { ShaderManager } from "./ShaderManager"

export abstract class Automaton3D {
	protected canvasEl: HTMLCanvasElement
	protected width: number
	protected height: number
	protected cubeDimension: number
	protected readonly halfCubeDimension: number
	protected cellSize: number
	protected cellFilling: number
	protected colors: Cell[]
	protected readonly colorMap: Map<number, Cell>
	protected state: Cell3D[][][]
	protected bufferState: Cell3D[][][]
	private initialRotationSpeed: number
	private rotationDirectionX: number
	private rotationDirectionY: number
	private rotationDirectionZ: number
	protected scene: THREE.Scene
	protected cellGroup: THREE.Group
	protected camera: THREE.PerspectiveCamera
	protected controls: OrbitControls
	private isUserInteracting = false
	protected renderer: THREE.WebGLRenderer
	private animationFrameId?: number
	private animationFrameCount = 0
	protected renderInterval: NodeJS.Timer

	// Shader-based rendering
	private shaderManager: ShaderManager
	private instanceBuffer: THREE.InstancedBufferGeometry
	private instancePositions: Float32Array
	private instanceColors: Float32Array
	private instanceMesh: THREE.Mesh

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		colorsCount: number,
		paletteColors?: RGB[],
	) {
		this.clear()

		this.canvasEl = canvasEl
		this.width = width
		this.height = height
		this.cubeDimension = resolution
		this.cellSize = Math.min(width, height) / resolution / 4
		this.cellFilling = 1.0
		this.colors = pickColors(colorsCount, paletteColors)
		this.state = []
		this.bufferState = []
		this.initialRotationSpeed = 0.0001

		this.halfCubeDimension = this.cubeDimension / 2
		this.colorMap = new Map(this.colors.map((color) => [color.id, color]))

		this.scene = new THREE.Scene()
		this.cellGroup = new THREE.Group()
		this.cellGroup.position.set(0, 0, 0)
		this.scene.add(this.cellGroup)

		this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
		this.camera.position.set(200, 200, 300)
		this.camera.lookAt(0, 0, 0)

		this.renderer = new THREE.WebGLRenderer()
		this.renderer.setSize(this.width, this.height)

		if (this.canvasEl) {
			this.canvasEl.replaceWith(this.renderer.domElement)
		}

		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.controls.enableDamping = true
		this.controls.dampingFactor = 0.05
		this.controls.rotateSpeed = 0.5

		this.controls.addEventListener("start", () => {
			this.isUserInteracting = true
		})

		// Initialize shader manager
		this.shaderManager = new ShaderManager(this.renderer, this.cubeDimension)
		this.shaderManager.createStateTextures()

		// Create instance buffer
		this.initializeInstanceBuffer()

		this.setInitialState()
		this.renderer.render(this.scene, this.camera)
		this.setRandomRotationDirections()
		this.animate()
	}

	private initializeInstanceBuffer(): void {
		// Create base cube geometry
		const geometry = new THREE.BoxGeometry(1, 1, 1)
		this.instanceBuffer = new THREE.InstancedBufferGeometry()
		this.instanceBuffer.setAttribute("position", geometry.getAttribute("position"))
		this.instanceBuffer.setAttribute("normal", geometry.getAttribute("normal"))

		// Create instance data
		const instanceCount = this.cubeDimension * this.cubeDimension * this.cubeDimension
		this.instancePositions = new Float32Array(instanceCount * 3)
		this.instanceColors = new Float32Array(instanceCount * 3)

		// Set up instance attributes
		this.instanceBuffer.setAttribute(
			"instancePosition",
			new THREE.InstancedBufferAttribute(this.instancePositions, 3)
		)
		this.instanceBuffer.setAttribute(
			"instanceColor",
			new THREE.InstancedBufferAttribute(this.instanceColors, 3)
		)

		// Create material with shader
		const material = new THREE.ShaderMaterial({
			vertexShader: this.shaderManager.getVertexShader(),
			fragmentShader: this.shaderManager.getFragmentShader(),
			uniforms: {
				cellSize: { value: this.cellSize },
			},
		})

		// Create instanced mesh
		this.instanceMesh = new THREE.Mesh(this.instanceBuffer, material)
		this.scene.add(this.instanceMesh)
	}

	clear = (): void => {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = undefined
		}

		if (this.renderInterval) {
			clearInterval(this.renderInterval)
		}

		if (this.instanceMesh) {
			this.instanceMesh.geometry.dispose()
			if (this.instanceMesh.material instanceof THREE.Material) {
				this.instanceMesh.material.dispose()
			}
		}

		if (this.scene) {
			this.scene.remove(this.instanceMesh)
		}

		if (this.shaderManager) {
			this.shaderManager.dispose()
		}

		if (this.renderer) {
			this.renderer.dispose()
			const rendererDomElement = this.renderer.domElement
			if (rendererDomElement.parentElement) {
				const newCanvas = document.createElement("canvas")
				newCanvas.id = "canvas"
				rendererDomElement.parentElement.replaceChild(newCanvas, rendererDomElement)
			}
		}
	}

	private setRandomRotationDirections(): void {
		this.rotationDirectionX = Math.random() < 0.5 ? 1 : -1
		this.rotationDirectionY = Math.random() < 0.5 ? 1 : -1
		this.rotationDirectionZ = Math.random() < 0.5 ? 1 : -1
	}

	private animate = (): void => {
		this.animationFrameId = requestAnimationFrame(this.animate)
		this.controls.update()
		this.animationFrameCount++

		if (!this.isUserInteracting) {
			this.instanceMesh.rotation.x += this.initialRotationSpeed * this.rotationDirectionX
			this.instanceMesh.rotation.y += this.initialRotationSpeed * this.rotationDirectionY
			this.instanceMesh.rotation.z += this.initialRotationSpeed * this.rotationDirectionZ
		}

		this.renderer.render(this.scene, this.camera)
	}

	start = (stateUpdatesPerSecond: number): void => {
		if (this.renderInterval) {
			clearInterval(this.renderInterval)
		}

		const intervalMs = 1000 / stateUpdatesPerSecond
		this.renderInterval = setInterval(() => {
			this.update()
		}, intervalMs)
	}

	protected abstract update(): void

	protected setInitialState = (): void => {
		let instanceIndex = 0
		for (let z = 0; z < this.cubeDimension; z++) {
			for (let y = 0; y < this.cubeDimension; y++) {
				for (let x = 0; x < this.cubeDimension; x++) {
					const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)]
					
					// Set instance position
					const posX = (x - this.halfCubeDimension) * this.cellSize
					const posY = (y - this.halfCubeDimension) * this.cellSize
					const posZ = (z - this.halfCubeDimension) * this.cellSize
					
					this.instancePositions[instanceIndex * 3] = posX
					this.instancePositions[instanceIndex * 3 + 1] = posY
					this.instancePositions[instanceIndex * 3 + 2] = posZ
					
					// Set instance color
					this.instanceColors[instanceIndex * 3] = randomColor.colorRgb[0] / 255
					this.instanceColors[instanceIndex * 3 + 1] = randomColor.colorRgb[1] / 255
					this.instanceColors[instanceIndex * 3 + 2] = randomColor.colorRgb[2] / 255
					
					instanceIndex++
				}
			}
		}

		// Update instance buffer attributes
		this.instanceBuffer.attributes.instancePosition.needsUpdate = true
		this.instanceBuffer.attributes.instanceColor.needsUpdate = true

		// Update state texture
		this.shaderManager.updateStateTexture(this.instanceColors)
	}

	protected createCell(
		colorObj: Cell,
		x: number,
		y: number,
		z: number,
		wireframe: boolean,
	): Cell3D {
		const geometry = new THREE.BoxGeometry(
			this.cellSize * this.cellFilling,
			this.cellSize * this.cellFilling,
			this.cellSize * this.cellFilling,
		)

		const material = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0.1,
			depthWrite: false,
		})

		const mesh = new THREE.Mesh(geometry, material)

		if (wireframe) {
			const wireframeGeometry = new THREE.EdgesGeometry(geometry)
			const wireframeMaterial = new THREE.LineBasicMaterial({
				color: 0xffffff,
				transparent: true,
				opacity: 0.2,
			})
			const wireframe = new THREE.LineSegments(
				wireframeGeometry,
				wireframeMaterial,
			)
			mesh.add(wireframe)
		}

		this.updateCellColor(mesh, colorObj.colorRgb)

		const posX = (x - this.halfCubeDimension) * this.cellSize
		const posY = (y - this.halfCubeDimension) * this.cellSize
		const posZ = (z - this.halfCubeDimension) * this.cellSize

		mesh.position.set(posX, posY, posZ)
		this.cellGroup.add(mesh)

		return {
			...colorObj,
			mesh,
		}
	}

	protected updateCellColor(mesh: THREE.Mesh, colorRgb: number[]): void {
		if (mesh.material instanceof THREE.Material) {
			const r = colorRgb[0] / 255
			const g = colorRgb[1] / 255
			const b = colorRgb[2] / 255
			mesh.material.color.setRGB(r, g, b)
		}
	}

	protected getCellColor(x: number, y: number, z: number): Cell {
		const modifiedX = (x + this.cubeDimension) % this.cubeDimension
		const modifiedY = (y + this.cubeDimension) % this.cubeDimension
		const modifiedZ = (z + this.cubeDimension) % this.cubeDimension
		return this.state[modifiedZ][modifiedY][modifiedX]
	}
}
