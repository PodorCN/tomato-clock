/**
 * Audio Engine - Web Audio API synthesizer for the end-of-session chimes.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
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
  }

  setMute(muted) {
    this.isMuted = muted;
  }

  /**
   * Play completion bell / chime using harmonic synthesis
   * @param {'focus-done' | 'break-done'} type 
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
    }
  }
}

window.audioEngine = new AudioEngine();
