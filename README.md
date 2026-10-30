# Generative Animated Art algorithms

- [Cyclic Cellular Automaton](https://en.wikipedia.org/wiki/Cyclic_cellular_automaton)
  - In 1 dimension
  - In 2 dimensions
  - In 3 dimensions
- Elementary cellular automata (1D)
  - [Rule 30](https://en.wikipedia.org/wiki/Rule_30)
  - [Rule 90](https://en.wikipedia.org/wiki/Rule_90)
  - [Rule 110](https://en.wikipedia.org/wiki/Rule_110)
- [Conway's game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life)
  - In 2 dimensions
  - In 3 dimensions (26 neighbors, configurable birth/survival rule)
- Immigration game ([Conway's game of life with 3 colors](https://conwaylife.com/ref/mniemiec/color.htm#c-imm))
- Quad-Life ([Conway's game of life with 5 colors](https://conwaylife.com/ref/mniemiec/color.htm#c-quad))
- [Langton's ant](https://en.wikipedia.org/wiki/Langton%27s_ant)
- Entropy (color evolution)
  - In 2 dimensions
  - In 3 dimensions (26 neighbors)

The 2D algorithms run on the GPU with WebGL fragment shaders. Canvas versions are still available by URL.

## Dependencies

- [Chroma.js](https://github.com/gka/chroma.js/)
- [Tweakpane](https://github.com/cocopon/tweakpane)
- [Three.js](https://github.com/mrdoob/three.js)

## Install the dependencies

```bash
bun install
```

## Run locally

```bash
bun run dev
```

## Build for production

Build for production with:
```bash
bun run build
```
...it will create a production build in `./dist` folder.

You can then preview the production build with:
```bash
bun run preview
```

## Format and lint code with Biome

Lint AND format with:
```bash
biome check --write .
```
