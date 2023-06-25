const shader = `
precision mediump float;
uniform vec2 u_mouse;
varying vec2 v_texCoord;
void main() {
  float distance = distance(gl_FragCoord.xy, u_mouse);

  if (distance < 10.) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  } else {
    discard;
  }
}
`;
export default shader;
