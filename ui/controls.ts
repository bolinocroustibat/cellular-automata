import type { ButtonApi } from "tweakpane"
import { Pane } from "tweakpane"
import type { Automaton } from "../core/Automaton"

export class Controls {
	private pane: Pane
	private automaton: Automaton
	private onReset: () => Promise<void>

	private clearBtn: ButtonApi
	private resetBtn: ButtonApi
	private startBtn: ButtonApi

	constructor(automaton: Automaton, onReset: () => Promise<void>) {
		this.automaton = automaton
		this.onReset = onReset
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

	private setupBlades(): void {
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
			this.automaton.start(25, 2500)
		})
	}

	setAutomaton(automaton: Automaton): void {
		this.automaton = automaton
	}
}
