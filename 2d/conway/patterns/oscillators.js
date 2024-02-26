// Oscillator patterns

export const blinkerPattern = () => {
	const r = Math.random()
	if (r < 0.5) {
		return [[1, 1, 1]]
	}
	return [[1], [1], [1]]
}

export const beaconPattern = () => {
	const r = Math.random()
	if (r < 0.5) {
		return [
			[1, 1, 0, 0],
			[1, 1, 0, 0],
			[0, 0, 1, 1],
			[0, 0, 1, 1],
		]
	}
	return [
		[0, 0, 1, 1],
		[0, 0, 1, 1],
		[1, 1, 0, 0],
		[1, 1, 0, 0],
	]
}

export const pulsarPattern = () => {
	return [
		[0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
		[0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
	]
}

export const pentadecathlonPattern = () => {
	const r = Math.random()
	if (r < 0.5) {
		return [
			[0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
			[1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
			[0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
		]
	}
	return [
		[0, 1, 0],
		[0, 1, 0],
		[1, 0, 1],
		[0, 1, 0],
		[0, 1, 0],
		[0, 1, 0],
		[0, 1, 0],
		[1, 0, 1],
		[0, 1, 0],
		[0, 1, 0],
	]
}
