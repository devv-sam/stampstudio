import { Plane, Program, Mesh, Texture } from 'ogl';
import stickerVert from './shaders/sticker.vert?raw';
import stickerFrag from './shaders/sticker.frag?raw';
import shadowFrag from './shaders/shadow.frag?raw';

// Transparent margin (texture px) around the PNG so the die-cut border and
// soft shadow have room to expand into.
const PAD = 56;
// Downsampled alpha map resolution for CPU hit testing (max dimension).
const HIT_CAP = 200;

// Decoded textures + alpha maps, keyed by GL context then by src. WeakMap on
// the context so a destroyed Sheet's cache is collectable.
const textureCache = new WeakMap();

/**
 * One sticker. Owns a soft-shadow quad and the sticker quad (both textured from
 * the same PNG), the serializable style/transform state, and interaction state
 * (spring-driven lift, drag tilt, idle bob). Knows nothing about how the PNG
 * was authored — any effects are already in the pixels.
 */
export class Stamp {
  /**
   * Load an image into a texture + a downsampled alpha map for hit testing.
   * Resolves { texture, width, height, alpha:{data,w,h} }.
   *
   * Results are cached per GL context by src, so re-adding the same image
   * (a generator re-roll, a letter reused across a word) is instant instead of
   * re-decoding the file and rebuilding its alpha map every time.
   */
  static loadTexture(gl, src) {
    let perContext = textureCache.get(gl);
    if (!perContext) {
      perContext = new Map();
      textureCache.set(gl, perContext);
    }
    const hit = perContext.get(src);
    if (hit) return hit;

    const pending = Stamp._decode(gl, src);
    perContext.set(src, pending);
    // Don't cache failures — a transient error shouldn't poison later loads.
    pending.catch(() => perContext.delete(src));
    return pending;
  }

  /** Drop cached textures/alpha maps (all, or just one src). */
  static clearTextureCache(gl, src) {
    const perContext = textureCache.get(gl);
    if (!perContext) return;
    if (src) perContext.delete(src);
    else perContext.clear();
  }

  static _decode(gl, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const texture = new Texture(gl, {
          image: img,
          generateMipmaps: false,
          wrapS: gl.CLAMP_TO_EDGE,
          wrapT: gl.CLAMP_TO_EDGE,
          minFilter: gl.LINEAR,
          magFilter: gl.LINEAR,
          premultiplyAlpha: false,
        });
        resolve({
          texture,
          width: img.naturalWidth,
          height: img.naturalHeight,
          alpha: buildAlphaMap(img),
        });
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  constructor(gl, { texture, width, height, alpha, config }) {
    this.gl = gl;
    this.texture = texture;
    this.baseWidth = width;
    this.baseHeight = height;
    this.alpha = alpha; // { data:Uint8Array, w, h } — row 0 = top of image

    this.config = {
      src: config.src ?? null,
      x: config.x ?? 0,
      y: config.y ?? 0,
      rotation: config.rotation ?? 0,
      // baseScale is the auto-fit factor baked in when a big image is added —
      // it establishes the sticker's "100%" size so user-facing scale stays 1.
      baseScale: config.baseScale ?? 1,
      scale: config.scale ?? 1,
      borderWidth: config.borderWidth ?? 8,
      borderColor: config.borderColor ?? '#ffffff',
      foilEnabled: config.foilEnabled ?? false,
      foilIntensity: config.foilIntensity ?? 0.6,
      shadowStrength: config.shadowStrength ?? 0.35,
    };

    // --- Interaction / animation state ---
    this.state = 'idle'; // idle | hover | dragging
    this.lift = 0;
    this.liftVel = 0;
    this.targetLift = 0;
    this.tilt = 0; // extra rotation from drag velocity
    this.targetTilt = 0;
    this.bobPhase = Math.random() * Math.PI * 2;

    this.selected = false;
    // Foil highlight is scoped to this sticker: the cursor position in its own
    // uv space, and an eased 0..1 strength that's only raised while it's the
    // hovered/dragged sticker (so moving the cursor doesn't light up every one).
    this.foilPointer = [0.5, 0.5];
    this.foilActive = 0;
    this.foilActiveTarget = 0;

    // Eased fade-back applied while a *different* sticker is selected.
    this.dim = 0;
    this.dimTarget = 0;

    // Applied (visual) transform, updated each frame — hit testing reads these
    // so grabbing matches exactly what's drawn.
    this._ax = this.config.x;
    this._ay = this.config.y;
    this._arot = this.config.rotation;
    this._as = this.config.scale;

    // Padded quad geometry + uv remap (padded-quad uv -> texture uv).
    this.paddedWidth = width + PAD * 2;
    this.paddedHeight = height + PAD * 2;
    this.uvScale = [this.paddedWidth / width, this.paddedHeight / height];
    this.uvOffset = [-PAD / width, -PAD / height];
    const texSize = [width, height];

    const geometry = new Plane(gl);

    this.program = new Program(gl, {
      vertex: stickerVert,
      fragment: stickerFrag,
      transparent: true,
      cullFace: false,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tMap: { value: texture },
        uTexSize: { value: texSize },
        uUvScale: { value: this.uvScale },
        uUvOffset: { value: this.uvOffset },
        uBorderWidth: { value: this.config.borderWidth },
        uBorderColor: { value: hexToVec3(this.config.borderColor) },
        uFoilEnabled: { value: this.config.foilEnabled ? 1 : 0 },
        uFoilIntensity: { value: this.config.foilIntensity },
        uTime: { value: 0 },
        uPointer: { value: [0.5, 0.5] },
        uFoilActive: { value: 0 },
        uDim: { value: 0 },
      },
    });
    this.mesh = new Mesh(gl, { geometry, program: this.program });

    this.shadowProgram = new Program(gl, {
      vertex: stickerVert,
      fragment: shadowFrag,
      transparent: true,
      cullFace: false,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tMap: { value: texture },
        uTexSize: { value: texSize },
        uUvScale: { value: this.uvScale },
        uUvOffset: { value: this.uvOffset },
        uBorderWidth: { value: this.config.borderWidth },
        uBlur: { value: 14 },
        uStrength: { value: this.config.shadowStrength },
        uDim: { value: 0 },
      },
    });
    this.shadowMesh = new Mesh(gl, { geometry, program: this.shadowProgram });

