import type { Cell } from "../types/Cell"
import type { RGB } from "../types/RGB"
import { pickColors } from "../utils/pickColors"
import { setupCanvas } from "../utils/setupCanvas"

export abstract class Automaton1D {
	protected canvasEl: HTMLCanvasElement
	protected width: number
	protected height: number
	protected colors: Cell[]
	protected state: Cell[]
	protected ctx: CanvasRenderingContext2D
	renderInterval: NodeJS.Timeout

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		colorsCount: number,
		paletteColors?: RGB[],
	) {
		this.clear()
		this.canvasEl = canvasEl
		this.width = width
		this.height = height
		this.colors = pickColors(colorsCount, paletteColors)
		this.state = []
		this.ctx = setupCanvas(this.canvasEl, width, height)
		this.setInitialState()
		this.render(0)
	}

	clear = (): void => {
		if (this.renderInterval) {
			clearInterval(this.renderInterval)
			this.renderInterval = undefined
		}
		if (this.ctx) {
			this.ctx.clearRect(0, 0, this.width, this.height)
		}
	}

	start = (intervalMs: number): void => {
		let line = 0
		this.renderInterval = setInterval(() => {
			if (++line === this.height) clearInterval(this.renderInterval)
			this.update(line)
		}, intervalMs)
	}

	render = (line: number): void => {
		for (let x = 0; x < this.width; x++) {
			this.fillPixel(this.state[x].colorRgb, x, line)
		}
	}

	protected abstract setInitialState(): void

	protected getCellColor = (x: number): Cell => {
		const modifiedX = x === -1 ? this.width - 1 : x === this.width ? 0 : x
		return this.state[modifiedX]
	}

	protected fillPixel = (
		colorRgb: [number, number, number],
		x: number,
		y: number,
	): void => {
		this.ctx.fillStyle = `rgb(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]})`
		this.ctx.fillRect(x, y, 1, 1)
	}

	protected abstract update(line: number): void
}
