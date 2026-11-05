export class Sound {
  constructor() { this.ctx = null; this.sources = []; this.nodes = []; this.stepClock = 0; this.whisperClock = 0; }
  async start() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const c = this.ctx = new AudioContext();
    this.master = c.createGain(); this.master.gain.value = .32; this.master.connect(c.destination);
    this.reverb = c.createConvolver(); this.wet = c.createGain(); this.wet.gain.value = .22;
    this.reverb.connect(this.wet); this.wet.connect(this.master); this.room(80);
    this.droneGain = c.createGain(); this.droneGain.gain.value = .045; this.droneGain.connect(this.master);
    for (const hz of [47, 70.4, 94.3]) { const o = c.createOscillator(); o.frequency.value = hz; o.type = 'sine'; o.connect(this.droneGain); o.start(); this.sources.push(o); }
    const n = c.sampleRate * 2; this.noise = c.createBuffer(1, n, c.sampleRate);
    const data = this.noise.getChannelData(0); for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    this.whisper = c.createBufferSource(); this.whisper.buffer = this.noise; this.whisper.loop = true;
    this.filter = c.createBiquadFilter(); this.filter.type = 'bandpass'; this.filter.frequency.value = 1300; this.filter.Q.value = 1.5;
    this.whisperGain = c.createGain(); this.whisperGain.gain.value = 0;
    this.panner = c.createPanner(); this.panner.panningModel = 'HRTF'; this.panner.distanceModel = 'inverse';
    this.whisper.connect(this.filter); this.filter.connect(this.whisperGain); this.whisperGain.connect(this.panner);
    this.panner.connect(this.master); this.panner.connect(this.reverb); this.whisper.start(); this.sources.push(this.whisper);
  }
  room(volume) {
    if (!this.ctx) return;
    const c = this.ctx, seconds = Math.min(2.8, .4 + volume / 140), n = Math.floor(c.sampleRate * seconds);
    const impulse = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = impulse.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    this.reverb.buffer = impulse;
  }
  pulse(hz, duration, gain, noise = false) {
    if (!this.ctx) return;
    const c = this.ctx, s = noise ? c.createBufferSource() : c.createOscillator(), g = c.createGain();
    if (noise) s.buffer = this.noise; else s.frequency.value = hz;
    g.gain.setValueAtTime(gain, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + duration);
    s.connect(g); g.connect(this.master); g.connect(this.reverb); s.start(); s.stop(c.currentTime + duration);
    this.sources.push(s); s.onended = () => { s.disconnect(); g.disconnect(); const i = this.sources.indexOf(s); if (i >= 0) this.sources.splice(i, 1); };
  }
  update(dt, player, direction, fear, moving, surface, time) {
    if (!this.ctx) return;
    const c = this.ctx, l = c.listener;
    l.positionX.value = player.x; l.positionY.value = player.y; l.positionZ.value = player.z;
    l.forwardX.value = direction.x; l.forwardY.value = direction.y; l.forwardZ.value = direction.z;
    l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    this.droneGain.gain.setTargetAtTime(.025 + fear * .065, c.currentTime, .4);
    this.panner.positionX.value = player.x + 2; this.panner.positionY.value = 1.7; this.panner.positionZ.value = player.z + 1;
    this.whisperGain.gain.setTargetAtTime(fear > .5 ? (fear - .5) * .11 * Math.max(0, Math.sin(time * .7)) : 0, c.currentTime, .3);
    this.filter.frequency.value = 900 + fear * 1400;
    this.stepClock -= dt; this.whisperClock -= dt;
    if (moving && this.stepClock <= 0) { this.pulse(surface === 'tile' ? 180 : 90, .075, .07, true); this.stepClock = .48; }
    if (fear > .25 && this.whisperClock <= 0) { this.pulse(52, .16, fear * .13); this.whisperClock = 1.2 - fear * .5; }
  }
  pause() { this.ctx?.suspend(); }
  dispose() { for (const s of this.sources) { try { s.stop(); } catch {} s.disconnect(); } this.sources.length = 0; this.ctx?.close(); }
}