    this.syncStyle();
    this.applyTransform(0, false);
  }

  syncStyle() {
    const c = this.config;
    this.program.uniforms.uBorderWidth.value = c.borderWidth;
    this.program.uniforms.uBorderColor.value = hexToVec3(c.borderColor);
    this.program.uniforms.uFoilEnabled.value = c.foilEnabled ? 1 : 0;
    this.program.uniforms.uFoilIntensity.value = c.foilIntensity;
    this.shadowProgram.uniforms.uBorderWidth.value = c.borderWidth;
    this.shadowProgram.uniforms.uStrength.value = c.shadowStrength;
  }

  /** Per-frame: advance springs + foil/selection state, then write transform. */
  update(time, idle) {
    const u = this.program.uniforms;
    u.uTime.value = time;
    u.uPointer.value = this.foilPointer;

    // Foil highlight fades in/out so it's tied to this sticker, not the cursor.
    this.foilActive += (this.foilActiveTarget - this.foilActive) * 0.15;
    u.uFoilActive.value = this.foilActive;

    // Fade back while another sticker is selected.
    this.dim += (this.dimTarget - this.dim) * 0.12;
    u.uDim.value = this.dim;
    this.shadowProgram.uniforms.uDim.value = this.dim;

    // Lift spring (slight overshoot on grab/release). In author mode the
    // selected sticker keeps a small persistent lift (selectionLift is set by
    // Sheet.select only when dimOnSelect is on — never in exports).
    const stiffness = 0.22;
    const damping = 0.55;
    const liftTarget = Math.max(
      this.targetLift,
      this.selected && this.selectionLift ? 0.12 : 0
    );
    this.liftVel += (liftTarget - this.lift) * stiffness;
    this.liftVel *= damping;
    this.lift += this.liftVel;

    // Tilt eases toward the drag-velocity target, which itself decays each frame
    // so the sticker leans while moving and relaxes upright when it stops.
    this.tilt += (this.targetTilt - this.tilt) * 0.25;
    this.targetTilt *= 0.85;

    this.applyTransform(time, idle);
  }

  /** Cursor position (sheet-world px) expressed in this sticker's texture uv. */
  pointerUV(wx, wy) {
    const dx = wx - this._ax;
    const dy = wy - this._ay;
    const c = Math.cos(this._arot);
    const sn = Math.sin(this._arot);
    const lx = dx * c + dy * sn;
    const ly = -dx * sn + dy * c;
    const halfW = (this.paddedWidth * this._as) / 2;
    const halfH = (this.paddedHeight * this._as) / 2;
    const qu = lx / (halfW * 2) + 0.5;
    const qv = ly / (halfH * 2) + 0.5;
    const tu = qu * this.uvScale[0] + this.uvOffset[0];
    const tv = qv * this.uvScale[1] + this.uvOffset[1];
    return [Math.min(1, Math.max(0, tu)), Math.min(1, Math.max(0, tv))];
  }

  applyTransform(time, idle) {
    const { x, y, rotation, scale, baseScale } = this.config;
    const s = scale * baseScale * (1 + 0.12 * this.lift); // pick-up scale ~1.12x

    // Idle bob only when at rest (no lift) and idle enabled.
    const bob =
      idle && this.state === 'idle'
        ? Math.sin(time * 1.2 + this.bobPhase) * 3 * (1 - this.lift)
        : 0;

    const rot = rotation + this.tilt;
    const ax = x;
    const ay = y + bob;

    this.mesh.position.set(ax, ay, 0);
    this.mesh.rotation.z = rot;
    this.mesh.scale.set(this.paddedWidth * s, this.paddedHeight * s, 1);

    const off = (6 + 14 * this.lift) * scale * baseScale;
    this.shadowMesh.position.set(ax + off, ay - off, 0);
    this.shadowMesh.rotation.z = rot;
    this.shadowMesh.scale.set(this.paddedWidth * s, this.paddedHeight * s, 1);
    this.shadowProgram.uniforms.uBlur.value = 14 + 16 * this.lift;

    // Record applied transform for hit testing.
    this._ax = ax;
    this._ay = ay;
    this._arot = rot;
    this._as = s;
  }

  /**
   * Alpha-aware hit test in sheet-world coords (px, origin center, y-up).
   * Returns true if the point lands on an opaque pixel, or within borderWidth
   * of one (so the die-cut border is grabbable too).
   */
  hitTest(wx, wy) {
    const dx = wx - this._ax;
    const dy = wy - this._ay;
    const c = Math.cos(this._arot);
    const sn = Math.sin(this._arot);
    // Un-rotate into the quad's local frame.
    const lx = dx * c + dy * sn;
    const ly = -dx * sn + dy * c;

    const halfW = (this.paddedWidth * this._as) / 2;
    const halfH = (this.paddedHeight * this._as) / 2;
    const qu = lx / (halfW * 2) + 0.5; // padded-quad uv, y-up
    const qv = ly / (halfH * 2) + 0.5;
    if (qu < 0 || qu > 1 || qv < 0 || qv > 1) return false;

    const tu = qu * this.uvScale[0] + this.uvOffset[0];
    const tv = qv * this.uvScale[1] + this.uvOffset[1];
    if (tu < 0 || tu > 1 || tv < 0 || tv > 1) return false;

    const { w, h } = this.alpha;
    const px = tu * w;
    const py = (1 - tv) * h; // flipY: uv.y up -> image row from bottom
    if (this.sampleAlpha(px, py) > 24) return true;

    // Border-grab: check a ring at borderWidth radius (texture px -> hit px).
    const rr = this.config.borderWidth * (w / this.baseWidth);
    if (rr >= 1) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        if (
          this.sampleAlpha(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr) > 24
        )
          return true;
      }
    }
    return false;
  }

  sampleAlpha(px, py) {
    const { data, w, h } = this.alpha;
    const ix = Math.floor(px);
    const iy = Math.floor(py);
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return 0;
    return data[iy * w + ix];
  }

  serialize() {
    return { ...this.config };
  }
}

/** Draw the image to a downsampled canvas and extract the alpha channel. */
function buildAlphaMap(img) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const scale = Math.min(1, HIT_CAP / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = rgba[i * 4 + 3];
  return { data, w, h };
}

function hexToVec3(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
