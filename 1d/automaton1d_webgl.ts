import type { Cell } from "../types/Cell"
import type { RGB } from "../types/RGB"
import { pickColors } from "../utils/pickColors"
import { WebGLManager } from "./WebGLManager"

export abstract class Automaton1DWebGL {
    protected canvasEl: HTMLCanvasElement
    protected width: number
    protected height: number
    protected colors: Cell[]
    protected state: Cell[]
    protected webglManager: WebGLManager
    renderInterval: NodeJS.Timer

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
        
        // Initialize WebGL
        this.webglManager = new WebGLManager(canvasEl, width, height)
        
        this.setInitialState()
        this.render(0)
    }

    clear = (): void => {
        if (this.renderInterval) {
            clearInterval(this.renderInterval)
            this.renderInterval = undefined
        }
        if (this.webglManager) {
            this.webglManager.dispose()
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
        // Convert state to colors
        const colors = new Float32Array(this.width * 3)
        for (let x = 0; x < this.width; x++) {
            const cell = this.state[x]
            colors[x * 3] = cell.colorRgb[0] / 255
            colors[x * 3 + 1] = cell.colorRgb[1] / 255
            colors[x * 3 + 2] = cell.colorRgb[2] / 255
        }

        // Update and render
        this.webglManager.updateColors(colors)
        this.webglManager.render(line)
    }

    protected abstract setInitialState(): void

    protected getCellColor = (x: number): Cell => {
        const modifiedX = x === -1 ? this.width - 1 : x === this.width ? 0 : x
        return this.state[modifiedX]
    }

    protected abstract update(line: number): void
} 