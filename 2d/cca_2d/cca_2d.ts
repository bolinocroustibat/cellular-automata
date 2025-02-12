import type { Cell } from "../../types/Cell"
import { nextCellColorId } from "../../utils/nextCellColorId"
import { Automaton2D } from "../automaton2d"

export class CCA2D extends Automaton2D {
	private threshold: number

	constructor(
		threshold: number,
		...args: ConstructorParameters<typeof Automaton2D>
	) {
		super(...args)
		this.threshold = threshold

		// Initial random populating
		this.setRandomState()
		this.render()
	}

	protected updateState = (): void => {
		const newState: Cell[][] = []
		for (let y = 0; y < this.rowsCount; ++y) {
			newState[y] = []
			for (let x = 0; x < this.colsCount; ++x) {
				newState[y][x] = this.computeNextCellState(x, y)

				// Update canvas pixels
				// Optimization - fill pixels only if color value changes from previous state
				if (newState[y][x] !== this.state[y][x]) {
					this.fillSquare(
						newState[y][x].colorRgb,
						x * this.resolution,
						y * this.resolution,
					)
				}
			}
		}
		this.state = newState
	}

	// Add the required abstract method implementation
	protected computeNextCellState(x: number, y: number): Cell {
		const neighbours: Cell[] = this.getNeighborsColors(x, y)
		const nextColorId: number = nextCellColorId(
			this.state[y][x],
			this.colors,
		)
		const successorNeighboursCount: Cell[] = neighbours.filter(
			(neighbour) => neighbour.id === nextColorId,
		)
		return successorNeighboursCount.length >= this.threshold
			? successorNeighboursCount[0]
			: this.state[y][x]
	}
}
