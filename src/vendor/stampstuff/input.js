/**
 * Pointer interaction for a Sheet: alpha-aware topmost hit test, drag with
 * pick-up lift + z-raise, spring-back on release, optional hover lift, rotation
 * toward drag velocity, and wheel-to-rotate. Foil highlight is driven per
 * sticker (only the hovered/dragged one lights up).
 */
export class Input {
  constructor(sheet) {
    this.sheet = sheet;
    this.canvas = sheet.canvas;

    this.dragging = null;
    this.hovered = null;
    this.grabX = 0;
    this.grabY = 0;
    this.lastX = 0;
    this.lastY = 0;

    this._down = this.onDown.bind(this);
    this._move = this.onMove.bind(this);
    this._up = this.onUp.bind(this);
    this._wheel = this.onWheel.bind(this);

    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this._down);
    this.canvas.addEventListener('wheel', this._wheel, { passive: false });
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  onDown(e) {
    if (!this.sheet.config.dragEnabled) return;
    const w = this.sheet.toWorld(e.clientX, e.clientY);
    const stamp = this.sheet.pick(w.x, w.y);

    this.sheet.select(stamp); // grabbing (or clicking empty) sets selection

    if (!stamp) return;
    e.preventDefault();
    this.dragging = stamp;
    this.sheet.raise(stamp);
    stamp.state = 'dragging';
    stamp.targetLift = 1;
    stamp.foilActiveTarget = 1;
    this.grabX = stamp.config.x - w.x;
    this.grabY = stamp.config.y - w.y;
    this.lastX = w.x;
    this.lastY = w.y;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.canvas.style.cursor = 'grabbing';
  }

  onMove(e) {
    const w = this.sheet.toWorld(e.clientX, e.clientY);

    if (this.dragging) {
      const s = this.dragging;
      // Keep the sticker inside the sheet: clamp its center so the visible
      // shape (half-size + border) stays within the bounds.
      const eff = s.config.scale * s.config.baseScale;
      const hw = (s.baseWidth / 2 + s.config.borderWidth) * eff;
      const hh = (s.baseHeight / 2 + s.config.borderWidth) * eff;
      const maxX = Math.max(0, this.sheet.width / 2 - hw);
      const maxY = Math.max(0, this.sheet.height / 2 - hh);
      s.config.x = clamp(w.x + this.grabX, -maxX, maxX);
      s.config.y = clamp(w.y + this.grabY, -maxY, maxY);
      s.foilPointer = s.pointerUV(w.x, w.y);

      if (this.sheet.config.rotationOnDrag) {
        const vx = w.x - this.lastX;
        s.targetTilt = clamp(-vx * 0.006, -0.4, 0.4);
      }
      this.lastX = w.x;
      this.lastY = w.y;
      return;
    }

    // Hover: tiny lift + foil highlight on the topmost stamp under the cursor.
    if (!this.sheet.config.dragEnabled) return;
    const stamp = this.sheet.pick(w.x, w.y);
    if (stamp !== this.hovered) {
      if (this.hovered) {
        this.hovered.foilActiveTarget = 0;
        if (this.hovered.state === 'hover') {
          this.hovered.state = 'idle';
          this.hovered.targetLift = 0;
        }
      }
      this.hovered = stamp;
      if (stamp) {
        stamp.foilActiveTarget = 1;
        if (this.sheet.config.hover) {
          stamp.state = 'hover';
          stamp.targetLift = 0.22;
        }
      }
    }
    if (stamp) stamp.foilPointer = stamp.pointerUV(w.x, w.y);
    this.canvas.style.cursor = stamp ? 'grab' : 'default';
  }

  onUp(e) {
    if (!this.dragging) return;
    const s = this.dragging;
    s.state = 'idle';
    s.targetLift = 0; // spring back (with overshoot from the lift spring)
    s.targetTilt = 0;
    s.foilActiveTarget = 0;
    this.dragging = null;
    this.hovered = null; // re-evaluate hover on the next move
    this.canvas.releasePointerCapture?.(e.pointerId);
    this.canvas.style.cursor = 'default';
  }

  /** Scroll wheel over a sticker rotates it (and selects it for feedback). */
  onWheel(e) {
    if (!this.sheet.config.dragEnabled) return;
    const w = this.sheet.toWorld(e.clientX, e.clientY);
    const stamp = this.sheet.pick(w.x, w.y);
    if (!stamp) return;
    e.preventDefault();
    stamp.config.rotation += e.deltaY * 0.0025;
    if (this.sheet.selected !== stamp) this.sheet.select(stamp);
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._down);
    this.canvas.removeEventListener('wheel', this._wheel);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
