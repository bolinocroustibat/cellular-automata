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
		this.setRandomStateAndRender()
	}

	updateState = (): void => {
		const newState: Cell[][] = []
		for (let y = 0; y < this.rowsCount; ++y) {
			newState[y] = []
			for (let x = 0; x < this.colsCount; ++x) {
				const neighbours: Cell[] = this.getNeighborsColors(x, y)
				const nextColorId: number = nextCellColorId(
					this.state[y][x],
					this.colors,
				)
				const successorNeighboursCount: Cell[] = neighbours.filter(
					(neighbour) => neighbour.id === nextColorId,
				)
				newState[y][x] =
					successorNeighboursCount.length >= this.threshold
						? successorNeighboursCount[0]
						: this.state[y][x]

				// Mark as dirty if state changed
				if (newState[y][x].id !== this.state[y][x].id) {
					this.markDirty(x, y)
				}
			}
		}
		this.state = newState
		// Render only dirty cells (handled by parent class)
		this.render()
	}
}
