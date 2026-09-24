/**
 * Bilibili Lofi Girl & Study Stream Companion Controller
 * Supports both In-App Embedded Player and Auto-Closing Companion Popup Window.
 * Automatically synchronizes with Pomodoro focus/break cycles:
 * - Plays during Focus sessions
 * - Automatically stops/closes on Break or when session ends
 */

class BilibiliController {
  constructor() {
    this.enabled = true; // Auto play on focus
    this.mode = 'popup'; // 'popup' | 'embedded' | 'tab'
    this.currentPreset = 'bili_lofigirl_live';
    this.customInput = '';
    this.popupWindow = null;
    this.isPlaying = false;
    this.iframeContainer = null;
    this.statusEl = null;
    this.phoneMediaQuery = window.matchMedia(
      '(max-width: 640px), (hover: none) and (pointer: coarse) and (max-width: 900px)'
    );
    this.companionMinWidth = 1100;
    this.companionMediaQuery = window.matchMedia(`(max-width: ${this.companionMinWidth}px)`);

    // Default presets
    this.presets = {
      bili_lofigirl_live: {
        name: 'Bilibili Lofi Girl Live (27519423)',
        type: 'live',
        cid: '27519423',
        title: 'Bilibili Lofi Girl Live (27519423)',
        url: 'https://live.bilibili.com/27519423'
      },
      youtube_lofi: {
        name: 'Lofi Girl Official 24/7 (YouTube)',
        type: 'youtube',
        channelId: 'UC5qLj-aXg6F9yM9B8p5Wv6A',
        title: 'Lofi Girl Official 24/7 (YouTube)',
        url: 'https://www.youtube.com/@LofiGirl/live',
        embedUrl: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC5qLj-aXg6F9yM9B8p5Wv6A&autoplay=1'
      },
      bili_live: {
        name: 'Bilibili 24/7 Study Room (21452505)',
        type: 'live',
        cid: '21452505',
        title: 'Bilibili 24/7 Study Room',
        url: 'https://live.bilibili.com/21452505'
      },
      bili_lofi_girl: {
        name: 'Bilibili Lofi Girl Classic Mix (video)',
        type: 'video',
        bvid: 'BV184411C75d',
        title: 'Bilibili Lofi Girl Study Music',
        url: 'https://www.bilibili.com/video/BV184411C75d'
      },
      bili_cafe: {
        name: 'Bilibili Rainy Window Jazz Cafe (video)',
        type: 'video',
        bvid: 'BV1vQ4y1Z7mU',
        title: 'Bilibili Rainy Window Cafe',
        url: 'https://www.bilibili.com/video/BV1vQ4y1Z7mU'
      }
    };

    this.loadSettings();
  }

  init(containerId = 'bili-player-wrapper', statusId = 'bili-status-indicator') {
    this.iframeContainer = document.getElementById(containerId);
    this.statusEl = document.getElementById(statusId);

    const stopWhenUnavailable = () => {
      if (!this.isCompanionAvailable() && this.isPlaying) {
        this.stop();
      }
    };
    if (this.companionMediaQuery?.addEventListener) {
      this.companionMediaQuery.addEventListener('change', stopWhenUnavailable);
    } else {
      this.companionMediaQuery?.addListener(stopWhenUnavailable);
    }

    this.updateStatusUI();
  }

