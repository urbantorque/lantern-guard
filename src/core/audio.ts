/**
 * Fully synthesised sound. No audio files: every pop, chime and clack is built
 * from oscillators and filtered noise, so the whole soundscape tunes together
 * (every "pop" lands on the same pentatonic scale as the music).
 */

const PENTA = [0, 2, 4, 7, 9] // major pentatonic degrees
const BASE_MIDI = 62 // D4

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
const scaleNote = (i: number, base = BASE_MIDI) => {
  const oct = Math.floor(i / PENTA.length)
  const deg = ((i % PENTA.length) + PENTA.length) % PENTA.length
  return mtof(base + oct * 12 + PENTA[deg])
}

export interface AudioSettings {
  sfx: number
  music: number
  ambience: number
  muted: boolean
}
export interface AudioScene { night:boolean; weather:'clear'|'rain'|'mist'|'breeze' }
/** A silent test URL overrides this session without changing saved preferences. */
export const profileSound=(prefs:{muted:boolean;music:boolean;effects:boolean},silent=false):AudioSettings=>({
  sfx:prefs.effects?.7:0,music:prefs.music?.6:0,ambience:prefs.music?.35:0,muted:silent||prefs.muted,
})

type Rate = { last: number; count: number }

export class Sound {
  ctx: AudioContext | null = null
  private master!: GainNode
  private sfxBus!: GainNode
  private musicBus!: GainNode
  private ambBus!: GainNode
  private noiseBuf!: AudioBuffer
  private beamOsc: OscillatorNode | null = null
  private beamGain: GainNode | null = null
  private rates = new Map<string, Rate>()
  private musicNext = 0
  private musicStep = 0
  private musicNight:boolean|undefined
  private weatherGain:GainNode|null=null
  private ambienceStarted = false
  private popCombo = 0
  private popComboAt = 0
  settings: AudioSettings = { sfx: 0.8, music: 0.45, ambience: 0.6, muted: false }

