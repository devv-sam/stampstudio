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
    static loadTexture(gl: any, src: any): any;
    /** Drop cached textures/alpha maps (all, or just one src). */
    static clearTextureCache(gl: any, src: any): void;
    static _decode(gl: any, src: any): Promise<any>;
    constructor(gl: any, { texture, width, height, alpha, config }: {
        texture: any;
        width: any;
        height: any;
        alpha: any;
        config: any;
    });
    gl: any;
    texture: any;
    baseWidth: any;
    baseHeight: any;
    alpha: any;
    config: {
        src: any;
        x: any;
        y: any;
        rotation: any;
        baseScale: any;
        scale: any;
        borderWidth: any;
        borderColor: any;
        foilEnabled: any;
        foilIntensity: any;
        shadowStrength: any;
    };
    state: string;
    lift: number;
    liftVel: number;
    targetLift: number;
    tilt: number;
    targetTilt: number;
    bobPhase: number;
    selected: boolean;
    foilPointer: number[];
    foilActive: number;
    foilActiveTarget: number;
    dim: number;
    dimTarget: number;
    _ax: any;
    _ay: any;
    _arot: any;
    _as: any;
    paddedWidth: any;
    paddedHeight: any;
    uvScale: number[];
    uvOffset: number[];
    program: Program;
    mesh: Mesh<import("ogl").Geometry, Program>;
    shadowProgram: Program;
    shadowMesh: Mesh<import("ogl").Geometry, Program>;
    syncStyle(): void;
    /** Per-frame: advance springs + foil/selection state, then write transform. */
    update(time: any, idle: any): void;
    /** Cursor position (sheet-world px) expressed in this sticker's texture uv. */
    pointerUV(wx: any, wy: any): number[];
    applyTransform(time: any, idle: any): void;
    /**
     * Alpha-aware hit test in sheet-world coords (px, origin center, y-up).
     * Returns true if the point lands on an opaque pixel, or within borderWidth
     * of one (so the die-cut border is grabbable too).
     */
    hitTest(wx: any, wy: any): boolean;
    sampleAlpha(px: any, py: any): any;
    serialize(): {
        src: any;
        x: any;
        y: any;
        rotation: any;
        baseScale: any;
        scale: any;
        borderWidth: any;
        borderColor: any;
        foilEnabled: any;
        foilIntensity: any;
        shadowStrength: any;
    };
}
import { Program } from 'ogl';
import { Mesh } from 'ogl';
