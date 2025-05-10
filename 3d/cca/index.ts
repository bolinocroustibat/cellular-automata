import * as THREE from "three"
import type { Cell } from "../../types/Cell"
import type { RGB } from "../../types/RGB"
import { nextCellColorId } from "../../utils/nextCellColorId"
import { Automaton3D } from "../automaton3d"

export class CCA3D extends Automaton3D {
	private threshold: number

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		threshold: number,
		colorsCount: number,
		paletteColors?: RGB[],
	) {
		super(canvasEl, width, height, resolution, colorsCount, paletteColors)
		this.threshold = threshold
	}

	protected update(): void {
		// Create temporary arrays for state update
		const nextState = Array(this.cubeDimension).fill(null).map(() =>
			Array(this.cubeDimension).fill(null).map(() =>
				Array(this.cubeDimension).fill(null)
			)
		)

		// Update each cell
		for (let z = 0; z < this.cubeDimension; z++) {
			for (let y = 0; y < this.cubeDimension; y++) {
				for (let x = 0; x < this.cubeDimension; x++) {
					const currentCell = this.getCellColor(x, y, z)
					const nextColorId = (currentCell.id + 1) % this.colors.length
					const nextColor = this.colorMap.get(nextColorId)!
					
					// Count neighbors with next color
					let count = 0
					const neighbors = this.getNeighbours(x, y, z)
					for (const neighbor of neighbors) {
						if (neighbor.id === nextColorId) {
							count++
						}
					}

					// Update state based on threshold
					if (count >= this.threshold) {
						nextState[z][y][x] = nextColor
					} else {
						nextState[z][y][x] = currentCell
					}
				}
			}
		}

		// Update state and colors
		this.state = nextState
		let instanceIndex = 0

		for (let z = 0; z < this.cubeDimension; z++) {
			for (let y = 0; y < this.cubeDimension; y++) {
				for (let x = 0; x < this.cubeDimension; x++) {
					const color = this.state[z][y][x]
					const colorVector = new THREE.Color()
					colorVector.setRGB(
						color.colorRgb[0] / 255,
						color.colorRgb[1] / 255,
						color.colorRgb[2] / 255
					)
					this.instanceMesh.setColorAt(instanceIndex, colorVector)
					instanceIndex++
				}
			}
		}

		// Update instance colors
		if (this.instanceMesh.instanceColor) {
			this.instanceMesh.instanceColor.needsUpdate = true
		}
	}

	private getNeighbours(x: number, y: number, z: number): Cell[] {
		const neighbours: Cell[] = []
		const offsets = [-1, 0, 1]
		for (const dz of offsets) {
			for (const dy of offsets) {
				for (const dx of offsets) {
					if (dx === 0 && dy === 0 && dz === 0) continue
					neighbours.push(this.getCellColor(x + dx, y + dy, z + dz))
				}
			}
		}
		return neighbours
	}
}
