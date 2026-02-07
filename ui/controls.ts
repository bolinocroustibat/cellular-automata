import type { BladeController, ListApi } from "@tweakpane/core"
import { type BladeApi, type ButtonApi, type FolderApi, Pane } from "tweakpane"
import { gosperGliderGunPattern } from "../2d/conway/patterns/guns"
import {
	beaconPattern,
	blinkerPattern,
	pentadecathlonPattern,
	pulsarPattern,
} from "../2d/conway/patterns/oscillators"
import {
	HWSSPattern,
	LWSSPattern,
	MWSSPattern,
	gliderPattern,
} from "../2d/conway/patterns/spaceships"
import type { Automaton } from "../core/Automaton"
import type { Settings } from "../types/Settings"
import { fetchMoviePalettes } from "../utils/fetchMoviePalettes"
import { getAlgorithmFromRoute } from "../utils/getAlgorithmFromRoute"

const MOVIES_PALETTES_API = import.meta.env.VITE_MOVIES_PALETTES_API

export class Controls {
	private pane: Pane
	private automaton: Automaton
	private onReset: () => Promise<void>

	// Core controls
	private algoSelector: BladeApi
	private paletteSelector: ListApi<string | null>
	private resolutionBlade: BladeApi
	private clearBtn: ButtonApi
	private resetBtn: ButtonApi
	private startBtn: ButtonApi

	// CCA1D controls
	private cca1dColorsCountBlade: BladeApi

	// CCA2D controls
	private cca2dColorsCountBlade: BladeApi
	private cca2dThresholdBlade: BladeApi

	// CCA3D controls
	private cca3dColorsCountBlade: BladeApi
	private cca3dThresholdBlade: BladeApi
	private cca3dCubeDimensionBlade: BladeApi

	// Conway controls
	private conwayPatterns: FolderApi

	// Entropy controls
	private entropyColorsCountBlade: BladeApi

	// Collection of all blades for visibility management
	private blades: BladeController[]

	constructor(automaton: Automaton, onReset: () => Promise<void>) {
		this.automaton = automaton
		this.onReset = onReset
		this.setupPane()
		this.setupBlades()
		this.setupEventListeners()
		this.setBladesForAlgo(getAlgorithmFromRoute())

		void fetchMoviePalettes(this.paletteSelector, MOVIES_PALETTES_API)
	}

	private setupPane(): void {
		this.pane = new Pane({
			title: "Parameters",
			expanded: true,
		})
	}

	private setupBlades(): void {
		this.algoSelector = this.pane.addBinding(
			{ algo: getAlgorithmFromRoute() },
			"algo",
			{
				index: 1,
				label: "Algorithm",
				options: {
					"1 dimension Cyclic Cellular Automaton": "cca-1D",
					"Elementary Cellular Automaton Rule 30": "rule30",
					"Sierpinski Triangle (Rule 90)": "rule90",
					"Turing Complete Rule 110": "rule110",
					"2 dimensions Cyclic Cellular Automaton": "cca-2D",
					"2 dimensions Cyclic Cellular Automaton (WebGL)": "cca-2D-webgl",
					"3 dimensions Cyclic Cellular Automaton": "cca-3D",
					"Conway's Game of Life": "conway",
					"Conway's Game of Life (WebGL)": "conway-webgl",
					"Immigration game": "immigration",
					"Quad-Life": "quadlife",
					"Langton's ant": "langton",
					"Langton's ant (WebGL)": "langton-webgl",
					"2 dimensions Entropy Automaton": "entropy",
				},
			},
		)

		this.cca1dColorsCountBlade = this.pane.addBinding(
			{ cca1dColorsCount: 4 },
			"cca1dColorsCount",
			{ label: "Number of colors", min: 3, max: 5, step: 1 },
		)

		this.paletteSelector = this.pane.addBlade({
			view: "list",
			label: "Color Palette",
			options: [
				{ text: "Random", value: null },
				{ text: "Loading...", value: "loading" },
			],
			value: null,
		})

		this.cca2dColorsCountBlade = this.pane.addBinding(
			{ cca2dColorsCount: 8 },
			"cca2dColorsCount",
			{ label: "Number of colors", min: 2, max: 10, step: 1 },
		)

		this.cca2dThresholdBlade = this.pane.addBinding(
			{ cca2dThreshold: 2 },
			"cca2dThreshold",
			{ label: "Threshold", min: 1, max: 3, step: 1 },
		)

		this.cca3dColorsCountBlade = this.pane.addBinding(
			{ cca3dColorsCount: 5 },
			"cca3dColorsCount",
			{ label: "Number of colors", min: 4, max: 10, step: 1 },
		)

		this.cca3dThresholdBlade = this.pane.addBinding(
			{ cca3dThreshold: 4 },
			"cca3dThreshold",
			{ label: "Threshold", min: 4, max: 10, step: 1 },
		)

		this.cca3dCubeDimensionBlade = this.pane.addBinding(
			{ cca3dCubeDimension: 15 },
			"cca3dCubeDimension",
			{ label: "3D cube size", min: 5, max: 30, step: 1 },
		)

		this.entropyColorsCountBlade = this.pane.addBinding(
			{ entropyColorsCount: 4 },
			"entropyColorsCount",
			{ label: "Number of colors", min: 2, max: 10, step: 1 },
		)

		this.resolutionBlade = this.pane.addBinding(
			{ resolution: 5 },
			"resolution",
			{ label: "Resolution", min: 1, max: 20, step: 1 },
		)

		this.conwayPatterns = this.pane.addFolder({
			title: "Add patterns",
			expanded: true,
		})

		this.setupPatternButtons()

		this.clearBtn = this.pane.addButton({ title: "Clear" })
		this.resetBtn = this.pane.addButton({ title: "Reset" })
		this.startBtn = this.pane.addButton({
			index: 10,
			title: "Start",
		})

		this.pane.addBlade({
			view: "text",
			label: "Version",
			value: `${APP_VERSION}`,
			parse: () => {},
			disabled: true,
		})

		this.blades = [
			this.cca1dColorsCountBlade,
			this.paletteSelector,
			this.cca2dColorsCountBlade,
			this.cca2dThresholdBlade,
			this.cca3dColorsCountBlade,
			this.cca3dThresholdBlade,
			this.cca3dCubeDimensionBlade,
			this.conwayPatterns,
			this.entropyColorsCountBlade,
			this.resolutionBlade,
			this.clearBtn,
		]
	}

