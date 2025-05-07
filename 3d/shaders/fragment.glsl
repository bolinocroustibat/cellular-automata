#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;

out vec4 fragColor;

void main() {
    // Simple diffuse lighting
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Combine with color
    vec3 finalColor = vColor * (0.2 + 0.8 * diffuse);
    fragColor = vec4(finalColor, 1.0);
} 