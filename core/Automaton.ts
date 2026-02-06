import * as Sentry from "@sentry/browser"
import { Automaton2D } from "../2d/automaton2d"

export abstract class Automaton {
	renderInterval: NodeJS.Timer
	abstract clear(): void
	abstract start(intervalMs: number, maxIterations?: number): void

	static async create(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
	): Promise<Automaton> {
		try {
			return new Automaton2D(canvasEl, width, height)
		} catch (error) {
			Sentry.captureException(error)
			console.error("Failed to create automaton:", error)
			throw error
		}
	}

	static cleanup(automaton: Automaton): void {
		if (!automaton) return
		automaton.clear()
	}
}
