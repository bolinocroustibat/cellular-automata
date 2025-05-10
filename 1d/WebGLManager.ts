import vertexShaderSource from './shaders/vertex.glsl'
import fragmentShaderSource from './shaders/fragment.glsl'

export class WebGLManager {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private positionBuffer: WebGLBuffer;
    private colorBuffer: WebGLBuffer;
    private width: number;
    private height: number;

    constructor(canvas: HTMLCanvasElement, width: number, height: number) {
        const gl = canvas.getContext('webgl2', {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext;
        
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }

        this.gl = gl;
        this.width = width;
        this.height = height;

        // Initialize WebGL state
        gl.viewport(0, 0, width, height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Create shader program
        this.program = this.createProgram();
        
        // Create buffers
        this.positionBuffer = this.createPositionBuffer();
        this.colorBuffer = this.createColorBuffer();
    }

    private createProgram(): WebGLProgram {
        const gl = this.gl;
        const program = gl.createProgram();
        if (!program) throw new Error('Failed to create program');

        // Create and compile shaders
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Failed to link program: ' + gl.getProgramInfoLog(program));
        }

        return program;
    }

    private createShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Failed to create shader');

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    private createPositionBuffer(): WebGLBuffer {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('Failed to create position buffer');

        // Create a quad for each cell
        const positions = new Float32Array([
            0.0, 0.0,  // bottom-left
            1.0, 0.0,  // bottom-right
            0.0, 1.0,  // top-left
            1.0, 1.0   // top-right
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        return buffer;
    }

    private createColorBuffer(): WebGLBuffer {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('Failed to create color buffer');

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.width * 3 * 4, gl.DYNAMIC_DRAW);

        return buffer;
    }

    public updateColors(colors: Float32Array): void {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
    }

    public render(line: number): void {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        // Set up position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const positionLocation = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Set up color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        const colorLocation = gl.getAttribLocation(this.program, 'color');
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

        // Draw cells for the current line
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    public dispose(): void {
        const gl = this.gl;
        gl.deleteBuffer(this.positionBuffer);
        gl.deleteBuffer(this.colorBuffer);
        gl.deleteProgram(this.program);
    }
} 