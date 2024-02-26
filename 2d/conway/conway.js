import { pickColors } from "../../utils/pickColors"
import { Automaton2D } from "../automaton2d"

import { gosperGliderGunPattern } from "./patterns/guns"
import {
	beaconPattern,
	blinkerPattern,
	pentadecathlonPattern,
	pulsarPattern,
} from "./patterns/oscillators"
import {
	HWSSPattern,
	LWSSPattern,
	MWSSPattern,
	gliderPattern,
} from "./patterns/spaceships"
import {
	beehivePattern,
	blockPattern,
	boatPattern,
	loafPattern,
} from "./patterns/still_lifes"

export class ConwayAutomaton extends Automaton2D {
	constructor(...args) {
		super(...args)
		this.colorsCount = 2
		this.colors = pickColors(this.colorsCount)

		clearInterval(this.renderInterval)

		this.setUniformStateAndRender()

		// Manual populating
		this.canvasEl.addEventListener("mousedown", (event) => {
			const [x, y] = getCursorPosition(this.canvasEl, this.resolution, event)
			this.state[y][x] = this.colors[1]
			this.fillSquare(this.colors[1], x * this.resolution, y * this.resolution)
		})

		// Add patterns at random positions
		// Conway patterns: https://blog.amandaghassaei.com/2020/05/01/the-recursive-universe/
		// Still lifes
		this.placePatternRandomly(blockPattern)
		this.placePatternRandomly(loafPattern)
		this.placePatternRandomly(boatPattern)
		this.placePatternRandomly(beehivePattern)
		// Oscillators
		this.placePatternRandomly(blinkerPattern())
		this.placePatternRandomly(beaconPattern())
		this.placePatternRandomly(pulsarPattern())
		this.placePatternRandomly(pentadecathlonPattern())
		// Spaceships
		this.placePatternRandomly(gliderPattern())
		this.placePatternRandomly(LWSSPattern())
		this.placePatternRandomly(MWSSPattern())
		this.placePatternRandomly(HWSSPattern())
		// Guns
		this.placePatternRandomly(gosperGliderGunPattern())
	}

	updateState = () => {
		const newState = []
		const colorOff = this.colors[0]
		const colorOn = this.colors[1]
		for (let y = 0; y < this.rowsCount; ++y) {
			newState[y] = []
			for (let x = 0; x < this.colsCount; ++x) {
				const neighbours = this.getNeighborsColors(x, y)

				// Analyse neighbors info
				let nbAlive = 0
				for (const cell of neighbours) {
					if (cell === colorOn) nbAlive++
				}

				// Change the nextState according to the neighbors
				const isCellAlive = this.state[y][x] === colorOn
				const isUnderpopulated = nbAlive < 2
				const isOverpopulated = nbAlive > 3
				const isReproduction = nbAlive === 3

				if (
					(isCellAlive && (isUnderpopulated || isOverpopulated)) ||
					(!isCellAlive && isReproduction)
				) {
					newState[y][x] = isCellAlive ? colorOff : colorOn
				} else {
					newState[y][x] = this.state[y][x]
				}

				// Update canvas pixels
				// Optimization - fill pixels only if color value changes from previous state
				if (newState[y][x] !== this.state[y][x]) {
					this.fillSquare(
						newState[y][x],
						x * this.resolution,
						y * this.resolution,
					)
				}
			}
		}
		this.state = newState
	}
}
