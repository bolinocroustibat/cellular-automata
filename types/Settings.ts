export interface Settings {
	algo: string
	cca1dColorsCount?: number
	cca2dColorsCount?: number
	cca2dThreshold?: number
	cca3dColorsCount?: number
	cca3dThreshold?: number
	palette?: string
	cca3dCubeDimension?: number
	entropyColorsCount?: number
	/** A rule from CONWAY_3D_RULES, or "custom" to use conway3dCustomRule. */
	conway3dRule?: string
	conway3dCustomRule?: string
	conway3dDensity?: number
	resolution?: number
	webglResolution?: number
}
