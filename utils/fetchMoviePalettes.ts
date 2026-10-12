import chroma from "chroma-js"
import type { ListBladeApi } from "tweakpane"
import type { Movie } from "../types/MoviePalette"
import type { RGB } from "../types/RGB"
import { slugify } from "./slugify"

const hexToRgb = (hex: string): RGB | null => {
	if (!chroma.valid(hex)) return null
	const [r, g, b] = chroma(hex).rgb()
	return [r, g, b]
}

export const moviePalettes = new Map<string, { colors: RGB[] }>()

export const fetchMoviePalettes = async (
	paletteSelector: ListBladeApi<string>,
	apiUrl: string,
): Promise<void> => {
	try {
		const response = await fetch(`${apiUrl}/movies`)
		if (!response.ok) {
			console.error(`Failed to fetch movies: ${response.status}`)
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const { movies } = (await response.json()) as { movies: Partial<Movie>[] }
		const options = [{ text: "Random", value: null }]

		for (const movie of movies) {
			const rawColors = movie.palettes?.[0]?.colors
			if (!rawColors || !movie.title) continue

			const colors = rawColors.flatMap((hex) => {
				const rgb = hexToRgb(hex)
				return rgb ? [rgb] : []
			})
			if (colors.length === 0) continue

			const slug = slugify(movie.title)
			moviePalettes.set(slug, { colors })
			options.push({
				text: movie.year ? `${movie.title} (${movie.year})` : movie.title,
				value: slug,
			})
		}

		paletteSelector.options = options
	} catch {
		console.error("Failed to fetch movies")
		paletteSelector.options = [{ text: "Random", value: null }]
	}
}
