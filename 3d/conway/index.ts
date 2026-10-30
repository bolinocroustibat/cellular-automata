import type { RGB } from "../../types/RGB"
import { type LifeRule, parseLifeRule } from "../../utils/parseLifeRule"
import { Automaton3D } from "../automaton3d"

/**
 * Rules that keep going from a random 15% fill on a 30³ cube, calmest first: neither dying out,
 * filling the cube, nor freezing.
 */
export const CONWAY_3D_RULES = [
	"S4-8/B7",
	"S1-6/B7",
	"S1-5/B6",
	"S4/B4",
] as const

const DEFAULT_RULE: LifeRule = { survive: 0b1_1111_0000, birth: 0b1000_0000 } // S4-8/B7

const DEAD = 0
const ALIVE = 1

/**
 * Life on 26 neighbors with a configurable birth/survival rule. Dead cells are not drawn.
 * Color 0 is dead, color 1 is alive.
 */
export class Conway3D extends Automaton3D {
	private readonly rule: LifeRule

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		rule: string,
		density: number,
		paletteColors?: RGB[],
	) {
		super(canvasEl, width, height, resolution, 2, paletteColors)
		this.rule = parseLifeRule(rule) ?? DEFAULT_RULE

		// The base fills every color evenly; Life starts from a sparser random fill.
		for (let i = 0; i < this.state.length; i++) {
			this.state[i] = Math.random() < density ? ALIVE : DEAD
		}
		this.refreshInstances()
	}

	protected isVisible(id: number): boolean {
		return id === ALIVE
	}

	protected getCellOpacity(): number {
		return 0.3
	}

	protected update(): void {
		const n = this.cubeDimension
		const plane = n * n
		const { survive, birth } = this.rule
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

					// Dead is 0 and alive is 1, so the sum is the live neighbor count.
					let aliveNeighboursCount = 0
					for (let dz = 0; dz < 3; dz++) {
						for (let dy = 0; dy < 3; dy++) {
							const row = zs[dz] + ys[dy]
							for (let dx = 0; dx < 3; dx++) {
								if (dz === 1 && dy === 1 && dx === 1) continue
								aliveNeighboursCount += state[row + xs[dx]]
							}
						}
					}

					const i = zs[1] + ys[1] + x
					const mask = state[i] === ALIVE ? survive : birth
					this.bufferState[i] = (mask >> aliveNeighboursCount) & 1
				}
			}
		}

		this.commitState()
	}
}
