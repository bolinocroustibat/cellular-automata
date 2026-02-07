import type { RGB } from "../../types/RGB"
import { Automaton2DWebGL } from "../automaton2d-webgl"

// Fullscreen quad vertex shader (same as base).
const VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Passthrough sim shader (Langton doesn't use parallel sim; we override performSimStep).
const SIM_FRAG_PASSTHROUGH = `#version 300 es
precision highp float;
uniform sampler2D u_state;
in vec2 v_uv;
out vec4 out_color;
void main() {
  out_color = texture(u_state, v_uv);
}
`

// Copy state texture to the other buffer, overwriting one pixel at u_flipCoord with u_flipValue.
const COPY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec2 u_flipCoord;
uniform float u_flipValue;
in vec2 v_uv;
out vec4 out_color;
void main() {
  if (ivec2(gl_FragCoord.xy) == ivec2(int(u_flipCoord.x), int(u_flipCoord.y))) {
    out_color = vec4(u_flipValue, 0.0, 0.0, 1.0);
  } else {
    out_color = texture(u_state, v_uv);
  }
}
`

function createProgram(
	gl: WebGL2RenderingContext,
	vertSource: string,
	fragSource: string,
): WebGLProgram {
	const vert = gl.createShader(gl.VERTEX_SHADER)
	if (!vert) throw new Error("Could not create vertex shader")
	gl.shaderSource(vert, vertSource)
	gl.compileShader(vert)
	if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(vert)
		gl.deleteShader(vert)
		throw new Error(`Vertex shader: ${log}`)
	}
	const frag = gl.createShader(gl.FRAGMENT_SHADER)
	if (!frag) throw new Error("Could not create fragment shader")
	gl.shaderSource(frag, fragSource)
	gl.compileShader(frag)
	if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(frag)
		gl.deleteShader(vert)
		gl.deleteShader(frag)
		throw new Error(`Fragment shader: ${log}`)
	}
	const program = gl.createProgram()
	if (!program) throw new Error("Could not create program")
	gl.attachShader(program, vert)
	gl.attachShader(program, frag)
	gl.linkProgram(program)
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(program)
		gl.deleteProgram(program)
		gl.deleteShader(vert)
		gl.deleteShader(frag)
		throw new Error(`Program link: ${log}`)
	}
	gl.deleteShader(vert)
	gl.deleteShader(frag)
	return program
}

/** Langton's ant (WebGL). Binary grid; ant moves and flips cells (turn R on white, L on black). Toroidal wrap. */
export class Langton2DWebGL extends Automaton2DWebGL {
	private copyProgram: WebGLProgram
	private antPositionX: number
	private antPositionY: number
	private orientationX: number
	private orientationY: number
	private pixelBuffer: Uint8Array

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		paletteColors?: RGB[],
	) {
		super(canvasEl, width, height, 2, paletteColors)
		this.copyProgram = createProgram(this.gl, VERT, COPY_FRAG)
		this.pixelBuffer = new Uint8Array(4)
		// Ant at center; orientation left (-1, 0) like 2d/langton
		this.antPositionX = Math.floor(this.width / 2)
		this.antPositionY = Math.floor(this.height / 2)
		this.orientationX = -1
		this.orientationY = 0
		// Start with uniform state (all 0) and redraw
		this.stateIds.fill(0)
		this.uploadStateToTexture(this.stateTextures[this.readIndex])
		this.drawDisplay()
	}

	protected getSimFragSource(): string {
		return SIM_FRAG_PASSTHROUGH
	}

	protected performSimStep(): void {
		// Cell to flip is current ant position (before move). Texel: (antX, height-1-antY).
		const flipTexelX = this.antPositionX
		const flipTexelY = this.height - 1 - this.antPositionY

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbos[this.readIndex])
		this.gl.readPixels(
			flipTexelX,
			flipTexelY,
			1,
			1,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			this.pixelBuffer,
		)
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)

		const r = this.pixelBuffer[0] / 255
		const currentId = Math.round(r * this.colorsCount)
		const isWhite = currentId === 0
		const newColorId = isWhite ? 1 : 0
		const newColorNorm = newColorId / this.colorsCount

		// Turn: white → 90° clockwise, black → 90° counter-clockwise (same as 2d/langton)
		const turnX = this.orientationX
		const turnY = this.orientationY
		if (isWhite) {
			this.orientationX = -turnY
			this.orientationY = turnX
		} else {
			this.orientationX = turnY
			this.orientationY = -turnX
		}

		// Move forward and wrap toroidally
		this.antPositionX = ((this.antPositionX + this.orientationX) % this.width + this.width) % this.width
		this.antPositionY = ((this.antPositionY + this.orientationY) % this.height + this.height) % this.height

		// Copy state to the other buffer, flipping the cell at (flipTexelX, flipTexelY)
		const writeIndex = 1 - this.readIndex

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbos[writeIndex])
		this.gl.viewport(0, 0, this.width, this.height)
		this.gl.useProgram(this.copyProgram)
		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.stateTextures[this.readIndex])
		this.gl.uniform1i(this.gl.getUniformLocation(this.copyProgram, "u_state"), 0)
		this.gl.uniform2f(
			this.gl.getUniformLocation(this.copyProgram, "u_flipCoord"),
			flipTexelX,
			flipTexelY,
		)
		this.gl.uniform1f(
			this.gl.getUniformLocation(this.copyProgram, "u_flipValue"),
			newColorNorm,
		)
		const posLoc = this.gl.getAttribLocation(this.copyProgram, "a_position")
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer)
		this.gl.enableVertexAttribArray(posLoc)
		this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0)
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6)
		this.readIndex = writeIndex
	}

	clear(): void {
		if (this.renderInterval) {
			clearInterval(this.renderInterval)
			this.renderInterval = undefined
		}
		this.antPositionX = Math.floor(this.width / 2)
		this.antPositionY = Math.floor(this.height / 2)
		this.orientationX = -1
		this.orientationY = 0
		this.stateIds.fill(0)
		this.uploadStateToTexture(this.stateTextures[this.readIndex])
		this.drawDisplay()
	}
}
