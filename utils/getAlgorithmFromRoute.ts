const VALID_ALGOS = [
	"cca-1D",
	"cca-2D",
	"cca-2D-webgl",
	"cca-3D",
	"conway",
	"conway-webgl",
	"immigration",
	"immigration-webgl",
	"quadlife",
	"quadlife-webgl",
	"langton",
	"langton-webgl",
	"entropy",
	"entropy-webgl",
	"entropy-3D",
	"conway-3D",
	"rule30",
	"rule90",
	"rule110",
] as const

export function getAlgorithmFromRoute(): string {
	const path = window.location.pathname.slice(1).toLowerCase()
	const match = VALID_ALGOS.find((algo) => algo.toLowerCase() === path)
	return match ?? "cca-2D-webgl"
}
