import type { ButtonApi } from "tweakpane"
import { Pane } from "tweakpane"
import type { Automaton } from "../core/Automaton"
import type { RendererKind } from "../utils/renderer-preference"

export interface RendererOptions {
	getRenderer: () => RendererKind
	setRenderer: (value: RendererKind) => void
}

export class Controls {
	private pane: Pane
	private automaton: Automaton
	private onReset: () => Promise<void>
	private rendererOptions: RendererOptions | undefined

	private clearBtn: ButtonApi
	private resetBtn: ButtonApi
	private startBtn: ButtonApi

	constructor(
		automaton: Automaton,
		onReset: () => Promise<void>,
		rendererOptions?: RendererOptions,
	) {
		this.automaton = automaton
		this.onReset = onReset
		this.rendererOptions = rendererOptions
		this.setupPane()
		this.setupBlades()
		this.setupEventListeners()
	}

	private setupPane(): void {
		this.pane = new Pane({
			title: "Parameters",
			expanded: true,
		})
	}

	private params = {
		renderer: "canvas" as RendererKind,
		stepIntervalMs: 80,
	}

	private setupBlades(): void {
		if (this.rendererOptions) {
			this.params.renderer = this.rendererOptions.getRenderer()
			this.pane
				.addBinding(this.params, "renderer", {
					options: { "WebGL": "webgl", "Canvas 2D": "canvas" },
					label: "Rendu",
				})
				.on("change", (ev) => {
					this.rendererOptions?.setRenderer(ev.value as RendererKind)
				})
		}
		this.pane.addBinding(this.params, "stepIntervalMs", {
			label: "Vitesse (ms/pas)",
			min: 20,
			max: 500,
			step: 10,
		})
		this.clearBtn = this.pane.addButton({ title: "Clear" })
		this.resetBtn = this.pane.addButton({ title: "Reset" })
		this.startBtn = this.pane.addButton({ title: "Start" })
	}

	private setupEventListeners(): void {
		this.clearBtn.on("click", () => {
			if (this.automaton) this.automaton.clear()
		})

		this.resetBtn.on("click", () => {
			void this.onReset()
		})

		this.startBtn.on("click", () => {
			if (!this.automaton) return
			clearInterval(this.automaton.renderInterval)
			this.automaton.start(this.params.stepIntervalMs, 2500)
		})
	}

	setAutomaton(automaton: Automaton): void {
		this.automaton = automaton
	}
}
