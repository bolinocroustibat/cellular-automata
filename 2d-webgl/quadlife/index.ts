import type { RGB } from "../../types/RGB"
import { Automaton2DWebGL } from "../automaton2d-webgl"

// QuadLife: Life with four alive colors (1–4). Dead is 0.
// Birth at exactly 3 alive neighbors:
// - one strict majority (3, or 2+1) takes that color
// - three distinct colors take the missing alive color (ids 1+2+3+4 = 10)
const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform float u_colorsCount;
uniform vec2 u_texelSize;
in vec2 v_uv;
out vec4 out_color;
void main() {
  float currentId = floor(texture(u_state, v_uv).r * u_colorsCount + 0.5);
  float c1 = 0.0;
  float c2 = 0.0;
  float c3 = 0.0;
  float c4 = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx != 0 || dy != 0) {
        vec2 nuv = fract(v_uv + vec2(float(dx), float(dy)) * u_texelSize);
        float nId = floor(texture(u_state, nuv).r * u_colorsCount + 0.5);
        if (abs(nId - 1.0) < 0.5) c1 += 1.0;
        else if (abs(nId - 2.0) < 0.5) c2 += 1.0;
        else if (abs(nId - 3.0) < 0.5) c3 += 1.0;
        else if (abs(nId - 4.0) < 0.5) c4 += 1.0;
      }
    }
  }
  float aliveCount = c1 + c2 + c3 + c4;
  bool alive = currentId > 0.5;
  bool birth = !alive && aliveCount > 2.5 && aliveCount < 3.5;
  bool survive = alive && aliveCount >= 2.0 && aliveCount <= 3.0;
  float outId = currentId;
  if (alive && !survive) {
    outId = 0.0;
  } else if (birth) {
    float maxCount = max(max(c1, c2), max(c3, c4));
    if (maxCount < 1.5) {
      float sum = c1 + 2.0 * c2 + 3.0 * c3 + 4.0 * c4;
      outId = 10.0 - sum;
    } else if (c1 >= maxCount - 0.5) {
      outId = 1.0;
    } else if (c2 >= maxCount - 0.5) {
      outId = 2.0;
    } else if (c3 >= maxCount - 0.5) {
      outId = 3.0;
    } else {
      outId = 4.0;
    }
  }
  out_color = vec4(outId / u_colorsCount, 0.0, 0.0, 1.0);
}
`

/** QuadLife (WebGL). Dead (0) plus four alive colors. */
export class QuadLife2DWebGL extends Automaton2DWebGL {
	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		paletteColors?: RGB[],
	) {
		super(canvasEl, width, height, 5, paletteColors)
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
