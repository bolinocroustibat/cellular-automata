import type { Cell } from "../types/Cell"
import { pickColors } from "../utils/pickColors"

const VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_image;
in vec2 v_uv;
out vec4 out_color;
void main() {
  out_color = texture(u_image, v_uv);
}
`

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])

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

const COLORS_COUNT = 8
const THRESHOLD = 2

export class Automaton2DWebGL {
	private gl: WebGL2RenderingContext
	private width: number
	private height: number
	private program: WebGLProgram
	private quadBuffer: WebGLBuffer
	private texture: WebGLTexture
	private imageData: Uint8Array
	private stateIds: Uint8Array
	private colors: Cell[]
	private threshold: number
	renderInterval: NodeJS.Timeout | undefined

	constructor(canvasEl: HTMLCanvasElement, width: number, height: number) {
		const gl = canvasEl.getContext("webgl2")
		if (!gl) throw new Error("WebGL2 not supported")
		this.gl = gl

		this.width = width
		this.height = height
		this.threshold = THRESHOLD
		canvasEl.width = width
		canvasEl.height = height
		canvasEl.style.margin = "auto"

		this.colors = pickColors(COLORS_COUNT)
		this.program = createProgram(this.gl, VERT, FRAG)

		const quadBuffer = this.gl.createBuffer()
		if (!quadBuffer) throw new Error("Could not create buffer")
		this.quadBuffer = quadBuffer
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, QUAD, this.gl.STATIC_DRAW)

		this.stateIds = new Uint8Array(this.width * this.height)
		this.imageData = new Uint8Array(this.width * this.height * 4)
		const tex = this.gl.createTexture()
		if (!tex) throw new Error("Could not create texture")
		this.texture = tex
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
		this.gl.texParameteri(this.gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		this.gl.texParameteri(this.gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		this.gl.texParameteri(this.gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		this.gl.bindTexture(this.gl.TEXTURE_2D, null)

		this.fillRandomAndDraw()
	}

	private getStateId(x: number, y: number): number {
		const wx = (x + this.width) % this.width
		const wy = (y + this.height) % this.height
		return this.stateIds[wy * this.width + wx]
	}

	/** One CCA step: next color = (id+1)%8; if ≥ threshold neighbors have next color, cell becomes it. */
	private stepCCA(): void {
		const next = new Uint8Array(this.width * this.height)
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const id = this.getStateId(x, y)
				const nextId = (id + 1) % COLORS_COUNT
				let count = 0
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx !== 0 || dy !== 0) {
							if (this.getStateId(x + dx, y + dy) === nextId) count++
						}
					}
				}
				next[y * this.width + x] = count >= this.threshold ? nextId : id
			}
		}
		this.stateIds = next
	}

	private stateIdsToImageData(): void {
		for (let i = 0; i < this.stateIds.length; i++) {
			const c = this.colors[this.stateIds[i]]
			const [r, g, b] = c.colorRgb
			this.imageData[i * 4] = Math.round(r)
			this.imageData[i * 4 + 1] = Math.round(g)
			this.imageData[i * 4 + 2] = Math.round(b)
			this.imageData[i * 4 + 3] = 255
		}
	}

	private uploadAndDraw(): void {
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA8,
			this.width,
			this.height,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			this.imageData,
		)
		this.gl.bindTexture(this.gl.TEXTURE_2D, null)
		this.draw()
	}

	/** Fill state with random 0..7, then upload and draw. */
	private fillRandomAndDraw(): void {
		for (let i = 0; i < this.stateIds.length; i++) {
			this.stateIds[i] = Math.floor(Math.random() * COLORS_COUNT)
		}
		this.stateIdsToImageData()
		this.uploadAndDraw()
	}

	/** Fill state with 0 (first color), then upload and draw. */
	private fillUniformAndDraw(): void {
		this.stateIds.fill(0)
		this.stateIdsToImageData()
		this.uploadAndDraw()
	}

	private draw(): void {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
		this.gl.viewport(0, 0, this.width, this.height)
		this.gl.useProgram(this.program)
		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
		const loc = this.gl.getUniformLocation(this.program, "u_image")
		this.gl.uniform1i(loc, 0)
		const posLoc = this.gl.getAttribLocation(this.program, "a_position")
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer)
		this.gl.enableVertexAttribArray(posLoc)
		this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0)
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6)
	}

	clear(): void {
		if (this.renderInterval) {
			clearInterval(this.renderInterval)
			this.renderInterval = undefined
		}
		this.fillUniformAndDraw()
	}

	start(intervalMs: number, maxIterations: number): void {
		let i = 0
		this.renderInterval = setInterval(() => {
			this.stepCCA()
			this.stateIdsToImageData()
			this.uploadAndDraw()
			if (++i >= maxIterations && this.renderInterval) {
				clearInterval(this.renderInterval)
				this.renderInterval = undefined
			}
		}, intervalMs)
	}
}
