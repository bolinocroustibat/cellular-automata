import { pickColors } from "../../utils/pickColors"
import { Automaton2D } from "../automaton2d"

export class ConwayAutomaton extends Automaton2D {
	constructor(...args) {
		super(...args)
		if (!this.colorsCount) {
			this.colorsCount = 2
		}
		this.colors = pickColors(this.colorsCount)
		this.colorOff = this.colors[0]
		this.colorOn = this.colors[1]

		clearInterval(this.renderInterval)

		// Initial random populating
		this.setRandomStateAndRender()

		// Manual populating
		this.canvasEl.addEventListener("mousedown", (event) => {
			const [x, y] = this.getCursorPosition(event)
			this.state[y][x] = this.colors[1]
			this.fillSquare(
				this.colors[1].colorRgb,
				x * this.resolution,
				y * this.resolution,
			)
		})
	}

	getCursorPosition = (event) => {
		const rect = this.canvasEl.getBoundingClientRect()
		const pixelX = event.clientX - rect.left
		const pixelY = event.clientY - rect.top
		const x = ~~(pixelX / this.resolution)
		const y = ~~(pixelY / this.resolution)
		return [x, y]
	}

	updateState = () => {
		const newState = []
		for (let y = 0; y < this.rowsCount; ++y) {
			newState[y] = []
			for (let x = 0; x < this.colsCount; ++x) {
				const neighbours = this.getNeighborsColors(x, y)

				// Analyse neighbors info
				let nbAlive = 0
				for (const cell of neighbours) {
					if (cell.id === this.colorOn.id) nbAlive++
				}

				// Change the newState according to the neighbors
				const isCellAlive = this.state[y][x].id === this.colorOn.id
				const isUnderpopulated = nbAlive < 2
				const isOverpopulated = nbAlive > 3
				const isReproduction = nbAlive === 3
				if (
					(isCellAlive && (isUnderpopulated || isOverpopulated)) ||
					(!isCellAlive && isReproduction)
				) {
					newState[y][x] = isCellAlive ? this.colorOff : this.colorOn
				} else {
					newState[y][x] = this.state[y][x]
				}

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
}
