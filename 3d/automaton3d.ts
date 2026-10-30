import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import type { Cell } from "../types/Cell"
import type { RGB } from "../types/RGB"
import { pickColors } from "../utils/pickColors"

export abstract class Automaton3D {
	protected canvasEl: HTMLCanvasElement
	protected width: number
	protected height: number
	protected cubeDimension: number
	protected readonly halfCubeDimension: number
	protected cellSize: number
	protected cellFilling: number
	protected colors: Cell[]
	/** Color id per cell, flat: index = x + y * N + z * N². */
	protected state!: Uint8Array
	/** Next state, written by update() then swapped in by commitState(). */
	protected bufferState!: Uint8Array
	/** Color per id in the renderer's working color space, three floats per id. */
	private readonly paletteRgb: Float32Array
	/** 1 when cells of that color id are drawn, from isVisible(). */
	private readonly visibleById: Uint8Array
	/** True when every color id is drawn: instances then map one to one to cells. */
	private readonly allVisible: boolean
	/** Translation of each cell, three floats per cell, used to pack visible cells. */
	private positions!: Float32Array
	private initialRotationSpeed: number
	private rotationDirectionX: number
	private rotationDirectionY: number
	private rotationDirectionZ: number
	protected scene: THREE.Scene
	protected cellGroup: THREE.Group
	/** One instance per drawn cell: a single draw call for the whole cube. */
	protected cells!: THREE.InstancedMesh
	protected camera: THREE.PerspectiveCamera
	protected controls: OrbitControls
	private isUserInteracting = false
	protected renderer: THREE.WebGLRenderer
	private animationFrameId?: number
	private animationFrameCount = 0
	renderInterval: NodeJS.Timeout

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
		this.initialRotationSpeed = 0.0001

		this.halfCubeDimension = this.cubeDimension / 2

		// setRGB reads the palette in the working color space, as the per-mesh materials did.
		const color = new THREE.Color()
		this.paletteRgb = new Float32Array(this.colors.length * 3)
		for (const { id, colorRgb } of this.colors) {
			color.setRGB(colorRgb[0] / 255, colorRgb[1] / 255, colorRgb[2] / 255)
			color.toArray(this.paletteRgb, id * 3)
		}
		this.visibleById = Uint8Array.from(this.colors, ({ id }) =>
			this.isVisible(id) ? 1 : 0,
		)
		this.allVisible = this.visibleById.every((visible) => visible === 1)

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

