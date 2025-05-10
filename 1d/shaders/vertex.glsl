#version 300 es
precision highp float;

in vec2 position;  // Just x,y coordinates
in vec3 color;     // Cell color

out vec3 vColor;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    vColor = color;
} 