  /** Must be called from a user gesture (iOS). Safe to call repeatedly. */
  suspend() {
    if(this.beamGain&&this.ctx)this.beamGain.gain.setValueAtTime(0,this.ctx.currentTime)
    if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => {})
  }

  unlock() {
    if (this.settings.muted || typeof document!=='undefined'&&document.hidden) return
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      const ctx = this.ctx
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -16
      comp.knee.value = 12
      comp.ratio.value = 4
      comp.attack.value = 0.004
      comp.release.value = 0.18
      this.master = ctx.createGain()
      this.master.connect(comp).connect(ctx.destination)
      this.sfxBus = ctx.createGain()
      this.musicBus = ctx.createGain()
      this.ambBus = ctx.createGain()
      this.sfxBus.connect(this.master)
      this.musicBus.connect(this.master)
      this.ambBus.connect(this.master)
      const len = ctx.sampleRate * 2
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      this.applySettings()
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {})
    if (!this.ambienceStarted) this.startAmbience()
  }

  applySettings() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const m = this.settings.muted ? 0 : 1
    this.master.gain.setTargetAtTime(m * 0.9, t, 0.05)
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.05)
    this.musicBus.gain.setTargetAtTime(this.settings.music * 0.8, t, 0.05)
    this.ambBus.gain.setTargetAtTime(this.settings.ambience * 0.5, t, 0.05)
  }

  private get audible(){return !!this.ctx&&this.ctx.state==='running'&&!this.settings.muted&&!(typeof document!=='undefined'&&document.hidden)}
  private ok(key: string, maxPerSec: number): boolean {
    if (!this.audible) return false
    const now = this.ctx!.currentTime
    let r = this.rates.get(key)
    if (!r) {
      r = { last: -Infinity, count: 0 }
      this.rates.set(key, r)
    }
    if (now - r.last > 1 / maxPerSec) {
      r.last = now
      return true
    }
    return false
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }

  private tone(freq: number, type: OscillatorType, a: number, d: number, peak: number, bus?: AudioNode, when = 0, detune = 0) {
    const ctx = this.ctx!
    const t = ctx.currentTime + when
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    o.detune.value = detune
    this.env(g, t, a, peak, d)
    o.connect(g).connect(bus ?? this.sfxBus)
    o.start(t)
    o.stop(t + a + d + 0.05)
    return { o, g, t }
  }

  private noise(dur: number, filterType: BiquadFilterType, freq: number, q: number, peak: number, when = 0, bus?: AudioNode) {
    const ctx = this.ctx!
    const t = ctx.currentTime + when
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = filterType
    f.frequency.setValueAtTime(freq, t)
    f.Q.value = q
    const g = ctx.createGain()
    this.env(g, t, 0.003, peak, dur)
    src.connect(f).connect(g).connect(bus ?? this.sfxBus)
    src.start(t, Math.random() * 1.5)
    src.stop(t + dur + 0.05)
    return { src, f, g, t }
  }

  // ---------------------------------------------------------------- gameplay

  /** The signature sound: a soft, glassy bubble pop that climbs the scale as a combo builds. */
  pop(size = 1) {
    if (!this.ok('pop', 26)) return
    const ctx = this.ctx!
    const now = ctx.currentTime
    if (now - this.popComboAt > 0.9) this.popCombo = 0
    this.popComboAt = now
    const step = Math.min(this.popCombo, 14)
    this.popCombo++
    const f = scaleNote(step + 5 - Math.round((size - 1) * 3))
    const { o } = this.tone(f * 1.9, 'sine', 0.002, 0.11 + size * 0.04, 0.22, undefined, 0)
    o.frequency.exponentialRampToValueAtTime(f, ctx.currentTime + 0.06)
    this.tone(f * 2, 'triangle', 0.002, 0.05, 0.05, undefined, 0.004)
    this.noise(0.025, 'highpass', 3500, 0.7, 0.05)
  }

  clink() {
    if (!this.ok('clink', 10)) return
    this.tone(2400 + Math.random() * 300, 'triangle', 0.001, 0.07, 0.07)
    this.tone(3600, 'sine', 0.001, 0.04, 0.03)
  }

  crack() {
    if (!this.ok('crack', 12)) return
    this.noise(0.09, 'bandpass', 1800, 1.2, 0.35)
    const { o } = this.tone(180, 'sine', 0.002, 0.12, 0.25)
    o.frequency.exponentialRampToValueAtTime(70, this.ctx!.currentTime + 0.12)
  }

  spark() {
    if (!this.ok('spark', 10)) return
    const {o,t}=this.tone(scaleNote(8),'triangle',.002,.075,.1)
    o.frequency.exponentialRampToValueAtTime(scaleNote(5),t+.07)
    this.noise(.025,'bandpass',4200,2,.06)
  }

  impact(heavy=false){
    if(!this.ok('impact',9))return
    const {o,t}=this.tone(heavy?260:740,'sine',.002,.07,heavy?.11:.06)
    o.frequency.exponentialRampToValueAtTime(heavy?90:370,t+.065)
    this.noise(.022,'bandpass',heavy?900:2200,1,.055)
  }
  zap(){
    if(!this.ok('zap',6))return
    const {o,t}=this.tone(460,'triangle',.002,.13,.1)
    o.frequency.exponentialRampToValueAtTime(140,t+.12)
    this.noise(.09,'bandpass',2600,2,.12)
  }
  bolt(){
    if(!this.ok('bolt',5))return
    const {o,t}=this.tone(190,'triangle',.003,.16,.17)
    o.frequency.exponentialRampToValueAtTime(65,t+.15)
    this.noise(.055,'bandpass',1200,1,.15)
  }

  launch() {
    if (!this.ok('launch', 8)) return
    const n = this.noise(0.22, 'lowpass', 400, 1, 0.14)
    n.f.frequency.exponentialRampToValueAtTime(2400, n.t + 0.2)
  }

  boom(big = false) {
    if (!this.ok('boom', 10)) return
    const ctx = this.ctx!
    const { o } = this.tone(big ? 110 : 150, 'sine', 0.003, big ? 0.35 : 0.2, 0.32)
    o.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.25)
    this.noise(big ? 0.35 : 0.2, 'lowpass', 1400, 0.8, 0.22)
    // crackle tail
    for (let i = 0; i < (big ? 7 : 4); i++) this.noise(0.02, 'highpass', 4000, 1, 0.06 + Math.random() * 0.05, 0.05 + Math.random() * 0.25)
  }

  bell(pitchIndex = 0, soft = false) {
    if (!this.ok('bell', 6)) return
    const ctx = this.ctx!
    const t = ctx.currentTime
    const f = scaleNote(pitchIndex, 50)
    const car = ctx.createOscillator()
    const mod = ctx.createOscillator()
    const modGain = ctx.createGain()
    const g = ctx.createGain()
    car.frequency.value = f
    mod.frequency.value = f * 1.41
    modGain.gain.setValueAtTime(f * 2.2, t)
    modGain.gain.exponentialRampToValueAtTime(1, t + 1.4)
    mod.connect(modGain).connect(car.frequency)
    this.env(g, t, 0.004, soft ? 0.07 : 0.14, 1.6)
    car.connect(g).connect(this.sfxBus)
    car.start(t)
    mod.start(t)
    car.stop(t + 1.7)
    mod.stop(t + 1.7)
    this.tone(f * 2.76, 'sine', 0.003, 0.5, soft ? 0.02 : 0.04)
  }

  /** Continuous lighthouse hum; intensity 0..1 set every frame. */
  beam(intensity: number) {
    if (!this.ctx || !this.beamOsc&&intensity<=0) return
    if (!this.beamOsc) {
      const ctx = this.ctx
      this.beamOsc = ctx.createOscillator()
      this.beamOsc.type = 'sawtooth'
      this.beamOsc.frequency.value = 110
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 520
      f.Q.value = 6
      this.beamGain = ctx.createGain()
      this.beamGain.gain.value = 0
      this.beamOsc.connect(f).connect(this.beamGain).connect(this.sfxBus)
      this.beamOsc.start()
    }
    const target = this.settings.muted ? 0 : Math.min(1, intensity) * 0.035
    this.beamGain!.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08)
  }

  swoosh() {
    if (!this.ok('swoosh', 8)) return
    const n = this.noise(0.18, 'bandpass', 900, 2, 0.07)
    n.f.frequency.exponentialRampToValueAtTime(2600, n.t + 0.16)
  }

  harvest() {
    if (!this.ok('harvest', 4)) return
    for (let i = 0; i < 4; i++) this.tone(scaleNote(10 + i * 2), 'sine', 0.003, 0.25, 0.06, undefined, i * 0.06)
  }

  gate() {
    if (!this.audible) return
    this.noise(0.04, 'bandpass', 1100, 4, 0.35)
    this.noise(0.05, 'bandpass', 700, 4, 0.28, 0.07)
    const { o } = this.tone(140, 'sine', 0.002, 0.1, 0.3, undefined, 0.07)
    o.frequency.exponentialRampToValueAtTime(90, this.ctx!.currentTime + 0.2)
    const n = this.noise(0.35, 'lowpass', 500, 0.7, 0.09, 0.05)
    n.f.frequency.exponentialRampToValueAtTime(1600, n.t + 0.3)
  }

  build() {
    if (!this.audible) return
    const { o } = this.tone(220, 'sine', 0.002, 0.16, 0.35)
    o.frequency.exponentialRampToValueAtTime(110, this.ctx!.currentTime + 0.14)
    this.noise(0.06, 'lowpass', 900, 1, 0.2)
    for (let i = 0; i < 3; i++) this.tone(scaleNote(12 + i * 2), 'sine', 0.002, 0.18, 0.06, undefined, 0.08 + i * 0.05)
  }

  upgrade(tier = 1) {
    if (!this.audible) return
    const n = 3 + tier
    for (let i = 0; i < n; i++) this.tone(scaleNote(7 + i * 2), i === n - 1 ? 'triangle' : 'sine', 0.003, 0.3, 0.08, undefined, i * 0.055)
    const s = this.noise(0.5, 'highpass', 5000, 0.5, 0.05, 0.05)
    s.f.frequency.exponentialRampToValueAtTime(9000, s.t + 0.4)
  }

  sell() {
    if (!this.audible) return
    for (let i = 0; i < 4; i++) this.tone(scaleNote(12 - i * 2), 'sine', 0.002, 0.14, 0.06, undefined, i * 0.05)
  }

  leak() {
    if (!this.ok('leak', 5)) return
    const ctx = this.ctx!
    const { o } = this.tone(220, 'triangle', 0.01, 0.5, 0.14)
    o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.45)
    this.tone(233, 'sine', 0.01, 0.4, 0.06)
    this.noise(0.3, 'lowpass', 300, 0.7, 0.18)
  }

  waveStart() {
    if (!this.audible) return
    this.tone(scaleNote(0, 50), 'triangle', 0.08, 0.9, 0.08)
    this.tone(scaleNote(3, 50), 'triangle', 0.08, 0.9, 0.06, undefined, 0.02)
    this.gate()
  }

  waveClear() {
    if (!this.audible) return
    const chord = [0, 2, 4, 5, 7]
    chord.forEach((c, i) => this.tone(scaleNote(c + 5), 'sine', 0.004, 1.2, 0.08, undefined, i * 0.07))
    chord.forEach((c, i) => this.tone(scaleNote(c + 10), 'triangle', 0.004, 0.6, 0.025, undefined, 0.2 + i * 0.07))
  }

  bossRoar() {
    if (!this.audible) return
    const { o, g } = this.tone(55, 'sawtooth', 0.4, 2.2, 0.16)
    o.frequency.exponentialRampToValueAtTime(38, this.ctx!.currentTime + 2.4)
    void g
    this.noise(1.8, 'lowpass', 240, 1, 0.2, 0.1)
  }

  tap() {
    if (!this.ok('tap', 20)) return
    this.tone(1400, 'sine', 0.001, 0.03, 0.05)
  }

  deny() {
    if (!this.ok('deny', 6)) return
    this.tone(180, 'square', 0.002, 0.08, 0.05)
    this.tone(150, 'square', 0.002, 0.08, 0.05, undefined, 0.09)
  }

  victory() {
    if (!this.audible) return
    const seq = [0, 2, 4, 5, 7, 9, 10]
    seq.forEach((c, i) => this.tone(scaleNote(c + 5), 'triangle', 0.005, 0.8, 0.08, undefined, i * 0.11))
    seq.forEach((c, i) => this.tone(scaleNote(c), 'sine', 0.01, 1.4, 0.05, undefined, 0.6 + i * 0.02))
  }

  defeat() {
    if (!this.audible) return
    ;[5, 3, 1, 0].forEach((c, i) => this.tone(scaleNote(c, 50), 'triangle', 0.02, 0.9, 0.08, undefined, i * 0.28))
  }

  // ---------------------------------------------------------------- ambience + music

  private startAmbience() {
    if (!this.ctx) return
    this.ambienceStarted = true
    const ctx = this.ctx
    // lapping water: looping noise through a slow-moving lowpass
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    lp.Q.value = 0.9
    const g = ctx.createGain()
    g.gain.value = 0.16
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.13
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 170
    lfo.connect(lfoGain).connect(lp.frequency)
    const lfo2 = ctx.createOscillator()
    lfo2.frequency.value = 0.31
    const lfo2Gain = ctx.createGain()
    lfo2Gain.gain.value = 0.06
    lfo2.connect(lfo2Gain).connect(g.gain)
    src.connect(lp).connect(g).connect(this.ambBus)
    src.start()
    lfo.start()
    lfo2.start()
    const weather=ctx.createBufferSource(),filter=ctx.createBiquadFilter()
    weather.buffer=this.noiseBuf;weather.loop=true;filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.5
    this.weatherGain=ctx.createGain();this.weatherGain.gain.value=.001
    weather.connect(filter).connect(this.weatherGain).connect(this.ambBus);weather.start()
  }

  /** A composed four-bar motif, with a quieter minor arrangement after dusk. */
  tick(dt: number, intensity: number, scene:AudioScene={night:false,weather:'clear'}) {
    if (!this.audible) return
    const ctx=this.ctx!,now=ctx.currentTime
    this.weatherGain?.gain.setTargetAtTime(scene.weather==='rain'?.09:scene.weather==='breeze'?.035:.001,now,.7)
    if (scene.night && Math.random() < dt * 0.4) {
      const f = 4200 + Math.random() * 900
      for (let i = 0; i < 3; i++) this.tone(f, 'sine', 0.002, 0.02, 0.012, this.ambBus, i * 0.045)
    }
    if(this.musicNight!==scene.night){this.musicNight=scene.night;this.musicStep=0;this.musicNext=now}
    if(this.settings.music<=0){this.musicNext=now;return}
    // Audio-clock lookahead keeps a steady rhythm at different frame rates.
    // Never catch up a backlog after returning from a background tab.
    if(this.musicNext<now-.2)this.musicNext=now
    while(this.musicNext<now+.12){
      const when=Math.max(0,this.musicNext-now),beat=this.musicStep%16,bar=Math.floor(this.musicStep/16)%4
      const root=(scene.night?[59,55,62,57]:[62,57,59,55])[bar],minor=root===59,third=minor?3:4
      if(beat===0){
        this.tone(mtof(root-24),'sine',.06,2.5,.15,this.musicBus,when)
        for(const note of [0,third,7])this.tone(mtof(root-12+note),'triangle',.24,3,.038,this.musicBus,when)
      }
      const motif=minor?[0,3,7,10,7,3,2,7]:[0,4,7,12,9,7,4,2]
      if(beat%2===0){
        const freq=mtof(root+motif[beat/2])
        this.tone(freq,'triangle',.007,scene.night?1.1:.7,.12,this.musicBus,when)
        this.tone(freq*2,'sine',.003,.3,.019,this.musicBus,when+.008)
      }
      const arp=[0,7,third,7][beat%4]
      this.tone(mtof(root+arp-12),'sine',.005,.3,.035+intensity*.015,this.musicBus,when)
      if(intensity>.15&&beat%4===0)this.noise(.05,'lowpass',350,.8,.045*intensity,when,this.musicBus)
      this.musicStep++;this.musicNext+=scene.night?.34:.3
    }
  }
}

export const sound = new Sound()
