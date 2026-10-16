import type { RGB } from "../../types/RGB"
import { Automaton2DWebGL } from "../automaton2d-webgl"

// Entropy: each cell becomes the most frequent color among its 8 neighbors.
// Ties pick a random tied color via a per-step seed hashed with the pixel.
const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform float u_colorsCount;
uniform float u_seed;
uniform vec2 u_texelSize;
in vec2 v_uv;
out vec4 out_color;

float hash(vec2 coord, float seed) {
  uint x = uint(coord.x) + uint(coord.y) * 65536u + uint(seed) * 2246822519u;
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return float(x) / 4294967295.0;
}

void main() {
  int counts[10];
  for (int i = 0; i < 10; i++) counts[i] = 0;

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx != 0 || dy != 0) {
        vec2 nuv = fract(v_uv + vec2(float(dx), float(dy)) * u_texelSize);
        int idx = int(floor(texture(u_state, nuv).r * u_colorsCount + 0.5));
        if (idx >= 0 && idx < 10) counts[idx] += 1;
      }
    }
  }

  int maxCount = 0;
  int tieCount = 0;
  for (int i = 0; i < 10; i++) {
    if (float(i) >= u_colorsCount) break;
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      tieCount = 1;
    } else if (counts[i] == maxCount && maxCount > 0) {
      tieCount += 1;
    }
  }

  float h = hash(gl_FragCoord.xy, u_seed);
  int pick = int(floor(h * float(max(tieCount, 1))));
  if (pick >= tieCount) pick = max(tieCount - 1, 0);

  int seen = 0;
  float outId = 0.0;
  for (int i = 0; i < 10; i++) {
    if (float(i) >= u_colorsCount) break;
    if (counts[i] == maxCount && maxCount > 0) {
      if (seen == pick) {
        outId = float(i);
        break;
      }
      seen += 1;
    }
  }

  out_color = vec4(outId / u_colorsCount, 0.0, 0.0, 1.0);
}
`

/** Entropy (WebGL). Majority vote of the 8 neighbors; random among ties. */
export class Entropy2DWebGL extends Automaton2DWebGL {
	private seed = 0

	constructor(
		canvasEl: HTMLCanvasElement,
		width: number,
		height: number,
		colorsCount?: number,
		paletteColors?: RGB[],
	) {
		super(canvasEl, width, height, colorsCount ?? 4, paletteColors, 1)
	}

	protected getSimFragSource(): string {
		return SIM_FRAG
	}

	protected setSimUniforms(program: WebGLProgram): void {
		this.seed = (this.seed + 1) % 100000
		this.gl.uniform1f(
			this.gl.getUniformLocation(program, "u_colorsCount"),
			this.colorsCount,
		)
		this.gl.uniform1f(this.gl.getUniformLocation(program, "u_seed"), this.seed)
	}
}
