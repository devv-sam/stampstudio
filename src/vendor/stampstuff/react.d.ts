/**
 * React wrapper. Mounts a Sheet into a plain host div — deliberately NOT the
 * <stamp-sheet> custom element, because custom elements connect during React's
 * mutation phase (before effects run), so a `.config` set via ref would arrive
 * after the element already mounted with nothing.
 *
 * Effects don't run on the server, so this is SSR-safe by construction.
 *
 * @param {object} props
 * @param {object} props.config    serializable Sheet config
 * @param {(sheet: Sheet) => void} [props.onReady]
 *        Receives the live Sheet so you can drive it imperatively
 *        (addStamp / removeStamp / select / serialize / setStamps).
 * @param {string} [props.className]
 * @param {object} [props.style]
 *
 * NOTE: the Sheet is recreated when the `config` prop's identity changes.
 * Memoize it (useMemo) if you don't want that, and drive changes through the
 * `onReady` handle instead.
 */
export function StampSheet({ config, onReady, className, style, ...rest }: {
    config: object;
    onReady?: (sheet: Sheet) => void;
    className?: string;
    style?: object;
}): import("react").DetailedReactHTMLElement<{
    ref: import("react").RefObject<any>;
    className: string;
    style: any;
}, any>;
export { Sheet };
export { Stamp } from "./Stamp.js";
import { Sheet } from './Sheet.js';
