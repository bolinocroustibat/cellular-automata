#version 300 es
precision highp float;

uniform sampler2D currentState;  // Current state texture
uniform vec2 resolution;         // Texture resolution
uniform float cubeDimension;     // Cube dimension
uniform float colorsCount;       // Number of colors in the automaton

layout(local_size_x = 8, local_size_y = 8, local_size_z = 8) in;

layout(rgba8, binding = 0) writeonly uniform image3D nextState;  // Next state texture

// Helper function to get cell state from texture
vec4 getCellState(ivec3 pos) {
    // Handle wrapping at boundaries
    pos = ivec3(
        (pos.x + int(cubeDimension)) % int(cubeDimension),
        (pos.y + int(cubeDimension)) % int(cubeDimension),
        (pos.z + int(cubeDimension)) % int(cubeDimension)
    );
    
    // Convert 3D position to 2D texture coordinates
    vec2 texCoord = vec2(
        float(pos.x + pos.z * int(cubeDimension)) / resolution.x,
        float(pos.y) / resolution.y
    );
    
    return texture(currentState, texCoord);
}

void main() {
    ivec3 pos = ivec3(gl_GlobalInvocationID.xyz);
    
    // Skip if outside cube dimensions
    if (pos.x >= int(cubeDimension) || pos.y >= int(cubeDimension) || pos.z >= int(cubeDimension)) {
        return;
    }
    
    // Get current cell state
    vec4 currentCell = getCellState(pos);
    
    // For now, just copy the current state to next state
    imageStore(nextState, pos, currentCell);
    
    // Count neighbors with next color (we'll implement this in the next step)
    int nextColorNeighbors = 0;
    
    // Check all 26 neighbors
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
                if (x == 0 && y == 0 && z == 0) continue;
                
                vec4 neighbor = getCellState(pos + ivec3(x, y, z));
                // We'll implement the next color check in the next step
            }
        }
    }
} 