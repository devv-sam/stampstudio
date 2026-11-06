const HEADER = `#version 300 es
precision mediump float;
uniform float u_pixelRatio;
uniform sampler2D u_image;
uniform float u_size;
in vec2 v_imageUV;
out vec4 fragColor;
float luma(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
`

export const ENGRAVING_SHADER = `${HEADER}
uniform float u_angle;
void main() {
  float tone = luma(texture(u_image, v_imageUV).rgb);
  vec2 p = gl_FragCoord.xy / u_pixelRatio;
  float a = radians(u_angle);
  float d = p.x * sin(a) + p.y * cos(a);
  float line = abs(fract(d / u_size) - .5) * 2.;
  float edge = 1.5 / u_size;
  float ink = 1. - smoothstep(1. - tone - edge, 1. - tone + edge, line);
  fragColor = vec4(mix(vec3(.98, .97, .94), vec3(.09, .1, .16), ink), 1.);
}
`

export const RISO_SHADER = `${HEADER}
uniform float u_offset;
float grain(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 p = gl_FragCoord.xy / u_pixelRatio / u_size;
  float blue = 1. - luma(texture(u_image, v_imageUV).rgb);
  float pink = 1. - luma(texture(u_image, v_imageUV + u_offset).rgb);
  vec3 color = vec3(.97, .96, .92);
  color *= mix(vec3(1.), vec3(.16, .36, .85), step(grain(p), blue * .8));
  color *= mix(vec3(1.), vec3(1., .3, .55), step(grain(p + 17.), pink * .4));
  fragColor = vec4(color, 1.);
}
`