	private setupPatternButtons(): void {
		const oscillators = this.conwayPatterns.addFolder({
			title: "Oscillators",
		})
		oscillators
			.addButton({ title: "Add a blinker" })
			.on("click", () => this.automaton?.placePatternRandomly(blinkerPattern()))
		oscillators
			.addButton({ title: "Add a beacon" })
			.on("click", () => this.automaton?.placePatternRandomly(beaconPattern()))
		oscillators
			.addButton({ title: "Add a pulsar" })
			.on("click", () => this.automaton?.placePatternRandomly(pulsarPattern()))
		oscillators
			.addButton({ title: "Add a pentadecathlon" })
			.on("click", () =>
				this.automaton?.placePatternRandomly(pentadecathlonPattern()),
			)

		const spaceships = this.conwayPatterns.addFolder({
			title: "Spaceships",
		})
		spaceships
			.addButton({ title: "Add a glider" })
			.on("click", () => this.automaton?.placePatternRandomly(gliderPattern()))
		spaceships
			.addButton({ title: "Add a light-weight spaceship" })
			.on("click", () => this.automaton?.placePatternRandomly(LWSSPattern()))
		spaceships
			.addButton({ title: "Add a middle-weight spaceship" })
			.on("click", () => this.automaton?.placePatternRandomly(MWSSPattern()))
		spaceships
			.addButton({ title: "Add a heavy-weight spaceship" })
			.on("click", () => this.automaton?.placePatternRandomly(HWSSPattern()))

		const guns = this.conwayPatterns.addFolder({
			title: "Guns",
		})
		guns
			.addButton({ title: "Add a Gosper Glider Gun" })
			.on("click", () =>
				this.automaton?.placePatternRandomly(gosperGliderGunPattern()),
			)
	}

