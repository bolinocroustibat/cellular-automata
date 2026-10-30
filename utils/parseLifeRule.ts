/** Birth and survival neighbor counts as bitmasks: bit k is set when k live neighbors apply. */
export interface LifeRule {
	readonly survive: number
	readonly birth: number
}

const MAX_NEIGHBOURS = 26

/** Parse "4-8" or "2,6,9" into a bitmask. Empty means no count. */
const parseCounts = (counts: string): number | null => {
	if (counts === "") return 0
	let mask = 0
	for (const part of counts.split(",")) {
		const match = /^(\d+)(?:-(\d+))?$/.exec(part)
		if (!match) return null
		const from = Number(match[1])
		const to = match[2] === undefined ? from : Number(match[2])
		if (from > to || to > MAX_NEIGHBOURS) return null
		for (let k = from; k <= to; k++) mask |= 1 << k
	}
	return mask
}

/** Parse a rule in S/B notation, e.g. "S4-8/B7" or "B7/S4-8". Returns null when invalid. */
export const parseLifeRule = (rule: string): LifeRule | null => {
	const compact = rule.replace(/\s+/g, "").toUpperCase()
	const surviveFirst = /^S([\d,-]*)\/B([\d,-]*)$/.exec(compact)
	const birthFirst = /^B([\d,-]*)\/S([\d,-]*)$/.exec(compact)
	const counts = surviveFirst
		? { survive: surviveFirst[1], birth: surviveFirst[2] }
		: birthFirst
			? { survive: birthFirst[2], birth: birthFirst[1] }
			: null
	if (!counts) return null
	const survive = parseCounts(counts.survive)
	const birth = parseCounts(counts.birth)
	if (survive === null || birth === null) return null
	return { survive, birth }
}
