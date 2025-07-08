import { pickColors } from "../../utils/pickColors"
import { Automaton2D } from "../automaton2d"

export class LangtonAutomaton extends Automaton2D {
	private positionX: number
	private positionY: number
	private orientationX: number
	private orientationY: number

	constructor(...args: ConstructorParameters<typeof Automaton2D>) {
		super(...args)
		this.colorsCount = 2
		this.colors = pickColors(this.colorsCount)

		this.setUniformStateAndRender()

		// Initial values for the cursor (has to be set after the initial state)
		this.positionX = Math.round(this.state[0].length / 2 - 1)
		this.positionY = Math.round(this.state.length / 2 - 1)
		this.orientationX = -1 // start orientated towards left
		this.orientationY = 0
	}

	private getCurrentPositionColorId = (): number => {
		// // TODO: check if position is out of bounds
		// let x = (this.positionX === -1) ? this.colsCount - 1 : this.positionX
		// x = (this.positionX === this.colsCount) ? 0 : this.positionX

		// let y = (this.positionY === -1) ? this.rowsCount - 1 : this.positionY
		// y = (this.positionY === this.rowsCount) ? 0 : this.positionY
		return this.state[this.positionY][this.positionX].id
	}

	protected updateState = (): void => {
		const turnX: number = this.orientationX
		const turnY: number = this.orientationY

		if (this.getCurrentPositionColorId() === this.colors[0].id) {
			// Flip the color of the current cell
			this.state[this.positionY][this.positionX] = this.colors[1]
			this.markDirty(this.positionX, this.positionY)
			// Turn 90° clockwise
			this.orientationX = -turnY
			this.orientationY = turnX
		} else if (this.getCurrentPositionColorId() === this.colors[1].id) {
			// Flip the color of the current cell
			this.state[this.positionY][this.positionX] = this.colors[0]
			this.markDirty(this.positionX, this.positionY)
			// Turn 90° counter-clockwise
			this.orientationX = turnY
			this.orientationY = -turnX
		}

		// console.log(
		// 	'\npositionX:' + this.positionX +
		// 	'/ positionY:' + this.positionY +
		// 	'/ current color:' + this.state[this.positionX][this.positionY] +
		// 	'/ orientationX:' + this.orientationX +
		// 	'/ orientationY:' + this.orientationY
		// )

		// Move forward
		this.positionX = this.positionX + this.orientationX
		this.positionY = this.positionY + this.orientationY
		
		// Render only dirty cells (handled by parent class)
		this.render()
	}
}
