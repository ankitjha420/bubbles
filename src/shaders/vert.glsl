uniform float time;
varying vec2 vUv;
varying vec3 vNormal;
varying float vNoise;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vNormal = normal;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(normal, 1.0);
}