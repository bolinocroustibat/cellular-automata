import * as Sentry from "@sentry/browser"
import type { RendererKind } from "../utils/renderer-preference"
import { Automaton2D } from "../2d/automaton2d"
import { Automaton2DWebGL } from "../2d/automaton2d-webgl"

export abstract class Automaton {
	renderInterval: NodeJS.Timer
	abstract clear(): void
	abstract start(intervalMs: number, maxIterations?: number): void

	static async create(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		options?: { renderer?: RendererKind },
	): Promise<Automaton> {
		if (options?.renderer === "canvas") {
			return new Automaton2D(canvasEl, width, height)
		}

		try {
			return new Automaton2DWebGL(canvasEl, width, height)
		} catch (error) {
			Sentry.captureException(error)
			throw error
		}
	}

	static cleanup(automaton: Automaton): void {
		if (!automaton) return
		automaton.clear()
	}
}
