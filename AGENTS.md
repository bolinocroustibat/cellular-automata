# Cellular Automata

Generative animated art app: 1D, 2D, and 3D cellular automata in TypeScript with Vite.

## Tech stack

- Runtime: Bun
- Build: Vite
- Language: TypeScript
- UI: vanilla JS, Canvas API, Tweakpane
- Color: Chroma.js
- 3D: Three.js
- Errors: Sentry
- Lint and format: Biome

## Commands

- `bun run dev` — development server
- `bun run build` — production build
- `bun run preview` — preview the production build
- `bun run check` — lint and format with Biome

## Architecture

`Automaton` in `core/Automaton.ts` is a factory. `create()` switches on `settings.algo` and returns the matching class. The dimension bases do not extend `Automaton`; they stay compatible with it by implementing `clear()` and `start()`.

```
Automaton1D
├── CCA1D
├── Rule30
├── Rule90
└── Rule110
Automaton2D
├── CCA2D
├── ConwayAutomaton
│   ├── ImmigrationAutomaton
│   └── QuadLifeAutomaton
├── LangtonAutomaton
└── EntropyAutomaton
Automaton2DWebGL
├── CCA2DWebGL
├── Conway2DWebGL
├── Immigration2DWebGL
├── QuadLife2DWebGL
├── Entropy2DWebGL
└── Langton2DWebGL
Automaton3D
└── CCA3D
```

Each base owns setup, state, and the animation loop. Subclasses implement:

- 1D: `update(line)`
- 2D canvas: `updateState()`
- 2D WebGL: `getSimFragSource()` (fragment shader)
- 3D: `update()`

Data flow:

1. Init: `main.ts` → `Automaton.create()` → specific class
2. Controls: Tweakpane → settings → `reset()` in `main.ts` → new automaton
3. Tick: timer → update method → render

`reset()` replaces the canvas element. A canvas keeps a single context for its lifetime, so switching between 2D and WebGL needs a fresh element.

Rendering:

- 1D: canvas, one pixel per cell, drawn line by line
- 2D canvas: grid of squares, resolution defaults to 5px
- 2D WebGL: shader simulation for CCA, Conway, Immigration, Quad Life, Entropy, and Langton
- 3D: Three.js

Colors are RGB from a palette (including movie palettes). The window resize handler calls `reset()`. Neighbor access wraps on every dimension.

State layout:

- 1D: `Cell[]`
- 2D: `Cell[][]` as `state[y][x]`
- 3D: `Cell3D[][][]`

## Adding an algorithm

1. Add a class under `1d/`, `2d/`, `2d-webgl/`, or `3d/`, extending the base for that folder. Immigration and Quad-Life extend `ConwayAutomaton`.
2. Implement the method that base expects: `update(line)`, `updateState()`, `getSimFragSource()`, or `update()`.
3. Register the id in the `switch` in `core/Automaton.ts`.
4. Add the same id to `VALID_ALGOS` in `utils/getAlgorithmFromRoute.ts` and to the Tweakpane options in `ui/controls.ts`.
5. Show algorithm-specific blades in `setBladesForAlgo` when it has its own parameters.

Implement `clear()` so the interval and canvas or WebGL resources are released.

## Conventions

- One algorithm per folder, implementation in `index.ts` (`1d/rule30/index.ts`)
- Base files: lowercase (`automaton2d.ts`, `automaton2d-webgl.ts`), class names PascalCase
- Utilities: camelCase (`pickColors.ts`)
- Types: PascalCase (`Settings.ts`)
- Strict types on parameters. Interfaces for settings. Abstract classes for bases.
- Prefer `readonly`. Use type guards for runtime checks.
- An unknown route falls back to `cca-2D`. Track production errors with Sentry.
- Pre-compute palettes with `pickColors`. Tune 2D resolution against update frequency.

```typescript
interface Settings {
  algo: string
  cca1dColorsCount?: number
  cca2dColorsCount?: number
  cca2dThreshold?: number
  cca3dColorsCount?: number
  cca3dThreshold?: number
  cca3dCubeDimension?: number
  entropyColorsCount?: number
  resolution?: number
  palette?: string
}
```

## Algorithms

The Tweakpane selector writes `/${id}` into the URL. `getAlgorithmFromRoute()` reads the path, lowercases it, and matches `VALID_ALGOS`. Ids that contain a capital `D` (`cca-1D`, `cca-2D`, `cca-2D-webgl`, `cca-3D`) do not survive that lowercasing, so those URLs fall back to `cca-2D`. The other ids are already lowercase and match.

| Id | Class | Notes |
| --- | --- | --- |
| `cca-1D` | CCA1D | Color-cycling waves |
| `rule30` | Rule30 | Chaotic |
| `rule90` | Rule90 | Sierpinski / fractal |
| `rule110` | Rule110 | Turing complete |
| `cca-2D` | CCA2D | Spirals and waves (default) |
| `cca-2D-webgl` | CCA2DWebGL | Same rule, fragment shader |
| `cca-3D` | CCA3D | Three.js |
| `conway` | ConwayAutomaton | Gliders and oscillators |
| `conway-webgl` | Conway2DWebGL | Life on the GPU |
| `immigration` | ImmigrationAutomaton | Life with 3 colors |
| `immigration-webgl` | Immigration2DWebGL | Same rule, fragment shader |
| `quadlife` | QuadLifeAutomaton | Life with 5 colors |
| `quadlife-webgl` | QuadLife2DWebGL | Same rule, fragment shader |
| `langton` | LangtonAutomaton | Highways after chaos |
| `langton-webgl` | Langton2DWebGL | Ant on the GPU |
| `entropy` | EntropyAutomaton | Color evolution |
| `entropy-webgl` | Entropy2DWebGL | Same rule, fragment shader |

1D rules are the fastest, then 2D Life variants. CCA-2D is slower. CCA-3D is the slowest because of 3D rendering.
