const shader = `
precision mediump float;
uniform vec2 u_startPoint;
uniform vec2 u_endPoint;
uniform float u_width;
varying vec2 v_texCoord;

float distanceToLineSegment(vec2 startPoint, vec2 endPoint, vec2 pointToCheck) {
  vec2 direction = endPoint - startPoint;
  float segmentLength = length(direction);
  vec2 normalizedDirection = normalize(direction);

  vec2 startPointToCheck = pointToCheck - startPoint;
  float dotProduct = dot(startPointToCheck, normalizedDirection);

  float distance;

  if (dotProduct < 0.0) {
    distance = length(startPointToCheck);
  } else if (dotProduct > segmentLength) {
    distance = length(pointToCheck - endPoint);
  } else {
    vec2 projection = normalizedDirection * dotProduct;
    vec2 perpendicularVector = startPointToCheck - projection;
    distance = length(perpendicularVector);
  }

  return distance;
}

void main() {
  float distance = distanceToLineSegment(u_startPoint,u_endPoint,gl_FragCoord.xy);
  if (distance <= u_width ) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  } else {
    discard;
  }
}

`;
export default shader;
