import type { Cell } from "../../types/Cell"
import { ConwayAutomaton } from "../conway"

export class ImmigrationAutomaton extends ConwayAutomaton {
	private aliveColors: Cell[]
	private aliveColorIds: number[]

	constructor(...args: ConstructorParameters<typeof ConwayAutomaton>) {
		const [canvasEl, width, height, resolution, _, paletteColors] = args
		super(canvasEl, width, height, resolution, 3, paletteColors)
		this.aliveColors = this.colors.slice(1) // Last 2 colors for alive states
		this.aliveColorIds = this.aliveColors.map((color) => color.id)
		this.colorOff = this.colors[0] // First color for dead state
	}

	private getMostFrequentAliveColor = (
		aliveNeighbours: Cell[],
	): Cell | null => {
		if (aliveNeighbours.length === 0) return null
		const occurences = {}
		let mostFrequentColor = aliveNeighbours[0]
		let maxFrequency = 1
		for (const cell of aliveNeighbours) {
			if (occurences[cell.id] == null) occurences[cell.id] = 1
			else occurences[cell.id]++
			if (occurences[cell.id] > maxFrequency) {
				mostFrequentColor = cell
				maxFrequency = occurences[cell.id]
			}
		}
		return mostFrequentColor
	}

	protected updateState = (): void => {
		const newState = []
		for (let y = 0; y < this.rowsCount; ++y) {
			newState[y] = []
			for (let x = 0; x < this.colsCount; ++x) {
				const neighbours = this.getNeighborsColors(x, y)

				// Analyse neighbors info
				const aliveNeighbours = []
				for (const cell of neighbours) {
					if (this.aliveColorIds.includes(cell.id)) {
						aliveNeighbours.push(cell)
					}
				}

				// Change the newState according to the neighbors
				const isCellAlive = this.aliveColorIds.includes(this.state[y][x].id)
				const isUnderpopulated = aliveNeighbours.length < 2
				const isOverpopulated = aliveNeighbours.length > 3
				const isReproduction = aliveNeighbours.length === 3
				if (isCellAlive && (isUnderpopulated || isOverpopulated)) {
					newState[y][x] = this.colorOff
				} else if (!isCellAlive && isReproduction) {
					newState[y][x] = this.getMostFrequentAliveColor(aliveNeighbours)
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
