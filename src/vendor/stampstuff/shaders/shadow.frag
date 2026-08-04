precision highp float;

uniform sampler2D tMap;
uniform vec2 uTexSize;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
uniform float uBorderWidth;  // match the sticker silhouette
uniform float uBlur;         // px, soft-shadow radius
uniform float uStrength;     // 0..1 opacity
uniform float uDim;          // fades with its sticker while another is selected

varying vec2 vUv;

const int NANGLES = 16;
const int NRADII = 4;
const float TAU = 6.2831853;

float alphaAt(vec2 texUv) {
  if (texUv.x < 0.0 || texUv.x > 1.0 || texUv.y < 0.0 || texUv.y > 1.0) return 0.0;
  return texture2D(tMap, texUv).a;
}

// Soft silhouette: average the (border-dilated) alpha over a disc, which blurs
// the edge into a shadow. Rendered black, behind and offset from the sticker.
void main() {
  vec2 texUv = vUv * uUvScale + uUvOffset;
  vec2 duv = 1.0 / uTexSize;
  float radius = uBorderWidth + uBlur;

  float sum = alphaAt(texUv);
  float count = 1.0;
  for (int i = 0; i < NANGLES; i++) {
    float ang = (float(i) / float(NANGLES)) * TAU;
    vec2 dir = vec2(cos(ang), sin(ang));
    for (int k = 1; k <= NRADII; k++) {
      float r = radius * (float(k) / float(NRADII));
      sum += alphaAt(texUv + dir * r * duv);
      count += 1.0;
    }
  }
  float coverage = sum / count;
  float alpha = clamp(coverage, 0.0, 1.0) * uStrength * (1.0 - uDim * 0.55);

  gl_FragColor = vec4(vec3(0.0), alpha);
}
