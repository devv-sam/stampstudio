import { createElement, useEffect, useRef } from 'react';
import { Sheet } from './Sheet.js';

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
export function StampSheet({ config, onReady, className, style, ...rest }) {
  const hostRef = useRef(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const sheet = new Sheet(host, config ?? {});
    readyRef.current?.(sheet);
    return () => sheet.destroy();
  }, [config]);

  return createElement('div', {
    ref: hostRef,
    className,
    style: { display: 'block', width: '100%', height: '100%', ...style },
    ...rest,
  });
}

export { Sheet };
export { Stamp } from './Stamp.js';
