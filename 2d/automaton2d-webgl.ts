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

const DISPLAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform sampler2D u_palette;
uniform float u_colorsCount;
in vec2 v_uv;
out vec4 out_color;
void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  float v = texture(u_state, uv).r;
  float id = floor(v * u_colorsCount + 0.5);
  float u = (id + 0.5) / u_colorsCount;
  out_color = vec4(texture(u_palette, vec2(u, 0.5)).rgb, 1.0);
}
`

// Règle CCA : à chaque cycle, un pixel prend la couleur suivante (0→1→…→7→0)
// si au moins threshold parmi ses 8 voisins ont déjà cette couleur suivante ; sinon il garde sa couleur.
const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform float u_colorsCount;
uniform float u_threshold;
uniform vec2 u_texelSize;
in vec2 v_uv;
out vec4 out_color;
void main() {
  float current = texture(u_state, v_uv).r;
  float currentId = floor(current * u_colorsCount + 0.5);
  float nextId = mod(currentId + 1.0, u_colorsCount);
  float count = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx != 0 || dy != 0) {
        vec2 nuv = v_uv + vec2(float(dx), float(dy)) * u_texelSize;
        nuv = fract(nuv);
        float n = texture(u_state, nuv).r;
        float nId = floor(n * u_colorsCount + 0.5);
        if (abs(nId - nextId) < 0.5) count += 1.0;
      }
    }
  }
  float outId = count >= u_threshold ? nextId : currentId;
  float norm = outId / u_colorsCount;
  out_color = vec4(norm, 0.0, 0.0, 1.0);
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

function createPaletteTexture(
	gl: WebGL2RenderingContext,
	colors: Cell[],
): WebGLTexture {
	const data = new Uint8Array(colors.length * 3)
	for (let i = 0; i < colors.length; i++) {
		const [r, g, b] = colors[i].colorRgb
		data[i * 3] = Math.round(r)
		data[i * 3 + 1] = Math.round(g)
		data[i * 3 + 2] = Math.round(b)
	}
	const tex = gl.createTexture()
	if (!tex) throw new Error("Could not create palette texture")
	gl.bindTexture(gl.TEXTURE_2D, tex)
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGB8,
		colors.length,
		1,
		0,
		gl.RGB,
		gl.UNSIGNED_BYTE,
		data,
	)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.bindTexture(gl.TEXTURE_2D, null)
	return tex
}

/** Encode color id 0..N-1 as R channel id/N so shader floor(v*N+0.5) recovers id. */
function stateIdsToRgbaUpload(stateIds: Uint8Array, colorsCount: number): Uint8Array {
	const rgba = new Uint8Array(stateIds.length * 4)
	for (let i = 0; i < stateIds.length; i++) {
		const id = Math.min(stateIds[i], colorsCount - 1)
		const norm = id / colorsCount
		rgba[i * 4] = Math.min(255, Math.round(norm * 255))
		rgba[i * 4 + 1] = 0
		rgba[i * 4 + 2] = 0
		rgba[i * 4 + 3] = 255
	}
	return rgba
}

const COLORS_COUNT = 8
const THRESHOLD = 2

export class Automaton2DWebGL {
	private gl: WebGL2RenderingContext
	private width: number
	private height: number
	private displayProgram: WebGLProgram
	private simProgram: WebGLProgram
	private quadBuffer: WebGLBuffer
	private stateTextures: [WebGLTexture, WebGLTexture]
	private fbos: [WebGLFramebuffer, WebGLFramebuffer]
	private readIndex: number
	private paletteTexture: WebGLTexture
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
		this.displayProgram = createProgram(this.gl, VERT, DISPLAY_FRAG)
		this.simProgram = createProgram(this.gl, VERT, SIM_FRAG)

		const quadBuffer = this.gl.createBuffer()
		if (!quadBuffer) throw new Error("Could not create buffer")
		this.quadBuffer = quadBuffer
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer)
		this.gl.bufferData(this.gl.ARRAY_BUFFER, QUAD, this.gl.STATIC_DRAW)

		this.stateIds = new Uint8Array(this.width * this.height)
		this.stateTextures = [
			this.createStateTexture(),
			this.createStateTexture(),
		]
		const fbo0 = this.gl.createFramebuffer()
		const fbo1 = this.gl.createFramebuffer()
		if (!fbo0 || !fbo1) throw new Error("Could not create framebuffers")
		this.fbos = [fbo0, fbo1]
		for (let i = 0; i < 2; i++) {
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbos[i])
			this.gl.framebufferTexture2D(
				this.gl.FRAMEBUFFER,
				this.gl.COLOR_ATTACHMENT0,
				this.gl.TEXTURE_2D,
				this.stateTextures[i],
				0,
			)
		}
		this.readIndex = 0
		this.paletteTexture = createPaletteTexture(this.gl, this.colors)

		this.fillRandomAndDraw()
	}

	private createStateTexture(): WebGLTexture {
		const tex = this.gl.createTexture()
		if (!tex) throw new Error("Could not create state texture")
		this.gl.bindTexture(this.gl.TEXTURE_2D, tex)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA8,
			this.width,
			this.height,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			null,
		)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT)
		this.gl.bindTexture(this.gl.TEXTURE_2D, null)
		return tex
	}

	private uploadStateToTexture(tex: WebGLTexture): void {
		const rgba = stateIdsToRgbaUpload(this.stateIds, COLORS_COUNT)
		this.gl.bindTexture(this.gl.TEXTURE_2D, tex)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA8,
			this.width,
			this.height,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			rgba,
		)
		this.gl.bindTexture(this.gl.TEXTURE_2D, null)
	}

	/** One CCA step on GPU: read stateTextures[readIndex], write to the other, then swap. */
	private runSimStep(): void {
		const writeIndex = 1 - this.readIndex
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbos[writeIndex])
		this.gl.viewport(0, 0, this.width, this.height)
		this.gl.useProgram(this.simProgram)
		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.stateTextures[this.readIndex])
		this.gl.uniform1i(this.gl.getUniformLocation(this.simProgram, "u_state"), 0)
		this.gl.uniform1f(this.gl.getUniformLocation(this.simProgram, "u_colorsCount"), COLORS_COUNT)
		this.gl.uniform1f(this.gl.getUniformLocation(this.simProgram, "u_threshold"), this.threshold)
		this.gl.uniform2f(
			this.gl.getUniformLocation(this.simProgram, "u_texelSize"),
			1 / this.width,
			1 / this.height,
		)
		const posLoc = this.gl.getAttribLocation(this.simProgram, "a_position")
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer)
		this.gl.enableVertexAttribArray(posLoc)
		this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0)
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6)
		this.readIndex = writeIndex
	}

	private drawDisplay(): void {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
		this.gl.viewport(0, 0, this.width, this.height)
		this.gl.useProgram(this.displayProgram)
		this.gl.activeTexture(this.gl.TEXTURE0)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.stateTextures[this.readIndex])
		this.gl.activeTexture(this.gl.TEXTURE1)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.paletteTexture)
		this.gl.uniform1i(this.gl.getUniformLocation(this.displayProgram, "u_state"), 0)
		this.gl.uniform1i(this.gl.getUniformLocation(this.displayProgram, "u_palette"), 1)
		this.gl.uniform1f(this.gl.getUniformLocation(this.displayProgram, "u_colorsCount"), COLORS_COUNT)
		const posLoc = this.gl.getAttribLocation(this.displayProgram, "a_position")
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer)
		this.gl.enableVertexAttribArray(posLoc)
		this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0)
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6)
	}

	private fillRandomAndDraw(): void {
		for (let i = 0; i < this.stateIds.length; i++) {
			this.stateIds[i] = Math.floor(Math.random() * COLORS_COUNT)
		}
		this.uploadStateToTexture(this.stateTextures[this.readIndex])
		this.drawDisplay()
	}

	private fillUniformAndDraw(): void {
		this.stateIds.fill(0)
		this.uploadStateToTexture(this.stateTextures[this.readIndex])
		this.drawDisplay()
	}

	private stepAndDisplay(): void {
		this.runSimStep()
		this.drawDisplay()
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
			this.stepAndDisplay()
			if (++i >= maxIterations && this.renderInterval) {
				clearInterval(this.renderInterval)
				this.renderInterval = undefined
			}
		}, intervalMs)
	}
}
