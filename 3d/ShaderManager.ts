import * as THREE from "three"

type ShaderType = "vertex" | "fragment"

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

        // Log WebGL version and extensions
        console.log("WebGL Version:", gl.getParameter(gl.VERSION))
        console.log("WebGL Vendor:", gl.getParameter(gl.VENDOR))
        console.log("WebGL Renderer:", gl.getParameter(gl.RENDERER))
    }

    public async initialize(): Promise<void> {
        try {
            // Initialize any necessary shader programs here
            console.log("Shader manager initialized")
        } catch (error) {
            console.error("Failed to initialize shader manager:", error)
            throw error
        }
    }

    public createStateTextures(): void {
        // Calculate size based on instance data (4 floats per cell for RGBA)
        const size = this.cubeDimension * this.cubeDimension * this.cubeDimension * 4
        const data = new Float32Array(size)

        // Create current and next state textures
        const currentTexture = new THREE.DataTexture(
            data,
            this.cubeDimension * this.cubeDimension,
            this.cubeDimension,
            THREE.RGBAFormat,
            THREE.FloatType
        )
        currentTexture.needsUpdate = true

        const nextTexture = new THREE.DataTexture(
            data,
            this.cubeDimension * this.cubeDimension,
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

    public getGL(): WebGL2RenderingContext {
        return this.gl
    }
}
