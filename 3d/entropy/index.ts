import { Automaton3D } from "../automaton3d"

/** Each cell takes the most frequent color among its 26 neighbors, ties broken at random. */
export class Entropy3D extends Automaton3D {
	protected update(): void {
		const n = this.cubeDimension
		const plane = n * n
		const colorsCount = this.colors.length
		const state = this.state
		// Wrapped offsets of the previous, current and next slice on each axis.
		const zs = new Int32Array(3)
		const ys = new Int32Array(3)
		const xs = new Int32Array(3)
		const occurrences = new Uint8Array(colorsCount)
		const mostFrequentIds = new Uint8Array(colorsCount)

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

					occurrences.fill(0)
					for (let dz = 0; dz < 3; dz++) {
						for (let dy = 0; dy < 3; dy++) {
							const row = zs[dz] + ys[dy]
							for (let dx = 0; dx < 3; dx++) {
								if (dz === 1 && dy === 1 && dx === 1) continue
								occurrences[state[row + xs[dx]]]++
							}
						}
					}

					let maxCount = 0
					let tiesCount = 0
					for (let id = 0; id < colorsCount; id++) {
						if (occurrences[id] > maxCount) {
							maxCount = occurrences[id]
							mostFrequentIds[0] = id
							tiesCount = 1
						} else if (occurrences[id] === maxCount && maxCount > 0) {
							mostFrequentIds[tiesCount++] = id
						}
					}

					this.bufferState[zs[1] + ys[1] + x] =
						tiesCount === 1
							? mostFrequentIds[0]
							: mostFrequentIds[Math.floor(Math.random() * tiesCount)]
				}
			}
		}

		this.commitState()
	}
}
