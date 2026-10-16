import type { RGB } from "../../types/RGB"
import { Automaton2DWebGL } from "../automaton2d-webgl"

// Immigration: Life with two alive colors (1 and 2). Dead is 0.
// Birth at exactly 3 alive neighbors takes the majority alive color.
// With 3 neighbors and 2 colors, one color always has at least 2 votes.
const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform float u_colorsCount;
uniform vec2 u_texelSize;
in vec2 v_uv;
out vec4 out_color;
void main() {
  float currentId = floor(texture(u_state, v_uv).r * u_colorsCount + 0.5);
  float count1 = 0.0;
  float count2 = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx != 0 || dy != 0) {
        vec2 nuv = fract(v_uv + vec2(float(dx), float(dy)) * u_texelSize);
        float nId = floor(texture(u_state, nuv).r * u_colorsCount + 0.5);
        if (abs(nId - 1.0) < 0.5) count1 += 1.0;
        else if (abs(nId - 2.0) < 0.5) count2 += 1.0;
      }
    }
  }
  float aliveCount = count1 + count2;
  bool alive = currentId > 0.5;
  bool birth = !alive && aliveCount > 2.5 && aliveCount < 3.5;
  bool survive = alive && aliveCount >= 2.0 && aliveCount <= 3.0;
  float outId = currentId;
  if (alive && !survive) {
    outId = 0.0;
  } else if (birth) {
    outId = count1 > count2 ? 1.0 : 2.0;
  }
  out_color = vec4(outId / u_colorsCount, 0.0, 0.0, 1.0);
}
`

/** Immigration game (WebGL). Dead (0) plus two alive colors. */
export class Immigration2DWebGL extends Automaton2DWebGL {
	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		paletteColors?: RGB[],
		resolution = 2,
	) {
		super(canvasEl, width, height, 3, paletteColors, resolution)
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
