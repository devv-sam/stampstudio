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

// recess printing: one ink, rings that swell through the dark areas. sized off the stamp width so a sharper render keeps the same lines
export const INTAGLIO_SHADER = `${HEADER}
uniform vec2 u_resolution;
uniform vec4 u_ink;
uniform float u_contrast;
void main() {
  float tone = smoothstep(.5 - u_contrast, .5 + u_contrast, luma(texture(u_image, v_imageUV).rgb));
  vec2 p = (gl_FragCoord.xy - u_resolution * vec2(.5, .55)) / u_resolution.x;
  float cells = 300. / u_size;
  float r = length(p) + .004 * sin(atan(p.y, p.x) * 14.) * smoothstep(.04, .3, length(p));
  float band = abs(fract(r * cells) - .5) * 2.;
  float edge = 2. * cells / u_resolution.x;
  float weight = 1. - tone;
  float ink = (1. - smoothstep(weight - edge, weight + edge, band)) * smoothstep(0., .08, weight);
  fragColor = vec4(mix(vec3(.97, .95, .91), u_ink.rgb, ink), 1.);
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
