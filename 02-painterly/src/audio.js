const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export class Sound {
  constructor() {
    this.ctx = null;
    this.sources = [];
    this.nodes = [];
    this.activeVoices = new Map();
    this.impulses = new Map();
    this.stepClock = 0;
    this.whisperClock = 1;
    this.creakClock = 12;
    this.controlClock = 0;
    this.stepNumber = 0;
    this.disposed = false;
  }

  keep(node) { this.nodes.push(node); return node; }

  async start() {
    if (this.disposed) throw Error('The audio engine has been disposed. Reload the page.');
    if (this.ctx) {
      if (this.ctx.state === 'closed') throw Error('The audio context is closed. Reload the page.');
      await this.ctx.resume();
      if (this.ctx.state !== 'running') throw Error('Audio requires a direct click in this browser.');
      return;
    }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error('Web Audio is unavailable in this browser.');
    const c = this.ctx = new Context();
    this.master = this.keep(c.createGain());
    this.master.gain.value = .32;
    this.limiter = this.keep(c.createDynamicsCompressor());
    this.limiter.threshold.value = -15;
    this.limiter.knee.value = 10;
    this.limiter.ratio.value = 10;
    this.limiter.attack.value = .008;
    this.limiter.release.value = .18;
    this.master.connect(this.limiter);this.limiter.connect(c.destination);
    this.reverb = this.keep(c.createConvolver());
    this.wet = this.keep(c.createGain());this.wet.gain.value = .14;
    this.reverb.connect(this.wet);this.wet.connect(this.master);
    this.room(80);

    const length = c.sampleRate * 3;
    this.noise = c.createBuffer(1, length, c.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 761923;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    this.droneGain = this.keep(c.createGain());this.droneGain.gain.value = .028;
    const droneFilter = this.keep(c.createBiquadFilter());
    droneFilter.type = 'lowpass';droneFilter.frequency.value = 340;droneFilter.Q.value = .4;
    this.droneGain.connect(droneFilter);droneFilter.connect(this.master);droneFilter.connect(this.reverb);
    for (let i = 0; i < 4; i++) {
      const oscillator = c.createOscillator(), pan = this.keep(c.createStereoPanner());
      oscillator.frequency.value = i === 0 ? 35.2 : i === 1 ? 47 : i === 2 ? 70.55 : 94.13;
      oscillator.type = i === 2 ? 'triangle' : 'sine';
      pan.pan.value = i % 2 === 0 ? -.6 : .6;
      oscillator.connect(pan);pan.connect(this.droneGain);oscillator.start();this.sources.push(oscillator);
    }
    this.whispers = [];
    for (let i = 0; i < 2; i++) {
      const source = c.createBufferSource(), filter = this.keep(c.createBiquadFilter());
      const lowpass = this.keep(c.createBiquadFilter()), gain = this.keep(c.createGain());
      const panner = this.keep(c.createPanner());
      source.buffer = this.noise;source.loop = true;source.playbackRate.value = i ? .91 : 1.07;
      filter.type = 'bandpass';filter.frequency.value = i ? 1720 : 1160;filter.Q.value = 2.8;
      lowpass.type = 'lowpass';lowpass.frequency.value = 3400;gain.gain.value = 0;
      panner.panningModel = 'HRTF';panner.distanceModel = 'inverse';panner.refDistance = 1;panner.rolloffFactor = .8;
      source.connect(filter);filter.connect(lowpass);lowpass.connect(gain);gain.connect(panner);
      panner.connect(this.master);panner.connect(this.reverb);
      source.start(0, i ? 1.2 : .2);this.sources.push(source);
      this.whispers.push({ source, filter, gain, panner });
    }
    // Keep the first channel aliases available to existing authoring scripts.
    this.whisper = this.whispers[0].source;this.filter = this.whispers[0].filter;
    this.whisperGain = this.whispers[0].gain;this.panner = this.whispers[0].panner;
    await c.resume();
    if (c.state !== 'running') throw Error('Audio requires a direct click in this browser.');
  }

  room(volume) {
    if (!this.ctx || this.ctx.state === 'closed' || !this.reverb) return;
    const c = this.ctx, size = volume < 90 ? 0 : volume < 145 ? 1 : 2;
    if (!this.impulses.has(size)) {
      const seconds = size === 0 ? .72 : size === 1 ? 1.25 : 1.85;
      const length = Math.floor(c.sampleRate * seconds), impulse = c.createBuffer(2, length, c.sampleRate);
      let seed = 1193 + size * 134;
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          data[i] = (seed / 2147483648 - 1) * Math.pow(1 - i / length, 3.5) * .4;
        }
        for (let tap = 1; tap <= 3; tap++) {
          const index = Math.floor(c.sampleRate * (.016 + tap * .023 + channel * .003));
          if (index < length) data[index] += .25 / tap;
        }
      }
      this.impulses.set(size, impulse);
    }
    this.reverb.buffer = this.impulses.get(size);
  }

  voice(hz, duration, gain, noise, delay = 0, filterType = 'bandpass', position = null) {
    if (!this.ctx || this.ctx.state !== 'running' || this.disposed) return;
    const c = this.ctx, now = c.currentTime + delay;
    const source = noise ? c.createBufferSource() : c.createOscillator();
    const filter = c.createBiquadFilter(), envelope = c.createGain();
    duration = clamp(duration, .025, 2.5);gain = clamp(gain, 0, .22);hz = clamp(hz, 30, 6000);
    if (noise) { source.buffer = this.noise;source.playbackRate.value = .97 + (this.stepNumber % 5) * .017; }
    else { source.type = 'sine';source.frequency.setValueAtTime(hz, now);source.frequency.exponentialRampToValueAtTime(Math.max(28,hz * .72), now + duration); }
    // Filter both tonal and noise voices so a surface frequency has an audible effect.
    filter.type = noise ? filterType : 'lowpass';filter.frequency.value = noise ? hz : Math.min(6000,hz * 4);
    filter.Q.value = noise ? .75 : .5;
    envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0001,gain), now + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter);filter.connect(envelope);
    const nodes = [filter,envelope];
    if (position) {
      const panner = c.createPanner();panner.panningModel = 'HRTF';panner.refDistance = 1;
      panner.positionX.value = position[0];panner.positionY.value = position[1];panner.positionZ.value = position[2];
      envelope.connect(panner);panner.connect(this.master);panner.connect(this.reverb);nodes.push(panner);
    } else { envelope.connect(this.master);envelope.connect(this.reverb); }
    this.sources.push(source);this.activeVoices.set(source,nodes);
    source.onended = () => {
      source.disconnect();for (const node of nodes) node.disconnect();
      this.activeVoices.delete(source);
      const index = this.sources.indexOf(source);if (index >= 0) this.sources.splice(index,1);
    };
    source.start(now, noise ? (this.stepNumber % 6) * .17 : 0);
    source.stop(now + duration + .01);
  }

  pulse(hz, duration, gain, noise = false) { this.voice(hz,duration,gain,noise); }

  footstep(surface) {
    this.stepNumber++;
    const variation = 1 + Math.sin(this.stepNumber * 2.17) * .08;
    if (surface === 'tile') {
      this.voice(165 * variation,.075,.075,false);
      this.voice(2100 * variation,.055,.042,true,0,'highpass');
      this.voice(450,.045,.016,true,.025,'bandpass');
    } else {
      this.voice(88 * variation,.14,.105,false);
      this.voice(380 * variation,.115,.035,true);
      if (this.stepNumber % 7 === 0) this.voice(220,.23,.018,true,.025);
    }
  }

  update(dt, player, direction, fear, moving, surface, time) {
    if (!this.ctx || this.ctx.state !== 'running' || this.disposed) return;
    const c = this.ctx, listener = c.listener;
    fear = clamp(fear,0,1);
    listener.positionX.value = player.x;listener.positionY.value = player.y;listener.positionZ.value = player.z;
    listener.forwardX.value = direction.x;listener.forwardY.value = direction.y;listener.forwardZ.value = direction.z;
    listener.upX.value = 0;listener.upY.value = 1;listener.upZ.value = 0;
    this.controlClock -= dt;
    if (this.controlClock <= 0) {
      this.controlClock = .1;
      this.droneGain.gain.setTargetAtTime(.022 + fear * .035,c.currentTime,.5);
      for (let i = 0; i < 2; i++) {
        const channel = this.whispers[i], side = i ? -1 : 1;
        const swell = Math.pow(Math.max(0,Math.sin(time * .38 + i * 2.4)),2);
        channel.panner.positionX.value = player.x + direction.z * side * 1.8 - direction.x * .8;
        channel.panner.positionY.value = player.y + .15;
        channel.panner.positionZ.value = player.z - direction.x * side * 1.8 - direction.z * .8;
        channel.gain.gain.setTargetAtTime(Math.max(0,fear - .35) * .075 * swell,c.currentTime,.28);
        channel.filter.frequency.setTargetAtTime(1000 + i * 550 + Math.sin(time * .6 + i) * 180 + fear * 300,c.currentTime,.3);
      }
    }
    this.stepClock -= dt;this.whisperClock -= dt;this.creakClock -= dt;
    if (moving && this.stepClock <= 0) { this.footstep(surface);this.stepClock = .46; }
    if (fear > .28 && this.whisperClock <= 0) {
      this.voice(52,.14,fear * .055,false);
      this.voice(61,.11,fear * .034,false,.17);
      this.whisperClock = 1.3 - fear * .44;
    }
    if (this.creakClock <= 0) {
      // A sparse, quiet room sound supports anticipation instead of a sudden peak.
      this.voice(240 + Math.sin(time) * 55,.65,.025 + fear * .012,true,0,'bandpass',
        [player.x + Math.sin(time * .7) * 3.5,1.4,player.z + Math.cos(time * .4) * 3.5]);
      this.creakClock = 16 + (Math.sin(time * .73) + 1) * 9;
    }
  }

  pause() {
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const source of this.sources) {
      source.onended = null;
      try { source.stop(); } catch {}
      source.disconnect();
    }
    for (const nodes of this.activeVoices.values()) for (const node of nodes) node.disconnect();
    for (const node of this.nodes) node.disconnect();
    this.sources.length = 0;this.nodes.length = 0;this.activeVoices.clear();this.impulses.clear();
    this.noise = null;
    if (this.ctx?.state !== 'closed') this.ctx?.close().catch(() => {});
  }
}
