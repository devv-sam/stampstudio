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
    constructor(container: HTMLElement, config?: object);
    container: HTMLElement;
    config: {
        background: any;
        dragEnabled: any;
        shadowSoftness: any;
        idle: any;
        hover: any;
        rotationOnDrag: any;
        stamps: any[];
    };
    stamps: any[];
    renderer: Renderer;
    gl: import("ogl").OGLRenderingContext;
    canvas: HTMLCanvasElement | (OffscreenCanvas & HTMLCanvasElement);
    camera: Camera;
    scene: Transform;
    width: number;
    height: number;
    stampDefaults: {
        borderWidth: number;
        borderColor: string;
        foilEnabled: boolean;
        foilIntensity: number;
        shadowStrength: number;
    };
    selected: any;
    onSelect: any;
    onFrame: any;
    _ro: ResizeObserver;
    time: number;
    pointer: number[];
    _raf: number;
    input: Input;
    _seed: Promise<any[]>;
    applyBackground(background: any): void;
    resize(): void;
    /**
     * Load a PNG and add it as a stamp on top of the stack.
     * @param {object} stampConfig  { src, x, y, rotation, scale, ...style }
     * @returns {Promise<Stamp>}
     */
    addStamp(stampConfig: object): Promise<Stamp>;
    /** Remove every stamp. */
    clear(): void;
    /**
     * Replace the whole stamp list in one go — the batch path for generators and
     * re-rolls. Textures are cached by src, so reusing the same images across
     * calls costs no decoding.
     * @param {object[]} stampConfigs
     * @returns {Promise<Stamp[]>}
     */
    setStamps(stampConfigs?: object[]): Promise<Stamp[]>;
    /** Remove a stamp and free its meshes from the scene. */
    removeStamp(stamp: any): void;
    /**
     * Set the selected stamp. When `dimOnSelect` is enabled (author mode only —
     * it's a plain property, never serialized, so exports don't dim), the other
     * stickers fade back so the active one reads clearly.
     */
    select(stamp: any): void;
    /** Raise a stamp to the top of the z-order. */
    raise(stamp: any): void;
    /**
     * With depthTest off, paint order is z-order. OGL sorts opaque front-to-back
     * but respects renderOrder for transparent meshes, so drive it explicitly.
     */
    reorder(): void;
    start(): void;
    stop(): void;
    render(): void;
    /** Convert a DOM pointer event to sheet-world coords (px, origin center, y-up). */
    toWorld(clientX: any, clientY: any): {
        x: number;
        y: number;
        px: number;
        py: number;
    };
    /** Topmost stamp whose opaque pixels (or border) are under the point. */
    pick(wx: any, wy: any): any;
    /** Serialize the whole sheet — this JSON is the export format. */
    serialize(): {
        background: any;
        dragEnabled: any;
        shadowSoftness: any;
        idle: any;
        hover: any;
        rotationOnDrag: any;
        stamps: any[];
    };
    destroy(): void;
}
import { Renderer } from 'ogl';
import { Camera } from 'ogl';
import { Transform } from 'ogl';
import { Input } from './input.js';
import { Stamp } from './Stamp.js';
