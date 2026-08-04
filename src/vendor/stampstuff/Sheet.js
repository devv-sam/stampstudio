import { Renderer, Camera, Transform } from 'ogl';
import { Stamp } from './Stamp.js';
import { Input } from './input.js';

/**
 * The Sheet: a self-contained WebGL surface holding an ordered list of draggable
 * stamps. Configured entirely by a plain serializable object — that object is
 * both the tweak-panel model (author mode) and the export payload (embed mode).
 *
 * Deliberately not data-reactive: no network, no feeds. Just a tactile surface.
 */
export class Sheet {
  /**
   * @param {HTMLElement} container  element the canvas mounts into
   * @param {object} config          serializable sheet config
   */
  constructor(container, config = {}) {
    this.container = container;
    this.config = {
      background: config.background ?? 'transparent',
      dragEnabled: config.dragEnabled ?? true,
      shadowSoftness: config.shadowSoftness ?? 1,
      idle: config.idle ?? true,
      hover: config.hover ?? true,
      rotationOnDrag: config.rotationOnDrag ?? true,
      stamps: [],
    };

    this.stamps = []; // ordered back-to-front; render + z-order follow this array

    this.renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2),
      alpha: true,
      premultipliedAlpha: true,
    });
    this.gl = this.renderer.gl;
    this.canvas = this.gl.canvas;
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);

    this.applyBackground(this.config.background);

    // Orthographic camera mapped 1:1 to CSS pixels, origin at sheet center,
    // y-up. So a stamp's config.x/config.y read as pixels from center.
    this.camera = new Camera(this.gl, { near: -100, far: 100 });
    this.camera.position.z = 1;

    this.scene = new Transform();
    this.width = 0;
    this.height = 0;

    // Style defaults applied to every newly added stamp (an explicit per-stamp
    // value in its config still wins). The author panel edits these.
    this.stampDefaults = {
      borderWidth: 8,
      borderColor: '#ffffff',
      foilEnabled: false,
      foilIntensity: 0.6,
      shadowStrength: 0.35,
    };

    // Author-panel hooks (dev only): selection + per-frame value sync callbacks.
    this.selected = null;
    this.onSelect = null;
    this.onFrame = null;

    // Observe the container, not the window: the Sheet may live inside a React
    // / flex layout that sizes after mount, or start in a hidden tab (0×0).
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(container);
    this.resize();

    this.time = 0;
    this.pointer = [0, 0]; // -1..1 across the sheet, drives foil highlight
    this._raf = null;
    this.input = new Input(this);
    this.start();

    // Seed any stamps declared in config (async load, order preserved).
    if (Array.isArray(config.stamps)) {
      this._seed = Promise.all(config.stamps.map((s) => this.addStamp(s)));
    }
  }

  applyBackground(background) {
    this.config.background = background;
    if (background === 'transparent' || background == null) {
      this.gl.clearColor(0, 0, 0, 0);
      this.canvas.style.background = 'transparent';
    } else {
      const [r, g, b] = hexToRgb(background);
      this.gl.clearColor(r, g, b, 1);
    }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return; // wait for a real size (hidden / pre-layout)
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h);
    // Ortho frustum in CSS-pixel space, centered.
    this.camera.orthographic({
      left: -w / 2,
      right: w / 2,
      top: h / 2,
      bottom: -h / 2,
      near: -100,
      far: 100,
    });
  }

  /**
   * Load a PNG and add it as a stamp on top of the stack.
   * @param {object} stampConfig  { src, x, y, rotation, scale, ...style }
   * @returns {Promise<Stamp>}
   */
  async addStamp(stampConfig) {
    const { texture, width, height, alpha } = await Stamp.loadTexture(
      this.gl,
      stampConfig.src
    );
    // Merge sheet-wide style defaults under any explicit per-stamp values.
    const merged = { ...this.stampDefaults, ...stampConfig };
    const stamp = new Stamp(this.gl, {
      texture,
      width,
      height,
      alpha,
      config: merged,
    });
    stamp.shadowMesh.setParent(this.scene);
    stamp.mesh.setParent(this.scene);
    this.stamps.push(stamp);
    this.reorder();
    return stamp;
  }

  /** Remove every stamp. */
  clear() {
    for (const stamp of this.stamps) {
      stamp.mesh.setParent(null);
      stamp.shadowMesh.setParent(null);
    }
    this.stamps.length = 0;
    this.selected = null;
    this.onSelect?.(null);
  }

  /**
   * Replace the whole stamp list in one go — the batch path for generators and
   * re-rolls. Textures are cached by src, so reusing the same images across
   * calls costs no decoding.
   * @param {object[]} stampConfigs
   * @returns {Promise<Stamp[]>}
   */
  async setStamps(stampConfigs = []) {
    this.clear();
    const stamps = [];
    for (const config of stampConfigs) {
      stamps.push(await this.addStamp(config));
    }
    return stamps;
  }

  /** Remove a stamp and free its meshes from the scene. */
  removeStamp(stamp) {
    const i = this.stamps.indexOf(stamp);
    if (i === -1) return;
    if (this.selected === stamp) {
      this.selected = null;
      for (const s of this.stamps) s.dimTarget = 0;
    }
    stamp.mesh.setParent(null);
    stamp.shadowMesh.setParent(null);
    this.stamps.splice(i, 1);
    this.reorder();
  }

  /**
   * Set the selected stamp. When `dimOnSelect` is enabled (author mode only —
   * it's a plain property, never serialized, so exports don't dim), the other
   * stickers fade back so the active one reads clearly.
   */
  select(stamp) {
    if (this.selected && this.selected !== stamp) this.selected.selected = false;
    this.selected = stamp;
    if (stamp) {
      stamp.selected = true;
      stamp.selectionLift = !!this.dimOnSelect; // author-only, like the dim
    }
    for (const s of this.stamps) {
      s.dimTarget = this.dimOnSelect && stamp && s !== stamp ? 1 : 0;
    }
    this.onSelect?.(stamp);
  }

  /** Raise a stamp to the top of the z-order. */
  raise(stamp) {
    const i = this.stamps.indexOf(stamp);
    if (i === -1 || i === this.stamps.length - 1) return;
    this.stamps.splice(i, 1);
    this.stamps.push(stamp);
    this.reorder();
  }

  /**
   * With depthTest off, paint order is z-order. OGL sorts opaque front-to-back
   * but respects renderOrder for transparent meshes, so drive it explicitly.
   */
  reorder() {
    // Each stamp occupies two z-slots: shadow just behind its own sticker.
    this.stamps.forEach((stamp, i) => {
      stamp.shadowMesh.renderOrder = i * 2;
      stamp.mesh.renderOrder = i * 2 + 1;
    });
  }

  start() {
    if (this._raf) return;
    const loop = (t) => {
      this._raf = requestAnimationFrame(loop);
      this.time = t * 0.001;
      this.render();
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  render() {
    for (const stamp of this.stamps) {
      stamp.update(this.time, this.config.idle);
    }
    this.onFrame?.(); // author panel uses this to sync displayed values
    this.renderer.render({ scene: this.scene, camera: this.camera });
  }

  /** Convert a DOM pointer event to sheet-world coords (px, origin center, y-up). */
  toWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    return {
      x: (nx - 0.5) * this.width,
      y: (0.5 - ny) * this.height,
      // normalized -1..1 for the foil highlight driver
      px: (nx - 0.5) * 2,
      py: (0.5 - ny) * 2,
    };
  }

  /** Topmost stamp whose opaque pixels (or border) are under the point. */
  pick(wx, wy) {
    for (let i = this.stamps.length - 1; i >= 0; i--) {
      if (this.stamps[i].hitTest(wx, wy)) return this.stamps[i];
    }
    return null;
  }

  /** Serialize the whole sheet — this JSON is the export format. */
  serialize() {
    return {
      background: this.config.background,
      dragEnabled: this.config.dragEnabled,
      shadowSoftness: this.config.shadowSoftness,
      idle: this.config.idle,
      hover: this.config.hover,
      rotationOnDrag: this.config.rotationOnDrag,
      stamps: this.stamps.map((s) => s.serialize()),
    };
  }

  destroy() {
    this.stop();
    this.input?.destroy();
    this._ro?.disconnect();
    this.canvas.remove();
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
