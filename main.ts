import * as Sentry from "@sentry/browser"
import { Automaton } from "./core/Automaton"
import { Controls } from "./ui/controls"
import { getAlgorithmFromRoute } from "./utils/getAlgorithmFromRoute"

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

const reset = async (): Promise<void> => {
	// Cleanup existing automaton
	Automaton.cleanup(automaton)
	automaton = undefined

	// Get canvas and dimensions
	const canvasEl = document.getElementById("canvas") as HTMLCanvasElement
	const width = window.innerWidth
	const height = window.innerHeight

	// Create new automaton
	automaton = await Automaton.create(
		canvasEl,
		width,
		height,
		controls.getSettings(),
	)

	// Update automaton reference in Controls
	controls.setAutomaton(automaton)
}

window.onload = async () => {
	const canvasEl = document.getElementById("canvas") as HTMLCanvasElement
	const initialAlgo = getAlgorithmFromRoute()

	// Create automaton with all needed settings
	automaton = await Automaton.create(
		canvasEl,
		window.innerWidth,
		window.innerHeight,
		{
			algo: initialAlgo,
			cca2dColorsCount: 8,
			cca2dThreshold: 2,
			cca3dColorsCount: 5,
			cca3dThreshold: 4,
			cca3dCubeDimension: 15,
			resolution: 5,
		},
	)
	controls = new Controls(automaton, reset)
}

window.onresize = (): void => {
	void reset()
}
