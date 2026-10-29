import type { RGB } from "../../types/RGB"
import { Automaton3D } from "../automaton3d"

export class CCA3D extends Automaton3D {
	private threshold: number

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		threshold: number,
		colorsCount: number,
		paletteColors?: RGB[],
	) {
		super(canvasEl, width, height, resolution, colorsCount, paletteColors)
		this.threshold = threshold
	}

	protected update(): void {
		const n = this.cubeDimension
		const plane = n * n
		const colorsCount = this.colors.length
		const state = this.state
		// Wrapped offsets of the previous, current and next slice on each axis.
		const zs = new Int32Array(3)
		const ys = new Int32Array(3)
		const xs = new Int32Array(3)

		for (let z = 0; z < n; z++) {
			zs[0] = ((z + n - 1) % n) * plane
			zs[1] = z * plane
			zs[2] = ((z + 1) % n) * plane
			for (let y = 0; y < n; y++) {
				ys[0] = ((y + n - 1) % n) * n
				ys[1] = y * n
				ys[2] = ((y + 1) % n) * n
				for (let x = 0; x < n; x++) {
					xs[0] = (x + n - 1) % n
					xs[1] = x
					xs[2] = (x + 1) % n

					const i = zs[1] + ys[1] + x
					const current = state[i]
					const next = current + 1 >= colorsCount ? 0 : current + 1

					let successorNeighboursCount = 0
					for (let dz = 0; dz < 3; dz++) {
						for (let dy = 0; dy < 3; dy++) {
							const row = zs[dz] + ys[dy]
							for (let dx = 0; dx < 3; dx++) {
								if (dz === 1 && dy === 1 && dx === 1) continue
								if (state[row + xs[dx]] === next) successorNeighboursCount++
							}
						}
					}

					this.bufferState[i] =
						successorNeighboursCount >= this.threshold ? next : current
				}
			}
		}

		this.commitState()
	}
}
