# Plan: WebGPU for the 3D automata

Status: not started.

## Why

The 3D automata (`3d/`) simulate on the CPU and draw with `THREE.WebGLRenderer`. The state is a flat `Uint8Array` drawn as one `InstancedMesh`.

Measured CPU time per step at 100³ (headless, Bun):

| Automaton | Per step |
| --- | --- |
| Conway 3D (branch `conway3D`) | 26.6 ms |
| Entropy 3D | 68.6 ms |
| CCA 3D | ~85 ms (estimated) |

### What WebGPU speeds up

- **Simulation.** A compute shader over 1M cells should take about 1 ms or less. This frees the main thread and allows larger cubes or more steps per second.
- **CPU-to-GPU uploads.** Each step currently uploads instance colors, plus matrices for Conway. With the state in a GPU storage buffer, the material reads colors and visibility directly and nothing crosses over.

### What it does not change

- **Drawing semi-transparent cubes.** Up to 12M overlapping translucent triangles per frame at 100³ is a fill-rate cost, the same in WebGL and WebGPU. If drawing is the bottleneck, the fix is elsewhere: fewer faces, points, or another rendering technique.

## Approach

Use Three.js `WebGPURenderer` with TSL compute shaders, not raw WebGPU:

- Keep the scene, `InstancedMesh`, OrbitControls and rotation.
- Import from `three/webgpu`. Write the rules in TSL, which compiles to WGSL.
- `WebGPURenderer` falls back to WebGL 2 when WebGPU is missing. Check whether TSL compute runs well on that fallback. If not, keep the current CPU simulations as the fallback.

## Steps

### 0. Measure in the browser (< 1 h)

FPS and ms per step at 30³, 60³ and 100³ for CCA 3D, Entropy 3D and Conway 3D. This decides whether the bottleneck is simulation (WebGPU helps) or drawing (it does not). Stop here if drawing dominates.

### 1. Switch the renderer (~½ day)

- Replace `THREE.WebGLRenderer` with `WebGPURenderer` from `three/webgpu`, keeping CPU simulation.
- `WebGPURenderer` needs `await renderer.init()`. `Automaton.create()` is already async, but the `Automaton3D` constructor is not: add an `init()` the factory awaits.
- Check visual parity (colors, opacity, transparency) and the WebGL 2 fallback.
- `clear()` must dispose the renderer, geometry and material.
- Report device loss to Sentry.

### 2. Move the state to the GPU (2–3 days with step 3)

- Two storage buffers (current and next), swapped each step.
- One compute shader per rule: CCA 3D, Entropy 3D, Conway 3D. Neighbors wrap on every axis.
- Entropy's random tie-break needs a hash-based RNG in the shader (seeded by cell index and step).
- The material reads each instance's color from the state buffer.
- Validate each shader against the CPU version on small cubes, one algorithm at a time, starting with CCA 3D.

### 3. Hide dead cells on the GPU (Conway)

- Simple version: the vertex shader collapses dead instances to zero size.
- Faster version: compact live cells with an atomic counter and draw indirectly, like today's CPU packing. Check atomics and indirect draw support in Three.js 0.186 first.

### 4. Raise the limits

Increase the cube size range and update rate based on the step 0 and step 2 measurements.

## Testing

Chrome, Safari and Firefox, with and without WebGPU.
