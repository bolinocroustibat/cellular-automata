import type { Cell } from "../types/Cell"
import { pickColors } from "../utils/pickColors"
import { randomInt } from "../utils/randomInt"
import { setupCanvas } from "../utils/setupCanvas"
import { nextCellColorId } from "../utils/nextCellColorId"

export class Automaton2D {
	protected canvasEl: HTMLCanvasElement
	protected width: number
	protected height: number
	protected resolution: number
	protected rowsCount: number
	protected colsCount: number
	protected colors: Cell[]
	protected state: Cell[][]
	protected ctx: CanvasRenderingContext2D
	renderInterval: NodeJS.Timeout
	private threshold: number

	constructor(canvasEl: HTMLCanvasElement, width: number, height: number) {
		const RESOLUTION = 1
		const COLORS_COUNT = 8
		const THRESHOLD = 2
		this.threshold = THRESHOLD
		this.canvasEl = canvasEl
		this.resolution = RESOLUTION
		this.width = width - (width % RESOLUTION)
		this.height = height - (height % RESOLUTION)
		this.rowsCount = this.height / RESOLUTION
		this.colsCount = this.width / RESOLUTION
		this.colors = pickColors(COLORS_COUNT)
		this.state = []
		this.ctx = setupCanvas(this.canvasEl, this.width, this.height)
		this.setRandomStateAndRender()
	}

	clear(): void {
		if (this.renderInterval) {
			clearInterval(this.renderInterval)
			this.renderInterval = undefined
		}
		if (this.ctx) {
			this.ctx.clearRect(0, 0, this.width, this.height)
		}
		this.setUniformStateAndRender()
	}

	protected setUniformStateAndRender = (): void => {
		for (let y = 0; y < this.rowsCount; ++y) {
			for (let x = 0; x < this.colsCount; ++x) {
				if (!this.state[y]) this.state[y] = []
				this.state[y][x] = this.colors[0]
				this.fillSquare(
					this.state[y][x].colorRgb,
					x * this.resolution,
					y * this.resolution,
				)
			}
		}
	}

	protected setRandomStateAndRender = (): void => {
		for (let y = 0; y < this.rowsCount; ++y) {
			for (let x = 0; x < this.colsCount; ++x) {
				if (!this.state[y]) this.state[y] = []
				this.state[y][x] =
					this.colors[Math.floor(Math.random() * this.colors.length)]
				this.fillSquare(
					this.state[y][x].colorRgb,
					x * this.resolution,
					y * this.resolution,
				)
			}
		}
	}

	placePatternRandomly = (pattern: number[][]): void => {
		const posX = randomInt(0, this.colsCount - pattern[0].length)
		const posY = randomInt(0, this.rowsCount - pattern.length)
		for (let y = 0; y < pattern.length; ++y) {
			for (let x = 0; x < pattern[y].length; ++x) {
				this.state[posY + y][posX + x] = this.colors[pattern[y][x]]
				this.fillSquare(
					this.colors[pattern[y][x]].colorRgb,
					(posX + x) * this.resolution,
					(posY + y) * this.resolution,
				)
			}
		}
	}

	start = (intervalMs: number, maxIterations: number): void => {
		if (this.state.length > 0) {
			let i = 0
			this.renderInterval = setInterval(() => {
				if (++i === maxIterations) clearInterval(this.renderInterval)
				this.updateState()
			}, intervalMs)
		}
	}

	protected fillSquare = (
		colorRgb: [number, number, number],
		x: number,
		y: number,
	): void => {
		this.ctx.fillStyle = `rgb(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]})`
		this.ctx.fillRect(x, y, this.resolution, this.resolution)
	}

	protected getCellColor = (x: number, y: number): Cell => {
		const modifiedX =
			x === -1 ? this.colsCount - 1 : x === this.colsCount ? 0 : x
		const modifiedY =
			y === -1 ? this.rowsCount - 1 : y === this.rowsCount ? 0 : y
		return this.state[modifiedY][modifiedX]
	}

	protected getNeighborsColors = (x: number, y: number): Cell[] => {
		return [
			this.getCellColor(x - 1, y - 1),
			this.getCellColor(x, y - 1),
			this.getCellColor(x + 1, y - 1),
			this.getCellColor(x - 1, y),
			this.getCellColor(x + 1, y),
			this.getCellColor(x - 1, y + 1),
			this.getCellColor(x, y + 1),
			this.getCellColor(x + 1, y + 1),
		]
	}

	render = (): void => {
		for (let y = 0; y < this.rowsCount; ++y) {
			for (let x = 0; x < this.colsCount; ++x) {
				this.fillSquare(
					this.state[y][x].colorRgb,
					x * this.resolution,
					y * this.resolution,
				)
			}
		}
	}

	private updateState = (): void => {
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