		this.setInitialState()
		this.renderer.render(this.scene, this.camera)
		this.setRandomRotationDirections()
		this.animate()
	}

	clear = (): void => {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = undefined
		}

		if (this.renderInterval) {
			clearInterval(this.renderInterval)
		}

		if (this.cells) {
			this.cells.geometry.dispose()
			if (this.cells.material instanceof THREE.Material) {
				this.cells.material.dispose()
			}
			this.cells.dispose()
		}

		if (this.scene) {
			this.scene.remove(this.cellGroup)
		}

		if (this.renderer) {
			this.renderer.dispose()
			const rendererDomElement = this.renderer.domElement
			if (rendererDomElement.parentElement) {
				const newCanvas = document.createElement("canvas")
				newCanvas.id = "canvas"
				rendererDomElement.parentElement.replaceChild(
					newCanvas,
					rendererDomElement,
				)
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
			this.cellGroup.rotation.x +=
				this.initialRotationSpeed * this.rotationDirectionX
			this.cellGroup.rotation.y +=
				this.initialRotationSpeed * this.rotationDirectionY
			this.cellGroup.rotation.z +=
				this.initialRotationSpeed * this.rotationDirectionZ
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

	/** Write the next generation into bufferState, then call commitState(). */
	protected abstract update(): void

	/**
	 * Whether cells of this color id are drawn. Called once from the base constructor, so it must
	 * not depend on subclass fields. Default: every color is drawn.
	 */
	protected isVisible(_id: number): boolean {
		return true
	}

	/** Opacity of every cell. Called from the base constructor, like isVisible(). */
	protected getCellOpacity(): number {
		return 0.1
	}

	/** Make bufferState the current state and update the instances to match. */
	protected commitState(): void {
		if (!this.allVisible) {
			;[this.state, this.bufferState] = [this.bufferState, this.state]
			this.packVisibleCells()
			return
		}
		const instanceColor = this.cells.instanceColor
		if (!instanceColor) return
		const rgb = instanceColor.array as Float32Array
		let changed = false
		for (let i = 0; i < this.state.length; i++) {
			const id = this.bufferState[i]
			if (id !== this.state[i]) {
				rgb.set(this.paletteRgb.subarray(id * 3, id * 3 + 3), i * 3)
				changed = true
			}
		}
		;[this.state, this.bufferState] = [this.bufferState, this.state]
		if (changed) instanceColor.needsUpdate = true
	}

	/** Rebuild every instance from state, for subclasses that rewrite the state outside update(). */
	protected refreshInstances(): void {
		if (!this.allVisible) {
			this.packVisibleCells()
			return
		}
		const instanceColor = this.cells.instanceColor
		if (!instanceColor) return
		const rgb = instanceColor.array as Float32Array
		for (let i = 0; i < this.state.length; i++) {
			const id = this.state[i]
			rgb.set(this.paletteRgb.subarray(id * 3, id * 3 + 3), i * 3)
		}
		instanceColor.needsUpdate = true
	}

	/**
	 * Write only the visible cells into the first instances and draw that many. Every instance
	 * matrix is a pure translation, so only its translation column changes.
	 */
	private packVisibleCells(): void {
		const instanceColor = this.cells.instanceColor
		if (!instanceColor) return
		const matrices = this.cells.instanceMatrix.array as Float32Array
		const rgb = instanceColor.array as Float32Array
		let count = 0
		for (let i = 0; i < this.state.length; i++) {
			const id = this.state[i]
			if (this.visibleById[id] === 0) continue
			matrices[count * 16 + 12] = this.positions[i * 3]
			matrices[count * 16 + 13] = this.positions[i * 3 + 1]
			matrices[count * 16 + 14] = this.positions[i * 3 + 2]
			rgb.set(this.paletteRgb.subarray(id * 3, id * 3 + 3), count * 3)
			count++
		}
		this.cells.count = count
		// Upload only the instances in use.
		this.cells.instanceMatrix.clearUpdateRanges()
		instanceColor.clearUpdateRanges()
		if (count > 0) {
			this.cells.instanceMatrix.addUpdateRange(0, count * 16)
			instanceColor.addUpdateRange(0, count * 3)
		}
		this.cells.instanceMatrix.needsUpdate = true
		instanceColor.needsUpdate = true
	}

	protected setInitialState = (): void => {
		const n = this.cubeDimension
		const count = n * n * n
		this.state = new Uint8Array(count)
		this.bufferState = new Uint8Array(count)

		const size = this.cellSize * this.cellFilling
		const geometry = new THREE.BoxGeometry(size, size, size)
		const material = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: this.getCellOpacity(),
			depthWrite: false,
		})
		this.cells = new THREE.InstancedMesh(geometry, material, count)
		this.cells.instanceColor = new THREE.InstancedBufferAttribute(
			new Float32Array(count * 3),
			3,
		)
		// The drawn instances change with the state, so a bounding sphere computed once would go stale.
		this.cells.frustumCulled = false

		this.positions = new Float32Array(count * 3)
		const matrix = new THREE.Matrix4()
		for (let z = 0; z < n; z++) {
			for (let y = 0; y < n; y++) {
				for (let x = 0; x < n; x++) {
					const i = x + y * n + z * n * n
					this.state[i] = Math.floor(Math.random() * this.colors.length)
					this.positions[i * 3] = (x - this.halfCubeDimension) * this.cellSize
					this.positions[i * 3 + 1] =
						(y - this.halfCubeDimension) * this.cellSize
					this.positions[i * 3 + 2] =
						(z - this.halfCubeDimension) * this.cellSize
					matrix.makeTranslation(
						this.positions[i * 3],
						this.positions[i * 3 + 1],
						this.positions[i * 3 + 2],
					)
					this.cells.setMatrixAt(i, matrix)
				}
			}
		}
		this.refreshInstances()

		this.cellGroup.add(this.cells)
	}
}
