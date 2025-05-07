import type { RGB } from "../../types/RGB"
import { Automaton1D } from "../automaton1d"

export class Rule110 extends Automaton1D {
	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		paletteColors?: RGB[],
	) {
		// Rule 110 uses 2 colors (binary states)
		super(canvasEl, width, height, 2, paletteColors)
	}

	protected setInitialState(): void {
		// Initialize with a single black cell near the left edge
		this.state = new Array(this.width)
		for (let x = 0; x < this.width; x++) {
			this.state[x] = this.colors[0] // white
		}
		// Place single black cell near left edge to create rightward-growing pattern
		this.state[2] = this.colors[1] // black
	}

	protected update(line: number): void {
		const newState = new Array(this.width)

		for (let x = 0; x < this.width; x++) {
			const left = this.getCellColor(x - 1)
			const center = this.getCellColor(x)
			const right = this.getCellColor(x + 1)

			// Convert neighborhood to pattern number (0-7)
			const pattern =
				(left.id === 1 ? 4 : 0) +
				(center.id === 1 ? 2 : 0) +
				(right.id === 1 ? 1 : 0)

			// Rule 110:
			// 111 -> 0    011 -> 1    101 -> 1    001 -> 1
			// 110 -> 1    010 -> 1    100 -> 0    000 -> 0
			const newStateId = [0, 1, 1, 1, 0, 1, 1, 0][pattern]
			newState[x] = this.colors[newStateId]

			// Render directly to the canvas
			this.fillPixel(this.state[x].colorRgb, x, line)
		}
		this.state = newState
	}
}
