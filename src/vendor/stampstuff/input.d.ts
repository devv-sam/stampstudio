/**
 * Pointer interaction for a Sheet: alpha-aware topmost hit test, drag with
 * pick-up lift + z-raise, spring-back on release, optional hover lift, rotation
 * toward drag velocity, and wheel-to-rotate. Foil highlight is driven per
 * sticker (only the hovered/dragged one lights up).
 */
export class Input {
    constructor(sheet: any);
    sheet: any;
    canvas: any;
    dragging: any;
    hovered: any;
    grabX: number;
    grabY: number;
    lastX: number;
    lastY: number;
    _down: any;
    _move: any;
    _up: any;
    _wheel: any;
    onDown(e: any): void;
    onMove(e: any): void;
    onUp(e: any): void;
    /** Scroll wheel over a sticker rotates it (and selects it for feedback). */
    onWheel(e: any): void;
    destroy(): void;
}
