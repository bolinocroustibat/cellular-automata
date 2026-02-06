export type RendererKind = "webgl" | "canvas"

const STORAGE_KEY = "automaton-renderer"
const URL_PARAM = "renderer"

function parseRenderer(value: string | null): RendererKind | null {
	if (value === "webgl" || value === "canvas") return value
	return null
}

/** Reads renderer from URL (?renderer=...) then localStorage, then default. */
export function getInitialRenderer(defaultValue: RendererKind = "canvas"): RendererKind {
	const url = new URL(window.location.href)
	const fromUrl = parseRenderer(url.searchParams.get(URL_PARAM))
	if (fromUrl) return fromUrl
	const fromStorage = parseRenderer(localStorage.getItem(STORAGE_KEY))
	if (fromStorage) return fromStorage
	return defaultValue
}

export function saveRendererPreference(value: RendererKind): void {
	localStorage.setItem(STORAGE_KEY, value)
}
