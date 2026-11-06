/** Synthesised so export needs no audio asset. */
export function playThunk(delaySeconds: number) {
  const ctx = new AudioContext()
  const at = ctx.currentTime + delaySeconds
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.setValueAtTime(140, at)
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.12)
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.setValueAtTime(0.5, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + 0.2)
  osc.onended = () => void ctx.close()
}
