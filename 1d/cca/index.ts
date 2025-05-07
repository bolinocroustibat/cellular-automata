import { nextCellColorId } from "../../utils/nextCellColorId"
import { Automaton1D } from "../automaton1d"

export class CCA1D extends Automaton1D {
	protected setInitialState(): void {
		// Random initialization for CCA
		if (!this.state) this.state = []
		for (let x = 0; x < this.width; x++) {
			const randomColor =
				this.colors[Math.floor(Math.random() * this.colors.length)]
			this.state[x] = randomColor
		}
	}

	protected update = (line: number): void => {
		const newState = []
		for (let x = 0; x < this.width; x++) {
			const neighbours = [
				this.getCellColor(x - 1),
				this.getCellColor(x),
				this.getCellColor(x + 1),
			]
			const nextColorId = nextCellColorId(this.state[x], this.colors)
			const successorNeighboursCount = neighbours.filter(
				(neighbour) => neighbour.id === nextColorId,
			).length

			// Find the successor neighbor if it exists
			const successorNeighbor = neighbours.find((n) => n.id === nextColorId)
			newState[x] =
				successorNeighboursCount >= 1 && successorNeighbor
					? successorNeighbor
					: this.state[x]

			// Render directly to the canvas to avoid another loop
			this.fillPixel(this.state[x].colorRgb, x, line)
		}
		this.state = newState
	}
}
