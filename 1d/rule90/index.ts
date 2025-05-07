import type { RGB } from "../../types/RGB"
import { Automaton1D } from "../automaton1d"

export class Rule90 extends Automaton1D {
	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		paletteColors?: RGB[],
	) {
		// Rule 90 uses 2 colors (binary states)
		super(canvasEl, width, height, 2, paletteColors)
	}

	protected setInitialState(): void {
		// Single black cell in middle for Rule 90
		if (!this.state) this.state = []
		for (let x = 0; x < this.width; x++) {
			this.state[x] = this.colors[0] // white
		}
		// Place single black cell in the middle
		this.state[Math.floor(this.width / 2)] = this.colors[1] // black
	}

	protected update = (line: number): void => {
		const newState = []
		for (let x = 0; x < this.width; x++) {
			const left = this.getCellColor(x - 1)
			const center = this.getCellColor(x)
			const right = this.getCellColor(x + 1)

			// Convert to binary pattern (0 = white, 1 = black)
			const pattern =
				(left.id === 1 ? 4 : 0) +
				(center.id === 1 ? 2 : 0) +
				(right.id === 1 ? 1 : 0)

			// Rule 90:
			// 111 -> 0    011 -> 1    101 -> 0    001 -> 1
			// 110 -> 1    010 -> 0    100 -> 1    000 -> 0
			const newStateId = [0, 1, 0, 1, 1, 0, 1, 0][pattern]
			newState[x] = this.colors[newStateId]

			// Render directly to the canvas
			this.fillPixel(this.state[x].colorRgb, x, line)
		}
		this.state = newState
	}
}
