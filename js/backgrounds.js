/**
 * Visual Themes & Atmospheric Canvas Engine
 * Provides dynamic high-aesthetic full-width backgrounds, ambient lighting,
 * and particle systems (Rain, Star dust, Floating motes, Ember glow).
 */

class BackgroundEngine {
  constructor() {
    this.currentTheme = 'lofi-room';
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationFrameId = null;
    this.particlesEnabled = true;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.themes = {
      'lofi-room': {
        name: '温暖自习室 (Lofi Room)',
        type: 'motes',
        bgClass: 'theme-lofi-room',
        accent: '#f39c12'
      },
      'rainy-cafe': {
        name: '雨夜咖啡馆 (Rainy Cafe)',
        type: 'rain',
        bgClass: 'theme-rainy-cafe',
        accent: '#3498db'
      },
      'tokyo-dusk': {
        name: '霓虹晚霞 (Cyber Dusk)',
        type: 'neon-motes',
        bgClass: 'theme-tokyo-dusk',
        accent: '#9b59b6'
      },
      'zen-garden': {
        name: '竹林清风 (Zen Garden)',
        type: 'leaves',
        bgClass: 'theme-zen-garden',
        accent: '#2ecc71'
      },
      'deep-space': {
        name: '静谧星河 (Deep Space)',
        type: 'stars',
        bgClass: 'theme-deep-space',
        accent: '#00d2d3'
      },
      'minimal-slate': {
        name: '极简暗色 (Minimal Slate)',
        type: 'none',
        bgClass: 'theme-minimal-slate',
        accent: '#e74c3c'
      }
    };

    this.loadSavedTheme();
  }

  loadSavedTheme() {
    const saved = localStorage.getItem('pomodoro_theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    }
    const savedParticles = localStorage.getItem('pomodoro_particles');
    if (savedParticles !== null) {
      this.particlesEnabled = savedParticles === 'true';
    }
  }

  init(canvasId = 'ambient-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopAnimation();
      } else {
        this.startAnimation();
      }
    });

    this.applyTheme(this.currentTheme);
    this.startAnimation();
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.initParticles();
  }

  applyTheme(themeKey) {
    if (!this.themes[themeKey]) themeKey = 'lofi-room';
    this.currentTheme = themeKey;
    localStorage.setItem('pomodoro_theme', themeKey);

    // Update body theme classes
    Object.keys(this.themes).forEach((t) => {
      document.body.classList.remove(this.themes[t].bgClass);
    });
    document.body.classList.add(this.themes[themeKey].bgClass);

    // Sync theme dropdown if present
    const dropdown = document.getElementById('theme-dropdown-select');
    if (dropdown && dropdown.value !== themeKey) {
      dropdown.value = themeKey;
    }

    this.initParticles();

    // Trigger visual updates in other UI elements if needed
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeKey, info: this.themes[themeKey] } }));
  }

  toggleParticles() {
    this.particlesEnabled = !this.particlesEnabled;
    localStorage.setItem('pomodoro_particles', this.particlesEnabled.toString());
    if (this.particlesEnabled) {
      this.initParticles();
      this.startAnimation();
    } else {
      this.stopAnimation();
      if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
    }
    return this.particlesEnabled;
  }

  initParticles() {
    this.particles = [];
    if (!this.particlesEnabled) return;

    const themeType = this.themes[this.currentTheme]?.type || 'motes';

    if (themeType === 'rain') {
      const count = Math.floor(this.width * 0.08); // Responsive count
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          length: Math.random() * 25 + 15,
          speed: Math.random() * 12 + 18,
          opacity: Math.random() * 0.4 + 0.15,
          thickness: Math.random() * 1.5 + 0.8
        });
      }
    } else if (themeType === 'stars') {
      const count = Math.floor(this.width * 0.12);
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: Math.random() * 2.2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          angle: Math.random() * Math.PI * 2
        });
      }
    } else if (themeType === 'leaves') {
      const count = Math.floor(this.width * 0.035);
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: Math.random() * 6 + 4,
          speedY: Math.random() * 1.2 + 0.8,
          speedX: Math.random() * 1.0 - 0.3,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: Math.random() * 0.02 - 0.01,
          opacity: Math.random() * 0.4 + 0.2
        });
      }
    } else if (themeType === 'motes' || themeType === 'neon-motes') {
      const count = Math.floor(this.width * 0.04);
      const isNeon = themeType === 'neon-motes';
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 2.8 + 1.2,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.5 - 0.2,
          opacity: Math.random() * 0.5 + 0.2,
          hue: isNeon ? (Math.random() > 0.5 ? 280 : 190) : 40
        });
      }
    }
  }

  startAnimation() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (!this.particlesEnabled) return;

    const render = () => {
      this.draw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  draw() {
    if (!this.ctx || !this.particlesEnabled) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const themeType = this.themes[this.currentTheme]?.type || 'motes';

    if (themeType === 'rain') {
      this.ctx.strokeStyle = 'rgba(210, 235, 255, 0.45)';
      this.ctx.lineCap = 'round';

      for (let p of this.particles) {
        this.ctx.lineWidth = p.thickness;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x + 2, p.y + p.length);
        this.ctx.stroke();

        p.y += p.speed;
        p.x += 1.2;
        if (p.y > this.height) {
          p.y = -p.length;
          p.x = Math.random() * this.width;
        }
      }
    } else if (themeType === 'stars') {
      for (let p of this.particles) {
        p.angle += p.twinkleSpeed;
        const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.angle));
        this.ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else if (themeType === 'leaves') {
      this.ctx.fillStyle = 'rgba(168, 230, 207, 0.35)';
      for (let p of this.particles) {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        p.y += p.speedY;
        p.x += Math.sin(p.y * 0.01) * 0.8 + p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y > this.height + 20) {
          p.y = -20;
          p.x = Math.random() * this.width;
        }
      }
    } else if (themeType === 'motes' || themeType === 'neon-motes') {
      for (let p of this.particles) {
        this.ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.opacity})`;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = `hsla(${p.hue}, 80%, 65%, 0.5)`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = this.height + 10;
          p.x = Math.random() * this.width;
        }
        if (p.x < -10) p.x = this.width + 10;
        if (p.x > this.width + 10) p.x = -10;
      }
      this.ctx.shadowBlur = 0;
    }
  }
}

window.backgroundEngine = new BackgroundEngine();
