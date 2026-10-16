import type { RGB } from "../../types/RGB"
import { randomInt } from "../../utils/randomInt"
import { Automaton2DWebGL } from "../automaton2d-webgl"

// Simulation fragment shader (GLSL ES 3.00). Game of Life: cell is alive (1) if 3 neighbors,
// or if currently alive and 2 or 3 neighbors; otherwise dead (0). Uses u_colorsCount = 2 for decode/encode.
const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform float u_colorsCount;
uniform vec2 u_texelSize;
in vec2 v_uv;
out vec4 out_color;
void main() {
  float current = texture(u_state, v_uv).r;
  float currentId = floor(current * u_colorsCount + 0.5);
  float count = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx != 0 || dy != 0) {
        vec2 nuv = v_uv + vec2(float(dx), float(dy)) * u_texelSize;
        nuv = fract(nuv);
        float n = texture(u_state, nuv).r;
        float nId = floor(n * u_colorsCount + 0.5);
        if (nId > 0.5) count += 1.0;
      }
    }
  }
  float alive = (currentId > 0.5) ? 1.0 : 0.0;
  bool birth = alive < 0.5 && count >= 2.5 && count <= 3.5;
  bool survive = alive > 0.5 && count >= 2.0 && count <= 3.0;
  float outId = (birth || survive) ? 1.0 : 0.0;
  float norm = outId / u_colorsCount;
  out_color = vec4(norm, 0.0, 0.0, 1.0);
}
`

/** Conway's Game of Life (WebGL). Binary state: dead (0) or alive (1). Uses 2 colors in palette. */
export class Conway2DWebGL extends Automaton2DWebGL {
	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		paletteColors?: RGB[],
		resolution = 2,
	) {
		super(canvasEl, width, height, 2, paletteColors, resolution)
		const canvas = this.gl.canvas as HTMLCanvasElement
		canvas.addEventListener("mousedown", (event: MouseEvent) => {
			const cell = this.cellFromEvent(event)
			if (!cell) return
			const [x, y] = cell
			this.paintCell(x, y, 1)
		})
	}

	/** Copy the current GPU grid back into stateIds. The texture is ahead of stateIds after a step. */
	private syncStateFromGpu(): void {
		const gl = this.gl
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[this.readIndex])
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null)
			return
		}
		const rgba = new Uint8Array(this.width * this.height * 4)
		gl.readPixels(
			0,
			0,
			this.width,
			this.height,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			rgba,
		)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		for (let i = 0; i < this.stateIds.length; i++) {
			const id = Math.round((rgba[i * 4] / 255) * this.colorsCount)
			this.stateIds[i] = Math.min(this.colorsCount - 1, Math.max(0, id))
		}
	}

	/** Screen y grows downward, matching the canvas Conway grid. */
	private storedIndex(x: number, yFromTop: number): number {
		const storedY = this.height - 1 - yFromTop
		return storedY * this.width + x
	}

	private cellFromEvent(event: MouseEvent): [number, number] | null {
		const canvas = this.gl.canvas as HTMLCanvasElement
		const rect = canvas.getBoundingClientRect()
		if (rect.width === 0 || rect.height === 0) return null
		const x = Math.floor(
			((event.clientX - rect.left) / rect.width) * this.width,
		)
		const y = Math.floor(
			((event.clientY - rect.top) / rect.height) * this.height,
		)
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null
		return [x, y]
	}

	private paintCell(x: number, yFromTop: number, id: number): void {
		this.syncStateFromGpu()
		this.stateIds[this.storedIndex(x, yFromTop)] = id
		this.uploadStateToTexture(this.stateTextures[this.readIndex])
		this.drawDisplay()
	}

	placePatternRandomly(pattern: number[][]): void {
		if (pattern.length === 0 || pattern[0].length === 0) return
		if (pattern[0].length > this.width || pattern.length > this.height) return
		this.syncStateFromGpu()
		const posX = randomInt(0, this.width - pattern[0].length)
		const posY = randomInt(0, this.height - pattern.length)
		for (let y = 0; y < pattern.length; y++) {
			for (let x = 0; x < pattern[y].length; x++) {
				this.stateIds[this.storedIndex(posX + x, posY + y)] = pattern[y][x]
			}
		}
		this.uploadStateToTexture(this.stateTextures[this.readIndex])
		this.drawDisplay()
	}

	protected getSimFragSource(): string {
		return SIM_FRAG
	}

	protected setSimUniforms(program: WebGLProgram): void {
		this.gl.uniform1f(
			this.gl.getUniformLocation(program, "u_colorsCount"),
			this.colorsCount,
		)
	}
}
