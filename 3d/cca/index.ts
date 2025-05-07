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

	protected update = (): void => {
		for (let z = 0; z < this.cubeDimension; z++) {
			for (let y = 0; y < this.cubeDimension; y++) {
				for (let x = 0; x < this.cubeDimension; x++) {
					const currentCell = this.state[z][y][x]
					const nextColorId = nextCellColorId(currentCell, this.colors)
					const successorNeighboursCount = this.getNeighbours(x, y, z).filter(
						(neighbour) => neighbour.id === nextColorId,
					).length

					if (successorNeighboursCount >= this.threshold) {
						const newColor = this.colorMap.get(nextColorId) ?? currentCell

						this.bufferState[z][y][x] = {
							...newColor,
							mesh: currentCell.mesh,
						}

						if (newColor.id !== currentCell.id && currentCell.mesh) {
							this.updateCellColor(currentCell.mesh, newColor.colorRgb)
						}
					} else {
						this.bufferState[z][y][x] = currentCell
					}
				}
			}
		}
		;[this.state, this.bufferState] = [this.bufferState, this.state]
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
