import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import type { Cell } from "../types/Cell"
import type { RGB } from "../types/RGB"
import { pickColors } from "../utils/pickColors"

export abstract class Automaton3D {
	protected canvasEl: HTMLCanvasElement
	protected width: number
	protected height: number
	protected cubeDimension: number
	protected cellSize: number
	protected colors: Cell[]
	protected halfCubeDimension: number
	protected colorMap: Map<number, Cell>
	protected scene: THREE.Scene
	protected camera: THREE.PerspectiveCamera
	protected renderer: THREE.WebGLRenderer
	protected instanceMesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
	protected state: Cell[][][]
	protected controls: OrbitControls
	protected renderInterval: NodeJS.Timeout | null

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		colorsCount: number,
		paletteColors?: RGB[],
	) {
		this.canvasEl = canvasEl
		this.width = width
		this.height = height
		this.cubeDimension = resolution
		this.cellSize = Math.min(width, height) / resolution / 6
		this.colors = pickColors(colorsCount, paletteColors)
		this.halfCubeDimension = this.cubeDimension / 2
		this.colorMap = new Map(this.colors.map((color) => [color.id, color]))
		
		// Initialize state array
		this.state = Array(this.cubeDimension).fill(null).map(() =>
			Array(this.cubeDimension).fill(null).map(() =>
				Array(this.cubeDimension).fill(null)
			)
		)

		// Basic scene setup
		this.scene = new THREE.Scene()
		this.scene.background = new THREE.Color(0x000000)
		
		// Calculate camera distance based on cube size
		const totalSize = this.cubeDimension * this.cellSize
		
		this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
		this.camera.position.set(200, 200, 300)
		this.camera.lookAt(0, 0, 0)

		// Initialize renderer
		this.renderer = new THREE.WebGLRenderer({ 
			antialias: true,
			alpha: true
		})
		this.renderer.setSize(this.width, this.height)
		this.renderer.setClearColor(0x000000, 0)

		if (this.canvasEl) {
			this.canvasEl.replaceWith(this.renderer.domElement)
		}

		// Add orbit controls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.controls.enableDamping = true
		this.controls.dampingFactor = 0.05
		this.controls.rotateSpeed = 0.5
		this.controls.autoRotate = true
		this.controls.autoRotateSpeed = 1.0

		// Initialize the cube
		this.initializeCube()
		this.setInitialState()

		// Start animation loop
		this.animate()
	}

	private initializeCube(): void {
		// Create base cube geometry
		const geometry = new THREE.BoxGeometry(this.cellSize, this.cellSize, this.cellSize)
		
		// Set vertex colors for the base geometry
		const colors = new Float32Array(geometry.attributes.position.count * 3)
		for (let i = 0; i < colors.length; i += 3) {
			colors[i] = 1     // R
			colors[i + 1] = 1 // G
			colors[i + 2] = 1 // B
		}
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

		const material = new THREE.MeshBasicMaterial({
			vertexColors: true,
			transparent: true,
			opacity: 0.4
		})

		// Create instance data
		const instanceCount = this.cubeDimension * this.cubeDimension * this.cubeDimension
		this.instanceMesh = new THREE.InstancedMesh(geometry, material, instanceCount)
		this.scene.add(this.instanceMesh)
	}

	private setInitialState(): void {
		const instanceCount = this.cubeDimension * this.cubeDimension * this.cubeDimension
		let instanceIndex = 0

		for (let x = 0; x < this.cubeDimension; x++) {
			for (let y = 0; y < this.cubeDimension; y++) {
				for (let z = 0; z < this.cubeDimension; z++) {
					const color = this.colors[Math.floor(Math.random() * this.colors.length)]
					const spacing = this.cellSize * 1.2 // Add 20% spacing between cells
					const position = new THREE.Vector3(
						(x - this.halfCubeDimension) * spacing,
						(y - this.halfCubeDimension) * spacing,
						(z - this.halfCubeDimension) * spacing
					)

					// Set instance matrix
					const matrix = new THREE.Matrix4()
					matrix.makeTranslation(position.x, position.y, position.z)
					this.instanceMesh.setMatrixAt(instanceIndex, matrix)

					// Set instance color
					const colorVector = new THREE.Color()
					colorVector.setRGB(
						color.colorRgb[0] / 255,
						color.colorRgb[1] / 255,
						color.colorRgb[2] / 255
					)
					this.instanceMesh.setColorAt(instanceIndex, colorVector)

					// Initialize state array
					this.state[z][y][x] = color

					instanceIndex++
				}
			}
		}

		// Update instance buffer attributes
		this.instanceMesh.instanceMatrix.needsUpdate = true
		if (this.instanceMesh.instanceColor) {
			this.instanceMesh.instanceColor.needsUpdate = true
		}

		this.renderer.render(this.scene, this.camera)
	}

	private animate(): void {
		requestAnimationFrame(this.animate.bind(this))
		this.controls.update()
		this.renderer.render(this.scene, this.camera)
	}

	public clear(): void {
		if (this.controls) {
			this.controls.dispose()
		}

		if (this.instanceMesh) {
			this.instanceMesh.geometry.dispose()
			this.instanceMesh.material.dispose()
			this.scene.remove(this.instanceMesh)
		}

		if (this.renderer) {
			this.renderer.dispose()
			this.renderer.forceContextLoss()
			this.renderer.domElement.remove()
		}

		// Clear scene
		while(this.scene.children.length > 0) { 
			const object = this.scene.children[0]
			this.scene.remove(object)
			if (object instanceof THREE.Mesh) {
				object.geometry.dispose()
				if (object.material instanceof THREE.Material) {
					object.material.dispose()
				}
			}
		}
	}

	start = (stateUpdatesPerSecond: number): void => {
		// Clear any existing interval
		if (this.renderInterval) {
			clearInterval(this.renderInterval)
		}

		// Set up periodic updates
		const intervalMs = 1000 / stateUpdatesPerSecond
		this.renderInterval = setInterval(() => {
			this.update()
		}, intervalMs)
	}

	protected abstract update(): void

	protected getCellColor(x: number, y: number, z: number): Cell {
		const modifiedX = (x + this.cubeDimension) % this.cubeDimension
		const modifiedY = (y + this.cubeDimension) % this.cubeDimension
		const modifiedZ = (z + this.cubeDimension) % this.cubeDimension
		return this.state[modifiedZ][modifiedY][modifiedX]
	}
}