	private setupEventListeners(): void {
		// Add onChange handler for palette selector
		this.paletteSelector.on("change", () => {
			void this.onReset()
		})

		// Algorithm selector change handler
		this.algoSelector.on("change", (event: { value: string }) => {
			const newUrl = `/${event.value}`
			window.history.pushState({}, "", newUrl)
			this.setBladesForAlgo(event.value)
			void this.onReset()
		})

		// Handle browser back/forward navigation
		window.addEventListener("popstate", () => {
			const newAlgo = getAlgorithmFromRoute()
			if (newAlgo !== this.getSettings().algo) {
				this.algoSelector.value = newAlgo
				this.setBladesForAlgo(newAlgo)
				void this.onReset()
			}
		})

		// Button handlers
		this.clearBtn.on("click", () => {
			if (this.automaton) {
				this.automaton.clear()
			}
		})

		this.resetBtn.on("click", () => {
			void this.onReset()
		})

		this.startBtn.on("click", () => {
			if (!this.automaton) return

			clearInterval(this.automaton.renderInterval)
			const settings = this.getSettings()

			switch (settings.algo) {
				case "cca-1D":
				case "rule30":
				case "rule90":
				case "rule110":
					this.automaton.start(10)
					break
				case "cca-2D":
				case "cca-2D-webgl":
					this.automaton.start(25, 2500)
					break
				case "cca-3D":
					this.automaton.start(12)
					break
				case "conway":
				case "conway-webgl":
				case "immigration":
				case "quadlife":
					this.automaton.start(25, 12000)
					break
				case "langton":
				case "langton-webgl":
					this.automaton.start(3, 12000)
					break
				case "entropy":
					this.automaton.start(25, 2500)
					break
			}
		})
	}

	private setBladesForAlgo(algo: string): void {
		switch (algo) {
			case "cca-1D":
				this.setCca1dBlades()
				break
			case "rule30":
				this.setRule30Blades()
				break
			case "rule90":
				this.setRule90Blades()
				break
			case "rule110":
				this.setRule110Blades()
				break
			case "cca-2D":
				this.setCca2dBlades()
				break
			case "cca-2D-webgl":
				this.setCca2dWebglBlades()
				break
			case "conway-webgl":
				this.setConwayWebglBlades()
				break
			case "cca-3D":
				this.setCca3dBlades()
				break
			case "conway":
				this.setConwayBlades()
				break
			case "immigration":
				this.setImmigrationBlades()
				break
			case "quadlife":
				this.setQuadLifeBlades()
				break
			case "langton":
				this.setLangtonBlades()
				break
			case "langton-webgl":
				this.setLangtonWebglBlades()
				break
			case "entropy":
				this.setEntropyBlades()
				break
			default:
				this.setCca2dBlades()
		}
	}

	private setCca1dBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.cca1dColorsCountBlade.hidden = false
		this.paletteSelector.hidden = false
	}

	private setCca2dBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.cca2dColorsCountBlade.hidden = false
		this.cca2dThresholdBlade.hidden = false
		this.resolutionBlade.hidden = false
		this.paletteSelector.hidden = false
	}

	/** Same as CCA2D but without resolution (WebGL always uses 1 pixel = 1 cell). */
	private setCca2dWebglBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.cca2dColorsCountBlade.hidden = false
		this.cca2dThresholdBlade.hidden = false
		this.paletteSelector.hidden = false
	}

	private setCca3dBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.cca3dColorsCountBlade.hidden = false
		this.cca3dThresholdBlade.hidden = false
		this.cca3dCubeDimensionBlade.hidden = false
		this.paletteSelector.hidden = false
	}

	private setConwayBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.resolutionBlade.hidden = false
		this.conwayPatterns.hidden = false
		this.clearBtn.hidden = false
	}

	/** Conway WebGL: no resolution (1 px = 1 cell), no pattern presets. */
	private setConwayWebglBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.paletteSelector.hidden = false
		this.clearBtn.hidden = false
	}

	private setImmigrationBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.resolutionBlade.hidden = false
		this.paletteSelector.hidden = false
	}

	private setQuadLifeBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.resolutionBlade.hidden = false
		this.paletteSelector.hidden = false
	}

	private setLangtonBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.resolutionBlade.hidden = false
	}

	/** Langton WebGL: no resolution (1 px = 1 cell), palette for 2 colors. */
	private setLangtonWebglBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.paletteSelector.hidden = false
		this.clearBtn.hidden = false
	}

	private setEntropyBlades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.entropyColorsCountBlade.hidden = false
		this.resolutionBlade.hidden = false
	}

	private setRule30Blades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.paletteSelector.hidden = false
	}

	private setRule90Blades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.paletteSelector.hidden = false
	}

	private setRule110Blades(): void {
		for (const blade of this.blades) blade.hidden = true
		this.paletteSelector.hidden = false
	}

	getSettings(): Settings {
		const settings: Partial<Settings> = {}
		const state = this.pane.exportState()

		// Handle regular bindings
		for (const s of state.children) {
			if (s.binding) {
				settings[s.binding.key] = s.binding.value
			}
		}

		// Handle palette selector specifically
		const paletteState = state.children.find((s) => s.label === "Color Palette")
		if (paletteState) {
			settings.palette = paletteState.value
		}

		return settings as Settings
	}

	setAutomaton(automaton: Automaton): void {
		this.automaton = automaton
	}
}
