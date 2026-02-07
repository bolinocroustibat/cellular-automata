const VALID_ALGOS = [
	"cca-1D",
	"cca-2D",
	"cca-2D-webgl",
	"cca-3D",
	"conway",
	"conway-webgl",
	"immigration",
	"quadlife",
	"langton",
	"langton-webgl",
	"entropy",
	"rule30",
	"rule90",
	"rule110",
] as const

export function getAlgorithmFromRoute(): string {
	const path = window.location.pathname.slice(1).toLowerCase()
	return VALID_ALGOS.includes(path as (typeof VALID_ALGOS)[number])
		? path
		: "cca-2D"
}
