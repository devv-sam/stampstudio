export type DiscBackLook = {
  /** band width, deg */
  spread: number
  /** dark band depth, 0-1 */
  contrast: number
  /** 0-1 */
  rainbow: number
  /** 0-1 */
  grooves: number
}

const conic = (stops: string[]) =>
  `conic-gradient(from var(--sheen, 0deg), ${stops.join(', ')})`

/** light mirrors across the hub */
const mirrored = (half: [string, number][]) =>
  [...half, ...half.map(([c, a]) => [c, a + 180] as const)].map(
    ([c, a]) => `${c} ${a}deg`,
  )

/** back face background */
export function discBack(hole: number, look: DiscBackLook) {
  const s = look.spread / 2
  const d = Math.round(196 - look.contrast * 130)
  const mid = '#c3c4c8'

  const silver = conic(
    mirrored([
      [mid, 0],
      [mid, 45 - s],
      ['#f2f2f4', 45],
      [mid, 45 + s],
      [mid, 135 - s],
      [`rgb(${d} ${d} ${d + 4})`, 135],
      [mid, 135 + s],
      [mid, 180],
    ]),
  )
  const a = look.rainbow
  // pink and cyan edges
  const fringe = conic(
    mirrored([
      ['transparent', 0],
      ['transparent', 45 - s * 1.6],
      [`rgb(255 160 210 / ${a})`, 45 - s * 0.9],
      ['transparent', 45],
      [`rgb(140 215 255 / ${a})`, 45 + s * 0.9],
      [`rgb(190 255 200 / ${a * 0.6})`, 45 + s * 1.3],
      ['transparent', 45 + s * 1.6],
      ['transparent', 180],
    ]),
  )
  const grooves = `repeating-radial-gradient(circle, rgb(255 255 255 / ${look.grooves}) 0 2px, transparent 2px 10px)`
  const rim = 'radial-gradient(circle closest-side, transparent 98.4%, #6f7075 99%)'
  // dark hub, bright lip, mirror band
  const h = (n: number) => `${hole + n}%`
  const hub = `radial-gradient(circle closest-side, transparent ${hole}%, #0e0e10 ${hole}%, #0e0e10 ${h(1.5)}, #dedee2 ${h(2)}, #19191b ${h(2.6)}, #2b2b2e ${h(9)}, #a2a3a9 ${h(9.5)}, #cbccd0 ${h(14)}, transparent ${h(14.5)})`

  return [hub, rim, grooves, fringe, silver].join(', ')
}
