import chroma from "chroma-js"
import type { Cell } from "../types/Cell"
import type { RGB } from "../types/RGB"

const MOVIES_PALETTES_API = import.meta.env.VITE_MOVIES_PALETTES_API

export const pickRandomColors = (colorsCount: number): Cell[] => {
	// For 2 colors, ensure sufficient contrast
	if (colorsCount === 2) {
		const getRandomColor = () =>
			chroma.random().rgb() as [number, number, number]
		const MAX_RETRIES = 4

		let [color1, color2] = [getRandomColor(), getRandomColor()]
		let retries = 0

		while (chroma.contrast(color1, color2) <= 4.5) {
			color2 = getRandomColor()
			retries++
			if (retries > MAX_RETRIES) {
				color1 = getRandomColor()
				retries = 0
			}
		}

		return [
			{ id: 0, colorRgb: color1 },
			{ id: 1, colorRgb: color2 },
		]
	}

	// For any other number of colors, generate array directly
	return Array.from({ length: colorsCount }, (_, i) => ({
		id: i,
		colorRgb: chroma.random().rgb() as [number, number, number],
	}))
}

export const pickColors = (
	colorsCount: number,
	paletteColors?: RGB[],
): Cell[] => {
	if (paletteColors) {
		const colors: Cell[] = []
		for (let i = 0; i < Math.min(colorsCount, paletteColors.length); ++i) {
			colors[i] = { id: i, colorRgb: paletteColors[i] }
		}
		return colors
	}
	// If no palette colors provided or not enough colors, use random colors
	if (!paletteColors || paletteColors.length < colorsCount) {
		if (paletteColors) {
			console.warn(
				`Not enough colors in palette (needed: ${colorsCount}, got: ${paletteColors.length}). Using random colors instead.`,
			)
		}
		return pickRandomColors(colorsCount)
	}

	// Use palette colors
	return Array.from({ length: colorsCount }, (_, i) => ({
		id: i,
		colorRgb: paletteColors[i],
	}))
}

/*
export const pickSpectralColors = (colorsCount: number): Cell[] => {
	const chromaColors = chroma.scale('Spectral').colors(colorsCount)
	const colors: Cell[] = []
	
	for (let i = 0; i < chromaColors.length; ++i) {
		const colorRgb = chroma(chromaColors[i]).rgb()
		colors[i] = { id: i, colorRgb }
	}
	return colors
}
*/
