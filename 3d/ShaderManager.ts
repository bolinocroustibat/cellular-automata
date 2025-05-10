import * as THREE from "three"

type ShaderType = "vertex" | "fragment" | "compute"

interface ShaderProgram {
    program: WebGLProgram
    uniforms: { [key: string]: WebGLUniformLocation }
    attributes: { [key: string]: number }
}

interface TexturePair {
    current: THREE.DataTexture
    next: THREE.DataTexture
}

export class ShaderManager {
    private gl: WebGL2RenderingContext
    private shaderPrograms: Map<string, ShaderProgram>
    private textures: Map<string, TexturePair>
    private cubeDimension: number
    private computeShaderSource: string
    private hasComputeSupport: boolean

    constructor(renderer: THREE.WebGLRenderer, cubeDimension: number) {
        const canvas = renderer.domElement
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext
        if (!gl) {
            throw new Error("WebGL2 not supported")
        }

        this.gl = gl
        this.shaderPrograms = new Map()
        this.textures = new Map()
        this.cubeDimension = cubeDimension

        // Check for compute shader support
        const ext = gl.getExtension('EXT_compute_shader')
        this.hasComputeSupport = !!ext
        if (!this.hasComputeSupport) {
            console.warn("Compute shaders not supported, falling back to CPU computation")
        }
    }

    public async initialize(): Promise<void> {
        try {
            // Load compute shader source
            this.computeShaderSource = await this.loadShader("compute")

            // Initialize compute program if supported
            if (this.hasComputeSupport) {
                const computeProgram = this.createProgram(
                    this.compileShader(this.computeShaderSource, "compute")
                )
                this.shaderPrograms.set("compute", computeProgram)
            }
        } catch (error) {
            console.error("Failed to initialize shader manager:", error)
            throw error
        }
    }

    private async loadShader(type: ShaderType): Promise<string> {
        const response = await fetch(`/3d/shaders/${type}.glsl`)
        if (!response.ok) {
            throw new Error(`Failed to load ${type} shader`)
        }
        return await response.text()
    }

    private compileShader(source: string, type: ShaderType): WebGLShader {
        const gl = this.gl
        let shaderType: number

        switch (type) {
            case "compute":
                if (!this.hasComputeSupport) {
                    throw new Error("Compute shaders not supported")
                }
                // Use the extension's constant for compute shader type
                shaderType = (gl as any).COMPUTE_SHADER
                break
            default:
                throw new Error(`Unknown shader type: ${type}`)
        }

        const shader = gl.createShader(shaderType)
        if (!shader) {
            throw new Error(`Failed to create ${type} shader`)
        }

        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader)
            gl.deleteShader(shader)
            throw new Error(`Failed to compile ${type} shader: ${info}`)
        }

        return shader
    }

    private createProgram(...shaders: WebGLShader[]): ShaderProgram {
        const program = this.gl.createProgram()
        if (!program) {
            throw new Error("Failed to create shader program")
        }

        // Attach shaders
        shaders.forEach((shader) => this.gl.attachShader(program, shader))

        // Link program
        this.gl.linkProgram(program)
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(program)
            this.gl.deleteProgram(program)
            throw new Error(`Failed to link shader program: ${info}`)
        }

        // Get uniforms
        const uniforms: { [key: string]: WebGLUniformLocation } = {}
        const numUniforms = this.gl.getProgramParameter(
            program,
            this.gl.ACTIVE_UNIFORMS
        )
        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(program, i)
            if (info) {
                const location = this.gl.getUniformLocation(program, info.name)
                if (location) {
                    uniforms[info.name] = location
                }
            }
        }

        return { program, uniforms, attributes: {} }
    }

    public createStateTextures(): void {
        // Calculate size based on instance data (3 floats per cell for RGB)
        const size = this.cubeDimension * this.cubeDimension * this.cubeDimension * 3
        const data = new Float32Array(size)

        // Create current and next state textures
        const currentTexture = new THREE.DataTexture(
            data,
            this.cubeDimension,
            this.cubeDimension * this.cubeDimension,
            THREE.RGBFormat,
            THREE.FloatType
        )
        currentTexture.needsUpdate = true

        const nextTexture = new THREE.DataTexture(
            data,
            this.cubeDimension,
            this.cubeDimension * this.cubeDimension,
            THREE.RGBFormat,
            THREE.FloatType
        )
        nextTexture.needsUpdate = true

        this.textures.set("state", { current: currentTexture, next: nextTexture })
    }

    public updateStateTexture(data: Float32Array): void {
        const stateTextures = this.textures.get("state")
        if (!stateTextures) {
            throw new Error("State textures not initialized")
        }

        const textureData = stateTextures.current.image.data as Float32Array
        if (textureData.length !== data.length) {
            throw new Error(`Texture data size mismatch: expected ${textureData.length}, got ${data.length}. Cube dimension: ${this.cubeDimension}`)
        }
        textureData.set(data)
        stateTextures.current.needsUpdate = true
    }

    public swapStateTextures(): void {
        const stateTextures = this.textures.get("state")
        if (!stateTextures) {
            throw new Error("State textures not initialized")
        }

        const temp = stateTextures.current
        stateTextures.current = stateTextures.next
        stateTextures.next = temp
    }

    public getStateTexture(): THREE.DataTexture {
        const stateTextures = this.textures.get("state")
        if (!stateTextures) {
            throw new Error("State textures not initialized")
        }
        return stateTextures.current
    }

    public useProgram(name: string): void {
        const program = this.shaderPrograms.get(name)
        if (!program) {
            throw new Error(`Shader program '${name}' not found`)
        }
        this.gl.useProgram(program.program)
    }

    public setUniform(name: string, value: any): void {
        const program = this.shaderPrograms.get("compute")
        if (!program) {
            throw new Error("Compute program not found")
        }

        const location = program.uniforms[name]
        if (location === undefined) {
            throw new Error(`Uniform '${name}' not found`)
        }

        if (value instanceof THREE.Matrix4) {
            this.gl.uniformMatrix4fv(location, false, value.elements)
        } else if (value instanceof THREE.Vector3) {
            this.gl.uniform3f(location, value.x, value.y, value.z)
        } else if (value instanceof THREE.Vector2) {
            this.gl.uniform2f(location, value.x, value.y)
        } else if (typeof value === "number") {
            this.gl.uniform1f(location, value)
        } else if (Array.isArray(value)) {
            if (value.length === 2) {
                this.gl.uniform2f(location, value[0], value[1])
            } else if (value.length === 3) {
                this.gl.uniform3f(location, value[0], value[1], value[2])
            } else if (value.length === 4) {
                this.gl.uniform4f(location, value[0], value[1], value[2], value[3])
            }
        }
    }

    public dispose(): void {
        // Delete shader programs
        this.shaderPrograms.forEach((program) => {
            this.gl.deleteProgram(program.program)
        })
        this.shaderPrograms.clear()

        // Delete textures
        this.textures.forEach((pair) => {
            pair.current.dispose()
            pair.next.dispose()
        })
        this.textures.clear()
    }

    public dispatchCompute(x: number, y: number, z: number): void {
        if (!this.hasComputeSupport) {
            throw new Error("Compute shaders not supported")
        }
        // @ts-ignore - WebGL2 compute shader support
        this.gl.dispatchCompute(x, y, z)
    }

    public getGL(): WebGL2RenderingContext {
        return this.gl
    }
}
