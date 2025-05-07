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

    constructor(renderer: THREE.WebGLRenderer, cubeDimension: number) {
        const canvas = renderer.domElement
        this.gl = canvas.getContext("webgl2") as WebGL2RenderingContext
        if (!this.gl) {
            throw new Error("WebGL2 not supported")
        }

        this.shaderPrograms = new Map()
        this.textures = new Map()
        this.cubeDimension = cubeDimension

        // Initialize shader programs
        this.initializeShaderPrograms()
    }

    private async loadShader(type: ShaderType): Promise<string> {
        const response = await fetch(`/3d/shaders/${type}.glsl`)
        if (!response.ok) {
            throw new Error(`Failed to load ${type} shader`)
        }
        return response.text()
    }

    private compileShader(source: string, type: ShaderType): WebGLShader {
        const shaderType = type === "vertex"
            ? this.gl.VERTEX_SHADER
            : type === "fragment"
            ? this.gl.FRAGMENT_SHADER
            : 0x91B9 // COMPUTE_SHADER constant from WebGL2
        const shader = this.gl.createShader(shaderType)
        if (!shader) {
            throw new Error(`Failed to create ${type} shader`)
        }

        this.gl.shaderSource(shader, source)
        this.gl.compileShader(shader)

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader)
            this.gl.deleteShader(shader)
            throw new Error(`Failed to compile ${type} shader: ${info}`)
        }

        return shader
    }

    private async initializeShaderPrograms(): Promise<void> {
        // Load and compile shaders
        const [vertexSource, fragmentSource, computeSource] = await Promise.all([
            this.loadShader("vertex"),
            this.loadShader("fragment"),
            this.loadShader("compute"),
        ])

        // Create render program
        const renderProgram = this.createProgram(
            this.compileShader(vertexSource, "vertex"),
            this.compileShader(fragmentSource, "fragment")
        )
        this.shaderPrograms.set("render", renderProgram)

        // Create compute program
        const computeProgram = this.createProgram(
            this.compileShader(computeSource, "compute")
        )
        this.shaderPrograms.set("compute", computeProgram)
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

        // Get uniforms and attributes
        const uniforms: { [key: string]: WebGLUniformLocation } = {}
        const attributes: { [key: string]: number } = {}

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

        const numAttributes = this.gl.getProgramParameter(
            program,
            this.gl.ACTIVE_ATTRIBUTES
        )
        for (let i = 0; i < numAttributes; i++) {
            const info = this.gl.getActiveAttrib(program, i)
            if (info) {
                const location = this.gl.getAttribLocation(program, info.name)
                attributes[info.name] = location
            }
        }

        return { program, uniforms, attributes }
    }

    public createStateTextures(): void {
        const size = this.cubeDimension * this.cubeDimension
        const data = new Float32Array(size * 4) // RGBA format

        // Create current and next state textures
        const currentTexture = new THREE.DataTexture(
            data,
            this.cubeDimension,
            this.cubeDimension,
            THREE.RGBAFormat,
            THREE.FloatType
        )
        currentTexture.needsUpdate = true

        const nextTexture = new THREE.DataTexture(
            data,
            this.cubeDimension,
            this.cubeDimension,
            THREE.RGBAFormat,
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

        stateTextures.current.image.data.set(data)
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
        const program = this.shaderPrograms.get("render")
        if (!program) {
            throw new Error("Render program not found")
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
} 