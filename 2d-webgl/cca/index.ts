import type { RGB } from "../../types/RGB"
import { Automaton2DWebGL } from "../automaton2d-webgl"

// Simulation fragment shader (GLSL ES 3.00). CCA rule: each cycle, a cell takes the next color
// (0→1→…→7→0) if at least threshold of its 8 neighbors already have that next color; otherwise it keeps its current color.
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

/** CCA 2D WebGL implementation. Uses threshold and colorsCount in the simulation shader. */
export class CCA2DWebGL extends Automaton2DWebGL {
	private threshold: number

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		threshold: number,
		colorsCount?: number,
		paletteColors?: RGB[],
	) {
		super(canvasEl, width, height, colorsCount ?? 8, paletteColors)
		this.threshold = threshold
	}

	protected getSimFragSource(): string {
		return SIM_FRAG
	}

	protected setSimUniforms(program: WebGLProgram): void {
		this.gl.uniform1f(
			this.gl.getUniformLocation(program, "u_colorsCount"),
			this.colorsCount,
		)
		this.gl.uniform1f(
			this.gl.getUniformLocation(program, "u_threshold"),
			this.threshold,
		)
	}
}
