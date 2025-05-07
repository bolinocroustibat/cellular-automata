import type { Cell } from "../../types/Cell"
import { Automaton2D } from "../automaton2d"

export class EntropyAutomaton extends Automaton2D {
	constructor(...args: ConstructorParameters<typeof Automaton2D>) {
		super(...args)

		// Initial random populating
		this.setRandomStateAndRender()
	}

	private getMostFrequentColor = (colors: Cell[]): Cell | null => {
		if (colors.length === 0) return null

		// Count occurrences of each color id
		const occurrences = new Map<number, number>()
		for (const color of colors) {
			occurrences.set(color.id, (occurrences.get(color.id) || 0) + 1)
		}

		// Find the maximum occurrence count
		let maxCount = 0
		let mostFrequentIds: number[] = []
		occurrences.forEach((count, colorId) => {
			if (count > maxCount) {
				maxCount = count
				mostFrequentIds = [colorId]
			} else if (count === maxCount) {
				mostFrequentIds.push(colorId)
			}
		})

		// If there is only one most frequent color, return it
		if (mostFrequentIds.length === 1) {
			return colors.find((color) => color.id === mostFrequentIds[0]) || null
		}

		// Else, select a random color among the most frequent ones
		const randomIndex = Math.floor(Math.random() * mostFrequentIds.length)
		const randomColorId = mostFrequentIds[randomIndex]
		return colors.find((color) => color.id === randomColorId) || null
	}

	protected updateState = (): void => {
		const newState: Cell[][] = []
		for (let y = 0; y < this.rowsCount; ++y) {
			newState[y] = []
			for (let x = 0; x < this.colsCount; ++x) {
				const neighbours = this.getNeighborsColors(x, y)
				const mostFrequentColor = this.getMostFrequentColor(neighbours)

				if (!mostFrequentColor) continue

				newState[y][x] = mostFrequentColor

				// Update canvas pixels
				// Optimization - fill pixels only if color value changes from previous state
				if (newState[y][x].id !== this.state[y][x].id) {
					this.fillSquare(
						mostFrequentColor.colorRgb,
						x * this.resolution,
						y * this.resolution,
					)
				}
			}
		}
		this.state = newState
	}
}
