import type { RGB } from "../../types/RGB"
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
	) {
		super(canvasEl, width, height, 2, paletteColors)
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
