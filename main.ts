import * as Sentry from "@sentry/browser"
import { Automaton } from "./core/Automaton"
import type { RendererKind } from "./utils/renderer-preference"
import {
	getInitialRenderer,
	saveRendererPreference,
} from "./utils/renderer-preference"
import { Controls } from "./ui/controls"

// Initialize Sentry before any other code
Sentry.init({
	dsn: import.meta.env.VITE_SENTRY_DSN,
	environment: import.meta.env.VITE_ENVIRONMENT,
	release: APP_VERSION,
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	// Tracing
	tracesSampleRate: 1.0, //  Capture 100% of the transactions
	// Session Replay
	replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
	replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
})

let controls: Controls
let automaton: Automaton
let currentRenderer: RendererKind = getInitialRenderer()

const reset = async (): Promise<void> => {
	Automaton.cleanup(automaton)
	automaton = undefined

	const oldCanvas = document.getElementById("canvas") as HTMLCanvasElement
	const parent = oldCanvas.parentNode
	if (!parent) return
	const canvasEl = document.createElement("canvas")
	canvasEl.id = "canvas"
	parent.replaceChild(canvasEl, oldCanvas)

	const width = window.innerWidth
	const height = window.innerHeight

	automaton = await Automaton.create(canvasEl, width, height, {
		renderer: currentRenderer,
	})

	controls.setAutomaton(automaton)
}

window.onload = async () => {
	const canvasEl = document.getElementById("canvas") as HTMLCanvasElement
	automaton = await Automaton.create(
		canvasEl,
		window.innerWidth,
		window.innerHeight,
		{ renderer: currentRenderer },
	)
	controls = new Controls(automaton, reset, {
		getRenderer: () => currentRenderer,
		setRenderer: (value: RendererKind) => {
			currentRenderer = value
			saveRendererPreference(value)
			void reset()
		},
	})
}

window.onresize = (): void => {
	void reset()
}
