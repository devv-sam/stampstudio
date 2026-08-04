precision highp float;

uniform sampler2D tMap;
uniform vec2 uTexSize;      // texture natural size (px)
uniform vec2 uUvScale;      // padded-quad uv -> texture uv
uniform vec2 uUvOffset;
uniform float uBorderWidth; // px, in texture space
uniform vec3 uBorderColor;
uniform float uFoilEnabled; // 0/1
uniform float uFoilIntensity;
uniform float uTime;
uniform vec2 uPointer;      // cursor in THIS sticker's texture-uv space (0..1)
uniform float uFoilActive;  // 0..1 — cursor specular strength for this sticker only
uniform float uDim;         // 0..1 — fades this sticker back while another is selected

varying vec2 vUv;

const int NANGLES = 24;
const int NRADII = 4;
const float TAU = 6.2831853;

float alphaAt(vec2 texUv) {
  if (texUv.x < 0.0 || texUv.x > 1.0 || texUv.y < 0.0 || texUv.y > 1.0) return 0.0;
  return texture2D(tMap, texUv).a;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 texUv = vUv * uUvScale + uUvOffset;
  vec2 duv = 1.0 / uTexSize;

  vec4 tex = texture2D(tMap, texUv);
  float aInner = alphaAt(texUv);

  // --- Die-cut border: dilate alpha by sampling a disc and taking the max. ---
  float aDilated = aInner;
  if (uBorderWidth > 0.0) {
    for (int i = 0; i < NANGLES; i++) {
      float ang = (float(i) / float(NANGLES)) * TAU;
      vec2 dir = vec2(cos(ang), sin(ang));
      for (int k = 1; k <= NRADII; k++) {
        float r = uBorderWidth * (float(k) / float(NRADII));
        aDilated = max(aDilated, alphaAt(texUv + dir * r * duv));
      }
    }
  }

  float aa = 1.5;
  float inner = smoothstep(0.5 - aa * duv.y, 0.5 + aa * duv.y, aInner);
  float outer = smoothstep(0.5 - aa * duv.y, 0.5 + aa * duv.y, aDilated);

  // Sticker face: texture inside the original shape, border color in the ring.
  vec3 faceColor = tex.rgb;

  // --- Holo foil (per-stamp), highlight scoped to this sticker via uFoilActive. ---
  if (uFoilEnabled > 0.5 && uFoilIntensity > 0.0) {
    float hue = fract(texUv.x * 0.8 + texUv.y * 0.6 + uTime * 0.05);
    vec3 iri = hsv2rgb(vec3(hue, 0.65, 1.0));

    // Specular band tracks the cursor position within THIS sticker only.
    float band = dot(texUv - uPointer, normalize(vec2(0.6, 0.4)));
    float spec = smoothstep(0.18, 0.0, abs(band)) * uFoilActive;

    vec3 foil = iri + spec * 0.6;
    faceColor = mix(faceColor, faceColor * 0.5 + foil, uFoilIntensity);
  }

  vec3 color = mix(uBorderColor, faceColor, inner);
  float alpha = outer;

  // Premultiplied output for clean edge compositing. uDim fades the whole
  // sticker back (uniformly, since color is premultiplied) when unselected.
  gl_FragColor = vec4(color * alpha, alpha) * (1.0 - uDim * 0.55);
}
