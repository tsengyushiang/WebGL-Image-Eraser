const shader = `
precision mediump float;
uniform vec2 u_mouse;
uniform float u_width;
varying vec2 v_texCoord;
void main() {
  float distance = distance(gl_FragCoord.xy, u_mouse);

  if (distance < u_width) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  } else {
    discard;
  }
}
`;
export default shader;
