/**
 * Pomodoro Clock Core Controller
 * Handles timer logic, mode transitions, session tracking,
 * audio/bilibili synchronization, keyboard shortcuts, and UI binding.
 */

class PomodoroApp {
  constructor() {
    // Timer state
    this.mode = 'focus'; // 'focus' | 'short-break' | 'long-break'
    this.status = 'idle'; // 'idle' | 'running' | 'paused'
    this.timeLeft = 25 * 60; // in seconds
    this.totalDuration = 25 * 60;
    this.intervalId = null;
    this.endTime = null;

    // Cycle & Stats
    this.completedPomodoros = 0;
    this.focusMinutesToday = 0;
    this.longBreakInterval = 4;

    // Configuration
    this.config = {
      focusTime: 25,
      shortBreakTime: 5,
      longBreakTime: 15,
      autoStartBreak: false,
      autoStartFocus: false,
      soundVolume: 0.5,
      ambientNoise: 'none', // 'none' | 'rain' | 'fire' | 'cafe' | 'waves'
      desktopNotification: true,
      zenMode: false
    };

    // Tasks list
    this.tasks = [];

    // DOM Elements Cache
    this.dom = {};
  }

  init() {
    this.cacheDom();
    this.loadSavedData();
    this.bindEvents();
    this.initControllers();
    this.switchMode(this.mode, false);
    this.updateStatsUI();
    this.renderTasks();

    // Ask for notification permission if needed
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission();
      }, 3000);
    }
  }

  cacheDom() {
    this.dom = {
      timerDisplay: document.getElementById('timer-time'),
      timerTimeInput: document.getElementById('timer-time-input'),
      timerTimeHint: document.getElementById('timer-time-hint'),
      customTimeForm: document.getElementById('custom-time-form'),
      inputQuickCustomMin: document.getElementById('input-quick-custom-min'),
      timerStateBadge: document.getElementById('timer-state-badge'),
      timerRing: document.getElementById('timer-ring-progress'),
      
      // Hi-Fi Turntable & Deck components
      vinylDisc: document.getElementById('vinyl-disc'),
      tonearmAssembly: document.getElementById('tonearm-assembly'),
      spectrumBars: document.getElementById('spectrum-bars'),
      turntableRpmText: document.getElementById('turntable-rpm-text'),
      laserTrackProgress: document.getElementById('laser-track-progress'),
      grooveMarkerMid: document.getElementById('groove-marker-mid'),
      grooveMarkerEnd: document.getElementById('groove-marker-end'),
      zenBreakSanctuary: document.getElementById('zen-break-sanctuary'),
      giantClockInner: document.getElementById('giant-clock-inner'),
      giantClockStage: document.getElementById('giant-clock-stage'),
      btnViewTurntable: document.getElementById('btn-view-turntable'),
      btnViewVideo: document.getElementById('btn-view-video'),
      turntableDeckView: document.getElementById('turntable-deck-view'),
      biliPlayerWrapper: document.getElementById('bili-player-wrapper'),
      studioLampDot: document.getElementById('studio-lamp-dot'),

      btnStartPause: document.getElementById('btn-start-pause'),
      startPauseIcon: document.getElementById('start-pause-icon'),
      startPauseText: document.getElementById('start-pause-text'),
      btnSkip: document.getElementById('btn-skip'),
      btnReset: document.getElementById('btn-reset'),
      btnZen: document.getElementById('btn-zen-mode'),
      btnFullscreen: document.getElementById('btn-fullscreen'),
      btnThemeSelect: document.getElementById('btn-theme-selector'),
      btnSettings: document.getElementById('btn-settings'),
      modalSettings: document.getElementById('modal-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      sidePanel: document.getElementById('companion-panel'),
      btnTogglePanel: document.getElementById('btn-toggle-panel'),
      containerMain: document.getElementById('main-container'),
      
      // Mode tabs
      modeTabs: document.querySelectorAll('.mode-tab-btn'),
      quickPresets: document.querySelectorAll('.preset-badge'),

      // Audio controls
      ambientSelect: document.getElementById('ambient-sound-select'),
      volumeSlider: document.getElementById('volume-slider'),
      btnMute: document.getElementById('btn-mute'),
      muteIcon: document.getElementById('mute-icon'),

      // Bilibili settings
      biliToggle: document.getElementById('bili-toggle-enable'),
      biliModeSelect: document.getElementById('bili-mode-select'),
      biliPresetSelect: document.getElementById('bili-preset-select'),
      biliCustomGroup: document.getElementById('bili-custom-group'),
      biliCustomInput: document.getElementById('bili-custom-input'),
      biliManualToggle: document.getElementById('btn-bili-manual-toggle'),
      btnOpenDirect: document.getElementById('btn-open-lofigirl-direct'),
      directOpenText: document.getElementById('direct-open-btn-text'),
      channelPills: document.querySelectorAll('.bili-channel-pill'),

      // Stats
      statPomoCount: document.getElementById('stat-pomodoro-count'),
      statMinutes: document.getElementById('stat-focus-minutes'),
      tomatoTally: document.getElementById('tomato-tally-container'),

      // Task & Intention
      currentTaskInput: document.getElementById('current-intention-input'),
      taskForm: document.getElementById('task-add-form'),
      taskInput: document.getElementById('task-new-input'),
      taskList: document.getElementById('task-items-list')
    };
  }

  loadSavedData() {
    // Config
    const savedConfig = localStorage.getItem('pomodoro_app_config');
    if (savedConfig) {
      try {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      } catch (e) {}
    }

    // Stats
    const today = new Date().toISOString().slice(0, 10);
    const savedStats = localStorage.getItem(`pomodoro_stats_${today}`);
    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        this.completedPomodoros = stats.completedPomodoros || 0;
        this.focusMinutesToday = stats.focusMinutesToday || 0;
      } catch (e) {}
    }

    // Tasks
    const savedTasks = localStorage.getItem('pomodoro_tasks');
    if (savedTasks) {
      try {
        this.tasks = JSON.parse(savedTasks);
      } catch (e) {}
    }

    // Intention
    const savedIntention = localStorage.getItem('pomodoro_intention');
    if (savedIntention && this.dom.currentTaskInput) {
      this.dom.currentTaskInput.value = savedIntention;
    }
  }

  saveData() {
    localStorage.setItem('pomodoro_app_config', JSON.stringify(this.config));

    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      `pomodoro_stats_${today}`,
      JSON.stringify({
        completedPomodoros: this.completedPomodoros,
        focusMinutesToday: this.focusMinutesToday
      })
    );

    localStorage.setItem('pomodoro_tasks', JSON.stringify(this.tasks));
  }

  initControllers() {
    if (window.backgroundEngine) {
      window.backgroundEngine.init('ambient-canvas');
    }
    if (window.bilibiliController) {
      window.bilibiliController.init('bili-player-wrapper', 'bili-status-indicator');
    }
    if (window.audioEngine) {
      window.audioEngine.setVolume(this.config.soundVolume);
    }
    this.syncSettingsUI();
  }

  syncSettingsUI() {
    // Sync settings form elements with loaded config
    const getEl = (id) => document.getElementById(id);
    if (getEl('input-focus-time')) getEl('input-focus-time').value = this.config.focusTime;
    if (getEl('input-short-break')) getEl('input-short-break').value = this.config.shortBreakTime;
    if (getEl('input-long-break')) getEl('input-long-break').value = this.config.longBreakTime;
    if (getEl('check-auto-break')) getEl('check-auto-break').checked = this.config.autoStartBreak;
    if (getEl('check-auto-focus')) getEl('check-auto-focus').checked = this.config.autoStartFocus;
    if (this.dom.inputQuickCustomMin) {
      this.dom.inputQuickCustomMin.value = this.config.focusTime;
    }

    if (this.dom.modeTabs) {
      this.dom.modeTabs.forEach((tab) => {
        const mode = tab.dataset.mode;
        if (mode === 'focus') {
          tab.innerHTML = `<span>🍅</span> 专注 (${this.config.focusTime}m)`;
        } else if (mode === 'short-break') {
          tab.innerHTML = `<span>☕</span> 短休 (${this.config.shortBreakTime}m)`;
        } else if (mode === 'long-break') {
          tab.innerHTML = `<span>🌴</span> 长休 (${this.config.longBreakTime}m)`;
        }
      });
    }

    if (this.dom.volumeSlider) this.dom.volumeSlider.value = this.config.soundVolume * 100;
    if (this.dom.ambientSelect) this.dom.ambientSelect.value = this.config.ambientNoise;

    if (window.bilibiliController) {
      if (this.dom.biliToggle) this.dom.biliToggle.checked = window.bilibiliController.enabled;
      if (this.dom.biliModeSelect) this.dom.biliModeSelect.value = window.bilibiliController.mode;
      if (this.dom.biliPresetSelect) this.dom.biliPresetSelect.value = window.bilibiliController.currentPreset;
      if (this.dom.biliCustomInput) this.dom.biliCustomInput.value = window.bilibiliController.customInput;

      if (this.dom.biliCustomGroup) {
        this.dom.biliCustomGroup.style.display =
          window.bilibiliController.currentPreset === 'custom' ? 'block' : 'none';
      }

      if (this.dom.channelPills) {
        this.dom.channelPills.forEach((p) => {
          p.classList.toggle('active', p.dataset.preset === window.bilibiliController.currentPreset);
        });
      }

      const target = window.bilibiliController.getTargetInfo();
      if (this.dom.directOpenText && target) {
        this.dom.directOpenText.textContent = `🚀 直接打开 ${target.title}`;
      }
    }
  }

  setCustomFocusDuration(rawMin) {
    const mins = Math.max(1, Math.min(180, parseInt(rawMin, 10) || 25));
    this.config.focusTime = mins;
    this.saveData();
    this.syncSettingsUI();
    this.switchMode('focus', true);
    window.audioEngine?.playNotification('click');
  }

  bindEvents() {
    // Start / Pause
    this.dom.btnStartPause.addEventListener('click', () => this.toggleStartPause());

    // Skip & Reset
    this.dom.btnSkip.addEventListener('click', () => this.skipSession());
    this.dom.btnReset.addEventListener('click', () => this.resetSession());

    // Mode tabs
    this.dom.modeTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const targetMode = e.currentTarget.dataset.mode;
        this.switchMode(targetMode, true);
      });
    });

    // Quick presets (25/5, 50/10, etc.)
    this.dom.quickPresets.forEach((badge) => {
      badge.addEventListener('click', (e) => {
        const focusMin = parseInt(e.currentTarget.dataset.focus, 10);
        const breakMin = parseInt(e.currentTarget.dataset.break, 10);
        this.config.focusTime = focusMin;
        this.config.shortBreakTime = breakMin;
        this.saveData();
        this.syncSettingsUI();
        this.switchMode('focus', true);
        window.audioEngine?.playNotification('click');
      });
    });

    // Custom time form submission
    if (this.dom.customTimeForm) {
      this.dom.customTimeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const mins = parseInt(this.dom.inputQuickCustomMin?.value, 10);
        if (!isNaN(mins) && mins > 0) {
          this.setCustomFocusDuration(mins);
        }
      });
    }

    // Direct click-to-edit on main clock display
    if (this.dom.timerDisplay && this.dom.timerTimeInput) {
      this.dom.timerDisplay.addEventListener('click', () => {
        if (this.status === 'running') {
          this.pauseTimer();
        }
        const currentMins = Math.max(1, Math.round(this.timeLeft / 60));
        this.dom.timerTimeInput.value = currentMins;
        this.dom.timerDisplay.style.display = 'none';
        if (this.dom.timerTimeHint) this.dom.timerTimeHint.style.display = 'none';
        this.dom.timerTimeInput.style.display = 'block';
        this.dom.timerTimeInput.focus();
        this.dom.timerTimeInput.select();
      });

      const finishTimeEdit = (commit = true) => {
        if (this.dom.timerTimeInput.style.display === 'none') return;
        if (commit) {
          const val = parseInt(this.dom.timerTimeInput.value, 10);
          if (!isNaN(val) && val > 0) {
            this.setCustomFocusDuration(val);
          }
        }
        this.dom.timerTimeInput.style.display = 'none';
        this.dom.timerDisplay.style.display = '';
        if (this.dom.timerTimeHint) this.dom.timerTimeHint.style.display = '';
      };

      this.dom.timerTimeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishTimeEdit(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finishTimeEdit(false);
        }
      });

      this.dom.timerTimeInput.addEventListener('blur', () => {
        finishTimeEdit(true);
      });
    }

    // Turntable vs Video Deck View Switcher
    if (this.dom.btnViewTurntable && this.dom.btnViewVideo) {
      this.dom.btnViewTurntable.addEventListener('click', () => {
        this.dom.btnViewTurntable.classList.add('active');
        this.dom.btnViewVideo.classList.remove('active');
        if (this.dom.turntableDeckView) this.dom.turntableDeckView.style.display = 'flex';
        if (this.dom.biliPlayerWrapper) this.dom.biliPlayerWrapper.style.display = 'none';
      });

      this.dom.btnViewVideo.addEventListener('click', () => {
        this.dom.btnViewVideo.classList.add('active');
        this.dom.btnViewTurntable.classList.remove('active');
        if (this.dom.turntableDeckView) this.dom.turntableDeckView.style.display = 'none';
        if (this.dom.biliPlayerWrapper) this.dom.biliPlayerWrapper.style.display = 'block';
      });
    }

    // Volume & Ambient
    if (this.dom.volumeSlider) {
      this.dom.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        this.config.soundVolume = val;
        window.audioEngine?.setVolume(val);
        this.saveData();
      });
    }

    if (this.dom.ambientSelect) {
      this.dom.ambientSelect.addEventListener('change', (e) => {
        this.config.ambientNoise = e.target.value;
        this.saveData();
        if (this.status === 'running' && this.mode === 'focus') {
          window.audioEngine?.startWhiteNoise(this.config.ambientNoise);
        } else {
          window.audioEngine?.stopWhiteNoise();
        }
      });
    }

    if (this.dom.btnMute) {
      this.dom.btnMute.addEventListener('click', () => {
        const isMuted = !window.audioEngine?.isMuted;
        window.audioEngine?.setMute(isMuted);
        this.updateMuteUI(isMuted);
      });
    }

    // Bilibili controls
    if (this.dom.biliToggle) {
      this.dom.biliToggle.addEventListener('change', (e) => {
        window.bilibiliController.enabled = e.target.checked;
        window.bilibiliController.saveSettings();
        window.bilibiliController.updateStatusUI();
      });
    }

    if (this.dom.biliModeSelect) {
      this.dom.biliModeSelect.addEventListener('change', (e) => {
        window.bilibiliController.mode = e.target.value;
        window.bilibiliController.saveSettings();
      });
    }

    if (this.dom.biliPresetSelect) {
      this.dom.biliPresetSelect.addEventListener('change', (e) => {
        window.bilibiliController.currentPreset = e.target.value;
        if (this.dom.biliCustomGroup) {
          this.dom.biliCustomGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
        window.bilibiliController.saveSettings();
        window.bilibiliController.updateStatusUI();
      });
    }

    if (this.dom.biliCustomInput) {
      this.dom.biliCustomInput.addEventListener('input', (e) => {
        window.bilibiliController.customInput = e.target.value;
        window.bilibiliController.saveSettings();
        window.bilibiliController.updateStatusUI();
      });
    }

    if (this.dom.biliManualToggle) {
      this.dom.biliManualToggle.addEventListener('click', () => {
        window.bilibiliController.toggle();
      });
    }

    if (this.dom.btnOpenDirect) {
      this.dom.btnOpenDirect.addEventListener('click', () => {
        window.bilibiliController?.openDirectly(null, window.bilibiliController?.mode === 'tab');
      });
    }

    if (this.dom.channelPills) {
      this.dom.channelPills.forEach((pill) => {
        pill.addEventListener('click', (e) => {
          const preset = e.currentTarget.dataset.preset;
          this.dom.channelPills.forEach((p) => p.classList.remove('active'));
          e.currentTarget.classList.add('active');

          if (window.bilibiliController) {
            window.bilibiliController.currentPreset = preset;
            window.bilibiliController.saveSettings();
            window.bilibiliController.updateStatusUI();

            const target = window.bilibiliController.getTargetInfo();
            if (this.dom.directOpenText) {
              this.dom.directOpenText.textContent = `🚀 直接打开 ${target.title}`;
            }

            if (this.dom.biliPresetSelect) {
              this.dom.biliPresetSelect.value = preset;
            }

            if (this.status === 'running' && this.mode === 'focus') {
              window.bilibiliController.play();
            }
          }
        });
      });
    }

    // Zen Mode & Fullscreen
    if (this.dom.btnZen) {
      this.dom.btnZen.addEventListener('click', () => this.toggleZenMode());
    }

    if (this.dom.btnFullscreen) {
      this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    // Toggle Companion Panel
    if (this.dom.btnTogglePanel) {
      this.dom.btnTogglePanel.addEventListener('click', () => {
        this.dom.sidePanel.classList.toggle('hidden-panel');
      });
    }

    // Settings Modal
    if (this.dom.btnSettings) {
      this.dom.btnSettings.addEventListener('click', () => {
        this.dom.modalSettings.classList.remove('hidden');
      });
    }
    if (this.dom.btnCloseSettings) {
      this.dom.btnCloseSettings.addEventListener('click', () => {
        this.saveSettingsFromModal();
        this.dom.modalSettings.classList.add('hidden');
      });
    }
    if (this.dom.modalSettings) {
      this.dom.modalSettings.addEventListener('click', (e) => {
        if (e.target === this.dom.modalSettings) {
          this.saveSettingsFromModal();
          this.dom.modalSettings.classList.add('hidden');
        }
      });
    }

    // Current Intention
    if (this.dom.currentTaskInput) {
      this.dom.currentTaskInput.addEventListener('input', (e) => {
        localStorage.setItem('pomodoro_intention', e.target.value);
      });
    }

    // Todo List Form
    if (this.dom.taskForm) {
      this.dom.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.dom.taskInput.value.trim();
        if (text) {
          this.tasks.push({
            id: Date.now(),
            text,
            done: false
          });
          this.dom.taskInput.value = '';
          this.saveData();
          this.renderTasks();
        }
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleStartPause();
      } else if (e.code === 'KeyS' && !e.ctrlKey) {
        this.skipSession();
      } else if (e.code === 'KeyR' && !e.ctrlKey) {
        this.resetSession();
      } else if (e.code === 'KeyF' && !e.ctrlKey) {
        this.toggleFullscreen();
      } else if (e.code === 'KeyZ' && !e.ctrlKey) {
        this.toggleZenMode();
      } else if (e.code === 'KeyM' && !e.ctrlKey) {
        const isMuted = !window.audioEngine?.isMuted;
        window.audioEngine?.setMute(isMuted);
        this.updateMuteUI(isMuted);
      }
    });
  }

  saveSettingsFromModal() {
    const getEl = (id) => document.getElementById(id);
    const newFocus = parseInt(getEl('input-focus-time')?.value || 25, 10);
    const newShort = parseInt(getEl('input-short-break')?.value || 5, 10);
    const newLong = parseInt(getEl('input-long-break')?.value || 15, 10);

    const changed =
      newFocus !== this.config.focusTime ||
      newShort !== this.config.shortBreakTime ||
      newLong !== this.config.longBreakTime;

    this.config.focusTime = Math.max(1, Math.min(180, newFocus));
    this.config.shortBreakTime = Math.max(1, Math.min(60, newShort));
    this.config.longBreakTime = Math.max(1, Math.min(60, newLong));
    this.config.autoStartBreak = getEl('check-auto-break')?.checked || false;
    this.config.autoStartFocus = getEl('check-auto-focus')?.checked || false;
    this.config.desktopNotification = getEl('check-notifications')?.checked || false;

    this.saveData();

    if (changed && this.status !== 'running') {
      this.switchMode(this.mode, false);
    }
  }

  switchMode(targetMode, resetTimer = true) {
    this.mode = targetMode;

    if (resetTimer) {
      this.stopTimer();
    }

    if (this.mode === 'focus') {
      this.totalDuration = this.config.focusTime * 60;
    } else if (this.mode === 'short-break') {
      this.totalDuration = this.config.shortBreakTime * 60;
    } else if (this.mode === 'long-break') {
      this.totalDuration = this.config.longBreakTime * 60;
    }

    if (resetTimer || this.status === 'idle') {
      this.timeLeft = this.totalDuration;
    }

    if (this.dom.timerTimeInput) {
      this.dom.timerTimeInput.style.display = 'none';
    }
    if (this.dom.timerDisplay) {
      this.dom.timerDisplay.style.display = '';
    }
    if (this.dom.timerTimeHint) {
      this.dom.timerTimeHint.style.display = '';
    }

    // Update active tab buttons and labels
    this.dom.modeTabs.forEach((tab) => {
      if (tab.dataset.mode === this.mode) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
      if (tab.dataset.mode === 'focus') {
        tab.innerHTML = `<span>🍅</span> 专注 (${this.config.focusTime}m)`;
      } else if (tab.dataset.mode === 'short-break') {
        tab.innerHTML = `<span>☕</span> 短休 (${this.config.shortBreakTime}m)`;
      } else if (tab.dataset.mode === 'long-break') {
        tab.innerHTML = `<span>🌴</span> 长休 (${this.config.longBreakTime}m)`;
      }
    });

    // Update state badge & Zen break sanctuary
    if (this.mode === 'focus') {
      this.dom.timerStateBadge.innerHTML = '<span class="studio-rec-dot"></span><span class="badge-text-val">REC / 专注中 FOCUSING [27519423]</span>';
      this.dom.timerStateBadge.className = 'timer-badge focus-badge';
      if (this.dom.zenBreakSanctuary) this.dom.zenBreakSanctuary.style.display = 'none';
      if (this.dom.giantClockInner) this.dom.giantClockInner.style.display = 'flex';
      document.body.classList.remove('mode-break-active');
    } else if (this.mode === 'short-break') {
      this.dom.timerStateBadge.innerHTML = '☕ 浅憩短休 (Short Break)';
      this.dom.timerStateBadge.className = 'timer-badge break-badge';
      if (this.dom.zenBreakSanctuary) {
        this.dom.zenBreakSanctuary.style.display = 'flex';
        const txt = document.getElementById('zen-breathing-text');
        if (txt) txt.textContent = '浅憩短休 · 4-7-8 深呼吸';
      }
      if (this.dom.giantClockInner) this.dom.giantClockInner.style.display = 'none';
      document.body.classList.add('mode-break-active');
    } else {
      this.dom.timerStateBadge.innerHTML = '🌴 惬意长休 (Long Break)';
      this.dom.timerStateBadge.className = 'timer-badge long-break-badge';
      if (this.dom.zenBreakSanctuary) {
        this.dom.zenBreakSanctuary.style.display = 'flex';
        const txt = document.getElementById('zen-breathing-text');
        if (txt) txt.textContent = '惬意长休 · 彻底放松大脑';
      }
      if (this.dom.giantClockInner) this.dom.giantClockInner.style.display = 'none';
      document.body.classList.add('mode-break-active');
    }

    if (this.mode !== 'focus') {
      window.audioEngine?.setBreakMute(true);
      window.bilibiliController?.stop(true);
      this.dom.vinylDisc?.classList.remove('is-spinning');
      this.dom.tonearmAssembly?.classList.remove('arm-on-record');
      this.dom.spectrumBars?.classList.remove('is-active');
      if (this.dom.turntableRpmText) this.dom.turntableRpmText.textContent = 'STANDBY 0 RPM';
    } else {
      window.audioEngine?.setBreakMute(false);
      window.bilibiliController?.updateStatusUI(false);
    }

    this.updateDisplay();
  }

  toggleStartPause() {
    window.audioEngine?.init();

    if (this.status === 'running') {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.status = 'running';
    this.endTime = Date.now() + this.timeLeft * 1000;

    this.updateControlsUI();

    // Turntable & Spectrum sync
    this.dom.giantClockStage?.classList.add('is-running');
    if (this.mode === 'focus') {
      this.dom.vinylDisc?.classList.add('is-spinning');
      this.dom.tonearmAssembly?.classList.add('arm-on-record');
      this.dom.spectrumBars?.classList.add('is-active');
      if (this.dom.turntableRpmText) this.dom.turntableRpmText.textContent = 'PLAYING 33⅓ RPM';
    }

    // Start background or tick interval
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const remaining = Math.round((this.endTime - now) / 1000);

      if (remaining <= 0) {
        this.timeLeft = 0;
        this.updateDisplay();
        this.onSessionComplete();
      } else {
        this.timeLeft = remaining;
        this.updateDisplay();
      }
    }, 500);

    // Audio / Bilibili handling
    if (this.mode === 'focus') {
      window.audioEngine?.setBreakMute(false);
      window.bilibiliController?.startOnFocus();
      if (this.config.ambientNoise && this.config.ambientNoise !== 'none') {
        window.audioEngine?.startWhiteNoise(this.config.ambientNoise);
      }
    } else {
      // In break mode: ensure Bilibili & white noise stay 100% stopped and muted
      window.audioEngine?.setBreakMute(true);
      window.bilibiliController?.stopOnBreak();
    }
  }

  pauseTimer() {
    this.status = 'paused';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.updateControlsUI();

    this.dom.giantClockStage?.classList.remove('is-running');
    this.dom.vinylDisc?.classList.remove('is-spinning');
    this.dom.tonearmAssembly?.classList.remove('arm-on-record');
    this.dom.spectrumBars?.classList.remove('is-active');
    if (this.dom.turntableRpmText) this.dom.turntableRpmText.textContent = 'PAUSED 0 RPM';

    // Stop audio while paused
    window.bilibiliController?.pause();
    window.audioEngine?.stopWhiteNoise();
  }

  stopTimer() {
    this.status = 'idle';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updateControlsUI();
    this.dom.giantClockStage?.classList.remove('is-running');
    this.dom.vinylDisc?.classList.remove('is-spinning');
    this.dom.tonearmAssembly?.classList.remove('arm-on-record');
    this.dom.spectrumBars?.classList.remove('is-active');
    if (this.dom.turntableRpmText) this.dom.turntableRpmText.textContent = 'STANDBY 33⅓ RPM';
    window.bilibiliController?.stop();
    window.audioEngine?.stopWhiteNoise();
  }

  resetSession() {
    window.audioEngine?.playNotification('click');
    this.stopTimer();
    this.timeLeft = this.totalDuration;
    this.updateDisplay();
  }

  skipSession() {
    window.audioEngine?.playNotification('click');
    this.stopTimer();
    this.advanceToNextMode();
  }

  onSessionComplete() {
    this.stopTimer();

    // Sound notification
    if (this.mode === 'focus') {
      window.audioEngine?.playNotification('focus-done');
      this.completedPomodoros++;
      this.focusMinutesToday += this.config.focusTime;
      this.saveData();
      this.updateStatsUI();

      this.sendNotification(
        '🎉 番茄钟专注完成！',
        `恭喜完成 ${this.config.focusTime} 分钟专注！休息时间到了，B站伴学音乐已自动关闭，站起来喝杯水吧～`
      );

      // Stop Bilibili & white noise immediately
      window.audioEngine?.setBreakMute(true);
      window.bilibiliController?.stopOnBreak();

      // Determine next mode: Long Break or Short Break
      if (this.completedPomodoros % this.longBreakInterval === 0) {
        this.switchMode('long-break', true);
      } else {
        this.switchMode('short-break', true);
      }

      if (this.config.autoStartBreak) {
        setTimeout(() => this.startTimer(), 1000);
      }
    } else {
      // Break complete
      window.audioEngine?.playNotification('break-done');
      this.sendNotification(
        '☕ 休息结束！',
        '休息时间结束啦，准备好迎接下一个充满成效的专注番茄钟了吗？'
      );

      this.switchMode('focus', true);

      if (this.config.autoStartFocus) {
        setTimeout(() => this.startTimer(), 1000);
      }
    }
  }

  advanceToNextMode() {
    if (this.mode === 'focus') {
      if (this.completedPomodoros > 0 && this.completedPomodoros % this.longBreakInterval === 0) {
        this.switchMode('long-break', true);
      } else {
        this.switchMode('short-break', true);
      }
    } else {
      this.switchMode('focus', true);
    }
  }

  sendNotification(title, body) {
    if (!this.config.desktopNotification) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'assets/favicon.svg'
        });
      } catch (e) {}
    }
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (this.dom.timerDisplay) {
      this.dom.timerDisplay.textContent = timeStr;
    }

    const progressRatio = Math.max(0, Math.min(1, (this.totalDuration - this.timeLeft) / this.totalDuration));

    // Update Laser Groove Progress Track & Markers
    if (this.dom.laserTrackProgress) {
      this.dom.laserTrackProgress.style.width = `${(progressRatio * 100).toFixed(1)}%`;
    }
    if (this.dom.grooveMarkerEnd) {
      const totalMins = Math.floor(this.totalDuration / 60);
      this.dom.grooveMarkerEnd.textContent = `${totalMins.toString().padStart(2, '0')}:00`;
      if (this.dom.grooveMarkerMid) {
        const halfMins = Math.floor(totalMins / 2);
        const halfSecs = (totalMins % 2) * 30;
        this.dom.grooveMarkerMid.textContent = `${halfMins.toString().padStart(2, '0')}:${halfSecs.toString().padStart(2, '0')}`;
      }
    }

    // Update Circular Ring Progress (Halo backdrop)
    if (this.dom.timerRing) {
      const radius = 195;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - progressRatio * circumference;
      this.dom.timerRing.style.strokeDashoffset = offset;
    }

    // Update Page Title
    const modeName = this.mode === 'focus' ? '🍅 专注中' : '☕ 休息中';
    document.title = `${timeStr} - ${modeName} | Lofi 番茄钟`;
  }

  updateControlsUI() {
    if (this.status === 'running') {
      this.dom.btnStartPause.classList.add('running');
      this.dom.startPauseText.textContent = '暂停';
      this.dom.startPauseIcon.innerHTML = `
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      `;
    } else {
      this.dom.btnStartPause.classList.remove('running');
      this.dom.startPauseText.textContent = this.status === 'paused' ? '继续' : '开始';
      this.dom.startPauseIcon.innerHTML = `
        <svg class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  }

  updateStatsUI() {
    if (this.dom.statPomoCount) {
      this.dom.statPomoCount.textContent = this.completedPomodoros;
    }
    if (this.dom.statMinutes) {
      this.dom.statMinutes.textContent = `${this.focusMinutesToday} 分钟`;
    }
    if (this.dom.tomatoTally) {
      const count = Math.min(this.completedPomodoros, 16);
      let tallyHtml = '';
      for (let i = 0; i < count; i++) {
        tallyHtml += `<span class="inline-block transform hover:scale-125 transition-transform" title="已完成第 ${i + 1} 个番茄钟">🍅</span>`;
      }
      if (this.completedPomodoros === 0) {
        tallyHtml = '<span class="text-white/30 text-xs">今日还未开始，加油迈出第一步！</span>';
      } else if (this.completedPomodoros > 16) {
        tallyHtml += `<span class="text-white/60 text-xs ml-1">+${this.completedPomodoros - 16}</span>`;
      }
      this.dom.tomatoTally.innerHTML = tallyHtml;
    }
  }

  updateMuteUI(isMuted) {
    if (!this.dom.muteIcon) return;
    if (isMuted) {
      this.dom.muteIcon.innerHTML = `
        <svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      `;
    } else {
      this.dom.muteIcon.innerHTML = `
        <svg class="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      `;
    }
  }

  toggleZenMode() {
    this.config.zenMode = !this.config.zenMode;
    document.body.classList.toggle('zen-mode', this.config.zenMode);
    this.dom.btnZen.classList.toggle('active', this.config.zenMode);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  renderTasks() {
    if (!this.dom.taskList) return;
    if (this.tasks.length === 0) {
      this.dom.taskList.innerHTML = `
        <div class="text-center py-6 text-white/30 text-xs">
          暂无任务，随手记下当下一个小小目标吧 ✍️
        </div>
      `;
      return;
    }

    this.dom.taskList.innerHTML = this.tasks
      .map(
        (task) => `
        <div class="task-item flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 ${
          task.done ? 'opacity-40 line-through' : ''
        }" data-id="${task.id}">
          <label class="flex items-center gap-3 cursor-pointer flex-1 select-none">
            <input type="checkbox" class="task-checkbox rounded border-white/20 bg-black/30 text-red-500 focus:ring-0" ${
              task.done ? 'checked' : ''
            }>
            <span class="text-sm font-medium text-white/90">${escapeHtml(task.text)}</span>
          </label>
          <button class="task-delete-btn text-white/30 hover:text-red-400 p-1 rounded transition-colors ml-2" title="删除任务">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      `
      )
      .join('');

    // Bind task checkboxes & delete buttons
    this.dom.taskList.querySelectorAll('.task-item').forEach((item) => {
      const id = parseInt(item.dataset.id, 10);
      const checkbox = item.querySelector('.task-checkbox');
      const deleteBtn = item.querySelector('.task-delete-btn');

      checkbox.addEventListener('change', (e) => {
        const task = this.tasks.find((t) => t.id === id);
        if (task) {
          task.done = e.target.checked;
          this.saveData();
          this.renderTasks();
        }
      });

      deleteBtn.addEventListener('click', () => {
        this.tasks = this.tasks.filter((t) => t.id !== id);
        this.saveData();
        this.renderTasks();
      });
    });
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.addEventListener('DOMContentLoaded', () => {
  window.pomodoroApp = new PomodoroApp();
  window.pomodoroApp.init();
});
