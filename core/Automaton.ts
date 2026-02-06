import * as Sentry from "@sentry/browser"
import { CCA1D } from "../1d/cca"
import { Rule30 } from "../1d/rule30"
import { Rule90 } from "../1d/rule90"
import { Rule110 } from "../1d/rule110"
import { CCA2D } from "../2d/cca"
import { ConwayAutomaton } from "../2d/conway"
import { EntropyAutomaton } from "../2d/entropy"
import { ImmigrationAutomaton } from "../2d/immigration"
import { LangtonAutomaton } from "../2d/langton"
import { QuadLifeAutomaton } from "../2d/quadlife"
import { CCA3D } from "../3d/cca"
import type { Settings } from "../types/Settings"
import { moviePalettes } from "../utils/fetchMoviePalettes"

export abstract class Automaton {
	renderInterval: NodeJS.Timeout
	abstract clear(): void
	abstract start(intervalMs: number, maxIterations?: number): void

	static async create(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		settings: Settings,
	): Promise<Automaton> {
		try {
			const resolution: number = settings.resolution || 5
			const paletteColors = settings.palette
				? moviePalettes.get(settings.palette)?.colors
				: undefined

			switch (settings.algo) {
				case "cca-1D":
					return new CCA1D(
						canvasEl,
						width,
						height,
						settings.cca1dColorsCount || 4,
						paletteColors,
					)
				case "rule30":
					return new Rule30(canvasEl, width, height, paletteColors)
				case "rule90":
					return new Rule90(canvasEl, width, height, paletteColors)
				case "rule110":
					return new Rule110(canvasEl, width, height, paletteColors)
				case "cca-2D":
					return new CCA2D(
						settings.cca2dThreshold,
						canvasEl,
						width,
						height,
						resolution,
						settings.cca2dColorsCount,
						paletteColors,
					)
				case "cca-3D":
					return new CCA3D(
						canvasEl,
						width,
						height,
						settings.cca3dCubeDimension,
						settings.cca3dThreshold,
						settings.cca3dColorsCount,
						paletteColors,
					)
				case "conway":
					return new ConwayAutomaton(canvasEl, width, height, resolution)
				case "immigration":
					return new ImmigrationAutomaton(
						canvasEl,
						width,
						height,
						resolution,
						undefined,
						paletteColors,
					)
				case "quadlife":
					return new QuadLifeAutomaton(
						canvasEl,
						width,
						height,
						resolution,
						undefined,
						paletteColors,
					)
				case "langton":
					return new LangtonAutomaton(canvasEl, width, height, resolution)
				case "entropy":
					return new EntropyAutomaton(
						canvasEl,
						width,
						height,
						resolution,
						settings.entropyColorsCount,
					)
				default:
					throw new Error(`Unknown algorithm: ${settings.algo}`)
			}
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
