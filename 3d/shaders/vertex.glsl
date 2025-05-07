#version 300 es

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float cellSize;

in vec3 position;
in vec3 normal;
in vec3 instancePosition;
in vec3 instanceColor;

out vec3 vColor;
out vec3 vNormal;

void main() {
    // Calculate position
    vec3 pos = position * cellSize + instancePosition;
    
    // Transform to clip space
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    
    // Pass to fragment shader
    vColor = instanceColor;
    vNormal = normal;
} 