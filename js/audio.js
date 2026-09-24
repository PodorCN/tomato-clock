/**
 * Audio Engine - Web Audio API Synthesizer
 * Provides crystal-clear procedural sound effects, chime notifications,
 * and built-in ambient white noise without any external media dependencies.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.noiseNode = null;
    this.noiseGain = null;
    this.currentNoiseType = null;
    this.volume = 0.5;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.noiseGain && !this.isMuted) {
      this.noiseGain.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime);
    }
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.noiseGain) {
      this.noiseGain.gain.setValueAtTime(muted ? 0 : this.volume * 0.4, this.ctx.currentTime);
    }
  }

  /**
   * Play completion bell / chime using harmonic synthesis
   * @param {'focus-done' | 'break-done' | 'tick' | 'click'} type 
   */
  playNotification(type = 'focus-done') {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;

    if (type === 'focus-done') {
      // Calming Tibetan Singing Bowl / Zen Chime (Solfeggio harmonic frequencies: 528Hz, 1056Hz, 1584Hz)
      const frequencies = [528, 792, 1056, 1584];
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.8, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
      masterGain.connect(this.ctx.destination);

      frequencies.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() * 2 - 1), now);

        gain.gain.setValueAtTime(0.4 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.0 - idx * 0.5);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 4.5);
      });
    } else if (type === 'break-done') {
      // Bright upbeat melodic bell (Ascending notes: C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const noteTime = now + i * 0.14;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0, noteTime);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 1.3);
      });
    } else if (type === 'click') {
      // Minimal soft click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      gain.gain.setValueAtTime(this.volume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  /**
   * Procedural Ambient Noise Generators
   * @param {'rain' | 'fire' | 'cafe' | 'waves' | 'none'} type 
   */
  startWhiteNoise(type) {
    this.stopWhiteNoise();
    if (!type || type === 'none') {
      this.currentNoiseType = null;
      return;
    }

    this.init();
    this.currentNoiseType = type;

    // Buffer length: 5 seconds looped
    const bufferSize = this.ctx.sampleRate * 5;
    const noiseBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    const leftChannel = noiseBuffer.getChannelData(0);
    const rightChannel = noiseBuffer.getChannelData(1);

    if (type === 'rain') {
      // Pink / Brown filtered noise with random rain drop peaks
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        // occasional raindrop droplet click
        const droplet = (Math.random() < 0.0003) ? (Math.random() * 0.4 - 0.2) : 0;
        leftChannel[i] = pink + droplet;
        rightChannel[i] = pink * 0.9 + (Math.random() * 2 - 1) * 0.02 + droplet;
      }
    } else if (type === 'fire') {
      // Crackle & warm low rumble
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02; // Brown rumble
        const crackle = (Math.random() < 0.001) ? (Math.random() * 0.8 - 0.4) : 0;
        leftChannel[i] = lastOut * 3.5 + crackle;
        rightChannel[i] = lastOut * 3.5 + (Math.random() < 0.001 ? (Math.random() * 0.8 - 0.4) : 0);
      }
    } else if (type === 'waves') {
      // Ocean wave surge (modulated pink noise)
      for (let i = 0; i < bufferSize; i++) {
        const t = i / this.ctx.sampleRate;
        const surge = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.12 * t);
        const white = (Math.random() * 2 - 1) * 0.3;
        leftChannel[i] = white * surge;
        rightChannel[i] = white * surge;
      }
    } else if (type === 'cafe') {
      // Mellow filtered murmur
      let b0 = 0, b1 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.98 * b0 + white * 0.02;
        b1 = 0.95 * b1 + white * 0.03;
        leftChannel[i] = b0 * 2.2;
        rightChannel[i] = b1 * 2.2;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    // Filter node for smooth warmth
    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'rain' ? 'lowpass' : (type === 'fire' ? 'bandpass' : 'lowpass');
    filter.frequency.value = type === 'rain' ? 1200 : (type === 'fire' ? 800 : 900);

    const gainNode = this.ctx.createGain();
    const targetGain = this.isMuted ? 0 : this.volume * 0.35;
    gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, targetGain), this.ctx.currentTime + 1.2);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(0);

    this.noiseNode = source;
    this.noiseGain = gainNode;
  }

  stopWhiteNoise() {
    if (this.noiseGain && this.noiseNode) {
      try {
        const now = this.ctx.currentTime;
        this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
        this.noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        const oldNode = this.noiseNode;
        setTimeout(() => {
          try {
            oldNode.stop();
            oldNode.disconnect();
          } catch (e) {}
        }, 850);
      } catch (e) {}
      this.noiseNode = null;
      this.noiseGain = null;
    }
  }
}

window.audioEngine = new AudioEngine();
