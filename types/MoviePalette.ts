export interface Movie {
	id: number
	title: string
	type?: string
	status?: string
	path?: string
	director?: string
	year?: string
	length?: number
	frames?: number
	added?: string // DATETIME field
	palettes?: MoviePalette[] // Virtual field for relationships
}

export interface MoviePalette {
	id: string
	movie_id: number
	active?: boolean
	calculation_date?: string // DATETIME field
	calculation_duration_seconds?: number
	is_black_and_white?: boolean
	colors: string[] // hex colors from the API, e.g. "#29231b"
	clusters_nb: number
	frame_skip?: number
	resize_width?: number
	resize_height?: number
	batch_size?: number
	clustering_method: string
	color_space?: string
	saturation_factor?: string
	saturation_threshold?: number
	runtime?: string
}