  loadSettings() {
    const saved = localStorage.getItem('pomodoro_bili_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.enabled !== undefined) this.enabled = config.enabled;
        if (config.mode) this.mode = config.mode;
        if (config.currentPreset && this.presets[config.currentPreset] && config.currentPreset !== 'bili_live') {
          this.currentPreset = config.currentPreset;
        } else {
          this.currentPreset = 'bili_lofigirl_live';
        }
        if (config.customInput) this.customInput = config.customInput;
      } catch (e) {
        console.error('Failed to load bilibili settings', e);
      }
    }
  }

  saveSettings() {
    localStorage.setItem(
      'pomodoro_bili_config',
      JSON.stringify({
        enabled: this.enabled,
        mode: this.mode,
        currentPreset: this.currentPreset,
        customInput: this.customInput
      })
    );
  }

  /**
   * Resolve current target embed URL & external URL
   */
  getTargetInfo() {
    if (this.currentPreset === 'custom' && this.customInput.trim()) {
      const input = this.customInput.trim();
      // Check if it's a pure number -> Bilibili Live room ID
      if (/^\d+$/.test(input)) {
        return {
          title: `Bilibili live #${input}`,
          embedUrl: `https://www.bilibili.com/blackboard/live/live-activity-player.html?cid=${input}&quality=0&logo=0&danmaku=0`,
          externalUrl: `https://live.bilibili.com/${input}`
        };
      }
      // Check if it's a BV number
      if (/^BV[a-zA-Z0-9]+$/i.test(input)) {
        return {
          title: `Bilibili video ${input}`,
          embedUrl: `https://player.bilibili.com/player.html?bvid=${input}&page=1&as_wide=1&high_quality=1&danmaku=0&autoplay=1`,
          externalUrl: `https://www.bilibili.com/video/${input}`
        };
      }
      // Check if it's a live.bilibili.com URL
      const liveMatch = input.match(/live\.bilibili\.com\/(\d+)/);
      if (liveMatch) {
        return {
          title: `Bilibili live #${liveMatch[1]}`,
          embedUrl: `https://www.bilibili.com/blackboard/live/live-activity-player.html?cid=${liveMatch[1]}&quality=0&logo=0&danmaku=0`,
          externalUrl: input
        };
      }
      // Check if it's a bilibili video URL
      const bvMatch = input.match(/(BV[a-zA-Z0-9]+)/i);
      if (bvMatch) {
        return {
          title: `Bilibili video ${bvMatch[1]}`,
          embedUrl: `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&page=1&as_wide=1&high_quality=1&danmaku=0&autoplay=1`,
          externalUrl: input
        };
      }
      // Direct iframe fallback
      return {
        title: 'Custom stream URL',
        embedUrl: input,
        externalUrl: input
      };
    }

    const preset = this.presets[this.currentPreset] || this.presets.bili_live;
    if (preset.type === 'live') {
      return {
        title: preset.title,
        embedUrl: `https://www.bilibili.com/blackboard/live/live-activity-player.html?cid=${preset.cid}&quality=0&logo=0&danmaku=0`,
        externalUrl: preset.url
      };
    } else if (preset.type === 'video') {
      return {
        title: preset.title,
        embedUrl: `https://player.bilibili.com/player.html?bvid=${preset.bvid}&page=1&as_wide=1&high_quality=1&danmaku=0&autoplay=1`,
        externalUrl: preset.url
      };
    } else if (preset.type === 'youtube') {
      return {
        title: preset.title,
        embedUrl: preset.embedUrl || 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC5qLj-aXg6F9yM9B8p5Wv6A&autoplay=1',
        externalUrl: preset.url || 'https://www.youtube.com/@LofiGirl/live'
      };
    }
  }

  /**
   * Detect phone layout, including landscape phones with a wide CSS viewport.
   */
  isPhoneDevice() {
    return this.phoneMediaQuery?.matches ?? (window.innerWidth <= 640);
  }

  isMobileDevice() {
    return this.isPhoneDevice();
  }

  isCompanionAvailable() {
    return !this.isPhoneDevice() && !this.companionMediaQuery?.matches;
  }

  /**
   * Called when Focus session starts
   */
  startOnFocus() {
    // The stream is desktop-only and requires enough room for the companion deck.
    if (!this.isCompanionAvailable()) {
      return;
    }
    if (!this.enabled) return;
    this.play();
  }

  /**
   * Called when session is paused
   */
  pause() {
    this.stop();
  }

  /**
   * Called when Focus completes or Break begins
   */
  stopOnBreak() {
    this.stop();
  }

  /**
   * Directly open the live room in companion window or new tab
   * @param {string|null} presetKey 
   * @param {boolean} asTab 
   */
  openDirectly(presetKey = null, asTab = false) {
    if (!this.isCompanionAvailable()) {
      this.stop();
      return false;
    }

    if (presetKey && this.presets[presetKey]) {
      this.currentPreset = presetKey;
      this.saveSettings();
    }
    const target = this.getTargetInfo();
    const url = target.externalUrl;

    if (asTab) {
      window.open(url, '_blank');
    } else {
      const left = Math.max(0, window.screen.width - 700);
      const top = Math.max(0, window.screen.height - 520);
      if (this.popupWindow && !this.popupWindow.closed) {
        this.popupWindow.location.href = url;
        this.popupWindow.focus();
      } else {
        this.popupWindow = window.open(
          url,
          'TomatoLofiCompanion',
          `width=680,height=480,left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`
        );
      }
    }
    this.isPlaying = true;
    this.updateStatusUI();
    return true;
  }

  /**
   * Play stream
   */
  play() {
    if (!this.isCompanionAvailable()) {
      this.stop();
      return false;
    }

    const target = this.getTargetInfo();
    this.isPlaying = true;

    if (this.mode === 'popup') {
      // Companion popup window mode (auto closes on break)
      this.openDirectly(null, false);
    } else if (this.mode === 'tab') {
      // New tab mode
      this.openDirectly(null, true);
    } else {
      // In-app embedded iframe mode
      if (this.iframeContainer) {
        this.iframeContainer.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = target.embedUrl;
        iframe.setAttribute('frameborder', 'no');
        iframe.setAttribute('framespacing', '0');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.className = 'w-full h-full rounded-2xl border-0 shadow-inner';
        this.iframeContainer.appendChild(iframe);
      }
    }

    this.updateStatusUI();
    return true;
  }

  stopOnBreak() {
    this.stop(true);
  }

  /**
   * Stop stream immediately (unmount iframe and close popup window)
   * @param {boolean} isBreak
   */
  stop(isBreak = false) {
    this.isPlaying = false;

    // Unmount iframe to immediately cut off audio
    if (this.iframeContainer) {
      const iframes = this.iframeContainer.querySelectorAll('iframe');
      iframes.forEach((f) => {
        try {
          f.src = 'about:blank';
        } catch (e) {}
      });

      const badgeText = isBreak ? '☕ Break: stream fully muted' : 'Ambience standby';
      const badgeDesc = isBreak
        ? 'Stream & ambience stopped — auto-resumes when focus starts'
        : 'Auto-plays when focus starts, auto-closes on breaks';

      this.iframeContainer.innerHTML = `
        <div class="player-placeholder flex flex-col items-center justify-center h-full text-center p-6 text-white/50">
          <div class="w-14 h-14 rounded-full ${isBreak ? 'bg-emerald-500/15' : 'bg-white/5'} flex items-center justify-center mb-3">
            <svg class="w-7 h-7 ${isBreak ? 'text-emerald-400' : 'text-white/40'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </div>
          <p class="text-sm font-semibold ${isBreak ? 'text-emerald-300' : 'text-white/70'}">${badgeText}</p>
          <p class="text-xs text-white/40 mt-1">${badgeDesc}</p>
        </div>
      `;
    }

    // Auto-close companion popup window
    if (this.popupWindow && !this.popupWindow.closed) {
      try {
        this.popupWindow.close();
      } catch (e) {
        console.warn('Could not auto-close companion window', e);
      }
      this.popupWindow = null;
    }

    this.updateStatusUI(isBreak);
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  updateStatusUI(isBreak = false) {
    if (!this.statusEl) return;
    const target = this.getTargetInfo();

    if (isBreak) {
      this.statusEl.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          ☕ On break: auto-muted
        </span>
      `;
      return;
    }

    if (this.isPlaying) {
      this.statusEl.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          Now playing: ${target.title}
        </span>
      `;
    } else if (this.enabled) {
      this.statusEl.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/10">
          <span class="w-2 h-2 rounded-full bg-white/40"></span>
          Ready (auto-plays on focus)
        </span>
      `;
    } else {
      this.statusEl.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/40 border border-white/5">
          <span class="w-2 h-2 rounded-full bg-white/20"></span>
          Ambience muted
        </span>
      `;
    }
  }
}

window.bilibiliController = new BilibiliController();
