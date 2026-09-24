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
    this.displayMode = 'countdown'; // 'countdown' | 'percent' | 'elapsed'

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
    this.isTasksMinimized = false;

    // Deck view mode ('turntable' | 'video')
    this.deckView = 'turntable';
    this.isVideoFocusActive = false;

    // Phones use a deliberately reduced UI. The pointer check also catches
    // landscape phones whose CSS viewport is wider than 640px.
    this.phoneMediaQuery = window.matchMedia(
      '(max-width: 640px), (hover: none) and (pointer: coarse) and (max-width: 900px)'
    );

    // DOM Elements Cache
    this.dom = {};
  }

  init() {
    this.cacheDom();
    this.loadSavedData();
    this.checkDeviceLayout();
    this.bindEvents();
    this.initControllers();
    this.switchDeckView(this.deckView);
    this.switchMode(this.mode, false);
    this.updateStatsUI();
    this.renderTasks();
    this.updateTasksWidgetVisibility();

    // Desktop-only feature; avoid interrupting the simplified phone experience.
    if (!this.isPhone() && 'Notification' in window && Notification.permission === 'default') {
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
      vintageSplitFlapBoard: document.getElementById('vintage-split-flap-board'),
      flapM1: document.getElementById('flap-m1'),
      flapM2: document.getElementById('flap-m2'),
      flapS1: document.getElementById('flap-s1'),
      flapS2: document.getElementById('flap-s2'),
      flapColon: document.getElementById('flap-colon'),
      flapUnitSymbol: document.getElementById('flap-unit-symbol'),
      progModeBtns: document.querySelectorAll('.prog-mode-btn'),
      groovePercentVal: document.getElementById('groove-percent-val'),
      grooveTimeStats: document.getElementById('groove-time-stats'),
      grooveBlocks: document.querySelectorAll('.groove-block'),
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
      hudStatusText: document.getElementById('hud-status-text'),
      chronoTelemetryBadge: document.getElementById('chrono-telemetry-badge'),

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
      taskList: document.getElementById('task-items-list'),

      // Focus Tasks Widget & Controls
      focusTasksWidget: document.getElementById('focus-tasks-widget'),
      focusTasksMinPill: document.getElementById('focus-tasks-min-pill'),
      btnMinimizeTasks: document.getElementById('btn-minimize-tasks'),
      btnToggleTasks: document.getElementById('btn-toggle-tasks'),
      navTasksBadge: document.getElementById('nav-tasks-badge'),
      focusTaskCountBadge: document.getElementById('focus-task-count-badge'),
      focusTasksPillCount: document.getElementById('focus-tasks-pill-count'),
      focusTaskForm: document.getElementById('focus-task-add-form'),
      focusTaskInput: document.getElementById('focus-task-new-input'),
      focusTaskList: document.getElementById('focus-task-items-list'),
      btnExpandFullPanel: document.getElementById('btn-expand-full-panel'),

      // Deck utility & tasks elements
      deckUtilityControls: document.getElementById('deck-utility-controls'),
      deckTasksSection: document.getElementById('deck-tasks-section'),
      btnToggleDeckControls: document.getElementById('btn-toggle-deck-controls'),

      // Mobile phone hub (timer audio only)
      mobileCompanionHub: document.getElementById('mobile-companion-hub'),
      mobileAmbientSelect: document.getElementById('mobile-ambient-select'),
      mobileVolumeSlider: document.getElementById('mobile-volume-slider'),
      btnMobileAmbientToggle: document.getElementById('btn-mobile-ambient-toggle'),
      mobileSoundStateText: document.getElementById('mobile-sound-state-text')
    };
  }

  isPhone() {
    return this.phoneMediaQuery?.matches ?? (window.innerWidth <= 640);
  }

  isMobile() {
    return this.isPhone();
  }

  checkDeviceLayout() {
    const isPhone = this.isPhone();
    const wasPhone = document.body.classList.contains('is-phone-device');
    document.body.classList.toggle('is-phone-device', isPhone);
    return { changed: isPhone !== wasPhone, isPhone };
  }

  handleDeviceLayoutChange() {
    const { changed, isPhone } = this.checkDeviceLayout();
    if (!changed) return;

    if (isPhone) {
      // Companion media must never continue after crossing into phone layout.
      window.bilibiliController?.stop();
      this.dom.modalSettings?.classList.add('hidden');

      if (this.config.zenMode) {
        this.config.zenMode = false;
        document.body.classList.remove('zen-mode');
        this.dom.btnZen?.classList.remove('active');
      }

      if (this.displayMode !== 'countdown') {
        this.displayMode = 'countdown';
        this.dom.progModeBtns?.forEach((button) => {
          button.classList.toggle('active', button.dataset.displayMode === 'countdown');
        });
        this.updateDisplay();
      }
    } else {
      window.bilibiliController?.updateStatusUI();
    }
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

    // Deck View Mode
    const savedDeckView = localStorage.getItem('pomodoro_deck_view');
    this.deckView = savedDeckView === 'video' ? 'video' : 'turntable';
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
          tab.innerHTML = `<span>🍅</span> Focus (${this.config.focusTime}m)`;
        } else if (mode === 'short-break') {
          tab.innerHTML = `<span>☕</span> Break (${this.config.shortBreakTime}m)`;
        } else if (mode === 'long-break') {
          tab.innerHTML = `<span>🌴</span> Long Break (${this.config.longBreakTime}m)`;
        }
      });
    }

    if (this.dom.volumeSlider) this.dom.volumeSlider.value = this.config.soundVolume * 100;
    if (this.dom.mobileVolumeSlider) this.dom.mobileVolumeSlider.value = this.config.soundVolume * 100;
    if (this.dom.ambientSelect) this.dom.ambientSelect.value = this.config.ambientNoise;
    if (this.dom.mobileAmbientSelect) this.dom.mobileAmbientSelect.value = this.config.ambientNoise;
    this.updateMobileSoundButtonText();

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
        this.dom.directOpenText.textContent = `🚀 Open ${target.title}`;
      }
    }
  }

  updateMobileSoundButtonText() {
    if (!this.dom.mobileSoundStateText) return;
    const isOff = !this.config.ambientNoise || this.config.ambientNoise === 'none';
    this.dom.mobileSoundStateText.textContent = isOff ? '🔇 Sound Off' : '🔊 Sound Active';
    if (this.dom.btnMobileAmbientToggle) {
      this.dom.btnMobileAmbientToggle.classList.toggle('text-white/40', isOff);
      this.dom.btnMobileAmbientToggle.classList.toggle('text-amber-400', !isOff);
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

    // Direct click-to-edit on main clock display & split flap cards
    const triggerFlapEdit = () => {
      if (this.status === 'running') {
        this.pauseTimer();
      }
      const currentMins = Math.max(1, Math.round(this.timeLeft / 60));
      if (this.dom.timerTimeInput) {
        this.dom.timerTimeInput.value = currentMins;
        if (this.dom.vintageSplitFlapBoard) this.dom.vintageSplitFlapBoard.style.display = 'none';
        if (this.dom.timerDisplay) this.dom.timerDisplay.style.display = 'none';
        if (this.dom.timerTimeHint) this.dom.timerTimeHint.style.display = 'none';
        this.dom.timerTimeInput.style.display = 'block';
        this.dom.timerTimeInput.focus();
        this.dom.timerTimeInput.select();
      }
    };

    if (this.dom.vintageSplitFlapBoard) {
      this.dom.vintageSplitFlapBoard.addEventListener('click', triggerFlapEdit);
    }
    if (this.dom.timerDisplay) {
      this.dom.timerDisplay.addEventListener('click', triggerFlapEdit);
    }

    if (this.dom.timerTimeInput) {
      const finishTimeEdit = (commit = true) => {
        if (this.dom.timerTimeInput.style.display === 'none') return;
        if (commit) {
          const val = parseInt(this.dom.timerTimeInput.value, 10);
          if (!isNaN(val) && val > 0) {
            this.setCustomFocusDuration(val);
          }
        }
        this.dom.timerTimeInput.style.display = 'none';
        if (this.dom.vintageSplitFlapBoard) this.dom.vintageSplitFlapBoard.style.display = 'flex';
        if (this.dom.timerDisplay) this.dom.timerDisplay.style.display = '';
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

    // Progress Display Mode Switcher (countdown / percent / elapsed)
    if (this.dom.progModeBtns) {
      this.dom.progModeBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const mode = e.currentTarget.dataset.displayMode;
          if (mode) {
            this.displayMode = mode;
            this.dom.progModeBtns.forEach((b) => b.classList.toggle('active', b === e.currentTarget));
            this.updateDisplay();
            window.audioEngine?.playNotification('click');
          }
        });
      });
    }

    // Turntable vs Video Deck View Switcher
    if (this.dom.btnViewTurntable) {
      this.dom.btnViewTurntable.addEventListener('click', () => this.switchDeckView('turntable'));
    }
    if (this.dom.btnViewVideo) {
      this.dom.btnViewVideo.addEventListener('click', () => this.switchDeckView('video'));
    }
    if (this.dom.btnToggleDeckControls) {
      this.dom.btnToggleDeckControls.addEventListener('click', () => {
        this.dom.sidePanel?.classList.toggle('controls-revealed');
      });
    }

    // Volume & Ambient
    if (this.dom.volumeSlider) {
      this.dom.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        this.config.soundVolume = val;
        if (this.dom.mobileVolumeSlider) this.dom.mobileVolumeSlider.value = e.target.value;
        window.audioEngine?.setVolume(val);
        this.saveData();
      });
    }

    if (this.dom.mobileVolumeSlider) {
      this.dom.mobileVolumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        this.config.soundVolume = val;
        if (this.dom.volumeSlider) this.dom.volumeSlider.value = e.target.value;
        window.audioEngine?.setVolume(val);
        this.saveData();
      });
    }

    if (this.dom.ambientSelect) {
      this.dom.ambientSelect.addEventListener('change', (e) => {
        this.config.ambientNoise = e.target.value;
        if (this.dom.mobileAmbientSelect) this.dom.mobileAmbientSelect.value = e.target.value;
        this.saveData();
        if (this.status === 'running' && this.mode === 'focus') {
          window.audioEngine?.startWhiteNoise(this.config.ambientNoise);
        } else {
          window.audioEngine?.stopWhiteNoise();
        }
        this.updateMobileSoundButtonText();
      });
    }

    if (this.dom.mobileAmbientSelect) {
      this.dom.mobileAmbientSelect.addEventListener('change', (e) => {
        this.config.ambientNoise = e.target.value;
        if (this.dom.ambientSelect) this.dom.ambientSelect.value = e.target.value;
        this.saveData();
        if (this.status === 'running' && this.mode === 'focus') {
          window.audioEngine?.startWhiteNoise(this.config.ambientNoise);
        } else {
          window.audioEngine?.stopWhiteNoise();
        }
        this.updateMobileSoundButtonText();
      });
    }

    if (this.dom.btnMobileAmbientToggle) {
      this.dom.btnMobileAmbientToggle.addEventListener('click', () => {
        if (!this.config.ambientNoise || this.config.ambientNoise === 'none') {
          this.config.ambientNoise = 'fire';
        } else {
          this.config.ambientNoise = 'none';
        }
        if (this.dom.ambientSelect) this.dom.ambientSelect.value = this.config.ambientNoise;
        if (this.dom.mobileAmbientSelect) this.dom.mobileAmbientSelect.value = this.config.ambientNoise;
        this.saveData();
        if (this.status === 'running' && this.mode === 'focus') {
          window.audioEngine?.startWhiteNoise(this.config.ambientNoise);
        } else {
          window.audioEngine?.stopWhiteNoise();
        }
        this.updateMobileSoundButtonText();
      });
    }

    const onDeviceLayoutChange = () => this.handleDeviceLayoutChange();
    if (this.phoneMediaQuery?.addEventListener) {
      this.phoneMediaQuery.addEventListener('change', onDeviceLayoutChange);
    } else {
      this.phoneMediaQuery?.addListener(onDeviceLayoutChange);
    }

    window.addEventListener('themeChanged', (e) => {
      if (e.detail?.theme === 'cozy-fireplace') {
        if (this.config.ambientNoise === 'none') {
          this.config.ambientNoise = 'fire';
          if (this.dom.ambientSelect) this.dom.ambientSelect.value = 'fire';
          if (this.dom.mobileAmbientSelect) this.dom.mobileAmbientSelect.value = 'fire';
          this.saveData();
          if (this.status === 'running' && this.mode === 'focus') {
            window.audioEngine?.startWhiteNoise('fire');
          }
          this.updateMobileSoundButtonText();
        }
      }
    });

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
              this.dom.directOpenText.textContent = `🚀 Open ${target.title}`;
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
        this.toggleCompanionPanel();
      });
    }

    // Toggle Tasks Widget (Navbar button)
    if (this.dom.btnToggleTasks) {
      this.dom.btnToggleTasks.addEventListener('click', () => {
        if (!this.isPhone()) this.toggleTasksWidget();
      });
    }

    // Minimize Tasks Widget
    if (this.dom.btnMinimizeTasks) {
      this.dom.btnMinimizeTasks.addEventListener('click', () => {
        this.isTasksMinimized = true;
        this.updateTasksWidgetVisibility();
      });
    }

    // Expand to Full Companion Panel
    if (this.dom.btnExpandFullPanel) {
      this.dom.btnExpandFullPanel.addEventListener('click', () => {
        this.setPanelCollapsed(false);
      });
    }

    // Restore Tasks Widget from Pill
    if (this.dom.focusTasksMinPill) {
      this.dom.focusTasksMinPill.addEventListener('click', () => {
        this.isTasksMinimized = false;
        this.updateTasksWidgetVisibility();
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

    // Todo List Forms (Companion panel & Focus tasks widget)
    if (this.dom.taskForm) {
      this.dom.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.dom.taskInput?.value;
        if (text) {
          this.addNewTask(text);
          this.dom.taskInput.value = '';
        }
      });
    }

    if (this.dom.focusTaskForm) {
      this.dom.focusTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.dom.focusTaskInput?.value;
        if (text) {
          this.addNewTask(text);
          this.dom.focusTaskInput.value = '';
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
      } else if (e.code === 'KeyT' && !e.ctrlKey) {
        this.toggleTasksWidget();
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
      const led = '<span class="tab-indicator-led"></span>';
      if (tab.dataset.mode === 'focus') {
        tab.innerHTML = `${led}<span>🍅 Focus (${this.config.focusTime}m)</span>`;
      } else if (tab.dataset.mode === 'short-break') {
        tab.innerHTML = `${led}<span>☕ Break (${this.config.shortBreakTime}m)</span>`;
      } else if (tab.dataset.mode === 'long-break') {
        tab.innerHTML = `${led}<span>🌴 Long Break (${this.config.longBreakTime}m)</span>`;
      }
    });

    // Update state badge & Zen break sanctuary
    if (this.mode === 'focus') {
      if (this.dom.timerStateBadge) {
        this.dom.timerStateBadge.innerHTML = '<span class="studio-rec-dot"></span><span class="badge-text-val">FOCUSING</span>';
        this.dom.timerStateBadge.className = 'timer-badge focus-badge';
      }
      if (this.dom.zenBreakSanctuary) this.dom.zenBreakSanctuary.style.display = 'none';
      if (this.dom.vintageSplitFlapBoard) this.dom.vintageSplitFlapBoard.style.display = 'flex';
      if (this.dom.hudStatusText) this.dom.hudStatusText.textContent = this.status === 'running' ? 'FLOW RUNNING' : 'STANDBY';
      if (this.dom.chronoTelemetryBadge) {
        this.dom.chronoTelemetryBadge.innerHTML = '<span class="telemetry-live-dot"></span><span class="telemetry-text">MASTER CADENCE 100%</span>';
      }
      document.body.classList.remove('mode-break-active');
    } else if (this.mode === 'short-break') {
      if (this.dom.timerStateBadge) {
        this.dom.timerStateBadge.innerHTML = '☕ Short Break';
        this.dom.timerStateBadge.className = 'timer-badge break-badge';
      }
      if (this.dom.zenBreakSanctuary) {
        this.dom.zenBreakSanctuary.style.display = 'flex';
        const txt = document.getElementById('zen-breathing-text');
        if (txt) txt.textContent = 'Short break · 4-7-8 deep breathing';
        const sub = document.getElementById('zen-break-subtext');
        if (sub) sub.textContent = 'Companion stream muted · close your eyes · grab some water';
      }
      if (this.dom.vintageSplitFlapBoard) this.dom.vintageSplitFlapBoard.style.display = 'flex';
      if (this.dom.hudStatusText) this.dom.hudStatusText.textContent = 'SHORT BREAK';
      if (this.dom.chronoTelemetryBadge) {
        this.dom.chronoTelemetryBadge.innerHTML = '<span class="telemetry-live-dot break"></span><span class="telemetry-text">RESTORATIVE FLOW · 4-7-8 ZEN</span>';
      }
      document.body.classList.add('mode-break-active');
    } else {
      if (this.dom.timerStateBadge) {
        this.dom.timerStateBadge.innerHTML = '🌴 Long Break';
        this.dom.timerStateBadge.className = 'timer-badge long-break-badge';
      }
      if (this.dom.zenBreakSanctuary) {
        this.dom.zenBreakSanctuary.style.display = 'flex';
        const txt = document.getElementById('zen-breathing-text');
        if (txt) txt.textContent = 'Long break · fully unwind your mind';
        const sub = document.getElementById('zen-break-subtext');
        if (sub) sub.textContent = 'Stand up, stretch your body and refresh your energy';
      }
      if (this.dom.vintageSplitFlapBoard) this.dom.vintageSplitFlapBoard.style.display = 'flex';
      if (this.dom.hudStatusText) this.dom.hudStatusText.textContent = 'LONG BREAK';
      if (this.dom.chronoTelemetryBadge) {
        this.dom.chronoTelemetryBadge.innerHTML = '<span class="telemetry-live-dot break"></span><span class="telemetry-text">DEEP REST · 4-7-8 ZEN</span>';
      }
      document.body.classList.add('mode-break-active');
    }

    if (this.mode !== 'focus') {
      // Auto-expand companion panel during break and reveal controls
      this.setPanelCollapsed(false);
      this.setVideoFocusMode(false);
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

    // Live Video view: keep companion panel open, hide utility buttons, show only tasks
    // Turntable view: auto-close companion panel to eliminate distraction
    if (this.mode === 'focus') {
      if (this.deckView === 'video') {
        this.setPanelCollapsed(false);
        this.setVideoFocusMode(true);
      } else {
        this.setPanelCollapsed(true);
        this.setVideoFocusMode(false);
      }
    } else {
      this.setPanelCollapsed(false);
      this.setVideoFocusMode(false);
    }

    this.updateControlsUI();

    // Turntable & Console sync
    this.dom.giantClockStage?.classList.add('is-running');
    if (this.dom.hudStatusText) this.dom.hudStatusText.textContent = this.mode === 'focus' ? 'FLOW RUNNING' : 'RESTING';
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
      if (!this.isPhone()) {
        window.bilibiliController?.startOnFocus();
      }
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

    // Auto-expand companion panel on pause and reveal controls
    this.setPanelCollapsed(false);
    this.setVideoFocusMode(false);

    this.updateControlsUI();

    this.dom.giantClockStage?.classList.remove('is-running');
    this.dom.vinylDisc?.classList.remove('is-spinning');
    this.dom.tonearmAssembly?.classList.remove('arm-on-record');
    this.dom.spectrumBars?.classList.remove('is-active');
    if (this.dom.turntableRpmText) this.dom.turntableRpmText.textContent = 'PAUSED 0 RPM';
    if (this.dom.hudStatusText) this.dom.hudStatusText.textContent = 'PAUSED';

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
    if (this.dom.hudStatusText) this.dom.hudStatusText.textContent = 'STANDBY';
    window.bilibiliController?.stop();
    window.audioEngine?.stopWhiteNoise();
  }

  resetSession() {
    window.audioEngine?.playNotification('click');
    this.stopTimer();
    this.timeLeft = this.totalDuration;
    this.setPanelCollapsed(false);
    this.setVideoFocusMode(false);
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
        '🎉 Focus session complete!',
        `Great job — ${this.config.focusTime} minutes of focus done! Break time: the Bilibili stream is auto-closed. Stand up and grab a glass of water!`
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
        '☕ Break over!',
        'Break time is over — ready for another productive focus session?'
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

  updateFlap(cardEl, newDigit) {
    if (!cardEl) return;
    const currentVal = cardEl.getAttribute('data-val');
    const strVal = String(newDigit);
    if (currentVal === strVal) return;

    cardEl.setAttribute('data-val', strVal);
    const nums = cardEl.querySelectorAll('.flap-num');
    nums.forEach((num) => {
      num.textContent = strVal;
    });
  }

  updateDisplay() {
    const progressRatio = Math.max(0, Math.min(1, (this.totalDuration - this.timeLeft) / this.totalDuration));
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const pct = Math.round(progressRatio * 100);
    const elapsedSec = Math.max(0, this.totalDuration - this.timeLeft);
    const eMins = Math.floor(elapsedSec / 60);
    const eSecs = elapsedSec % 60;

    if (this.dom.timerDisplay) {
      this.dom.timerDisplay.textContent = timeStr;
    }

    // Colossal Display Modes: 'countdown' | 'percent' | 'elapsed'
    if (this.displayMode === 'percent') {
      if (this.dom.flapColon) this.dom.flapColon.style.display = 'none';
      if (this.dom.flapUnitSymbol) this.dom.flapUnitSymbol.style.display = 'block';
      if (this.dom.flapS1) this.dom.flapS1.style.display = 'none';
      if (this.dom.flapS2) this.dom.flapS2.style.display = 'none';

      const pctStr = pct.toString().padStart(2, '0');
      this.updateFlap(this.dom.flapM1, pctStr[pctStr.length - 2] || '0');
      this.updateFlap(this.dom.flapM2, pctStr[pctStr.length - 1] || '0');
    } else if (this.displayMode === 'elapsed') {
      if (this.dom.flapColon) this.dom.flapColon.style.display = 'flex';
      if (this.dom.flapUnitSymbol) this.dom.flapUnitSymbol.style.display = 'none';
      if (this.dom.flapS1) this.dom.flapS1.style.display = 'flex';
      if (this.dom.flapS2) this.dom.flapS2.style.display = 'flex';

      const emStr = eMins.toString().padStart(2, '0');
      const esStr = eSecs.toString().padStart(2, '0');
      this.updateFlap(this.dom.flapM1, emStr[0]);
      this.updateFlap(this.dom.flapM2, emStr[1]);
      this.updateFlap(this.dom.flapS1, esStr[0]);
      this.updateFlap(this.dom.flapS2, esStr[1]);
    } else {
      // Default: Countdown (MM:SS)
      if (this.dom.flapColon) this.dom.flapColon.style.display = 'flex';
      if (this.dom.flapUnitSymbol) this.dom.flapUnitSymbol.style.display = 'none';
      if (this.dom.flapS1) this.dom.flapS1.style.display = 'flex';
      if (this.dom.flapS2) this.dom.flapS2.style.display = 'flex';

      const mStr = mins.toString().padStart(2, '0');
      const sStr = secs.toString().padStart(2, '0');
      this.updateFlap(this.dom.flapM1, mStr[0]);
      this.updateFlap(this.dom.flapM2, mStr[1]);
      this.updateFlap(this.dom.flapS1, sStr[0]);
      this.updateFlap(this.dom.flapS2, sStr[1]);
    }

    // Physical Vinyl Microgroove Track Matrix update
    if (this.dom.groovePercentVal) {
      this.dom.groovePercentVal.textContent = `${pct}%`;
    }
    if (this.dom.grooveTimeStats) {
      const totalMin = Math.floor(this.totalDuration / 60);
      const remainMin = Math.ceil(this.timeLeft / 60);
      const doneMin = Math.floor(elapsedSec / 60);
      this.dom.grooveTimeStats.textContent = `${doneMin}m / ${totalMin}m · ${remainMin}m left`;
    }
    if (this.dom.grooveBlocks && this.dom.grooveBlocks.length > 0) {
      const etchedCount = Math.floor(progressRatio * this.dom.grooveBlocks.length);
      this.dom.grooveBlocks.forEach((block, idx) => {
        block.classList.toggle('is-etched', idx < etchedCount);
        block.classList.toggle('is-current', idx === etchedCount && this.status === 'running');
      });
    }

    // Update Smooth Laser Fill Track
    if (this.dom.laserTrackProgress) {
      this.dom.laserTrackProgress.style.width = `${(progressRatio * 100).toFixed(1)}%`;
    }

    // Tonearm Dynamic Groove Tracking across vinyl disc
    if (this.dom.tonearmAssembly) {
      if (this.mode === 'focus' && this.status === 'running') {
        const armAngle = 18 + progressRatio * 13; // 18deg at outer rim -> 31deg at inner track
        this.dom.tonearmAssembly.style.transform = `rotate(${armAngle}deg)`;
      } else if (this.status === 'idle') {
        this.dom.tonearmAssembly.style.transform = 'rotate(0deg)';
      }
    }

    // Update Page Title
    const modeName = this.mode === 'focus' ? '🍅 Focusing' : '☕ On Break';
    const titleVal = this.displayMode === 'percent' ? `${pct}%` : timeStr;
    document.title = `${titleVal} - ${modeName} | Lofi Pomodoro`;
  }

  updateControlsUI() {
    if (this.status === 'running') {
      this.dom.btnStartPause.classList.add('running');
      this.dom.startPauseText.textContent = 'Pause';
      this.dom.startPauseIcon.innerHTML = `
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      `;
    } else {
      this.dom.btnStartPause.classList.remove('running');
      this.dom.startPauseText.textContent = this.status === 'paused' ? 'Resume' : 'Start';
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
      this.dom.statMinutes.textContent = `${this.focusMinutesToday} min`;
    }
    if (this.dom.tomatoTally) {
      const count = Math.min(this.completedPomodoros, 16);
      let tallyHtml = '';
      for (let i = 0; i < count; i++) {
        tallyHtml += `<span class="inline-block transform hover:scale-125 transition-transform" title="Pomodoro #${i + 1} completed">🍅</span>`;
      }
      if (this.completedPomodoros === 0) {
        tallyHtml = '<span class="text-white/30 text-xs">No pomodoros yet — take the first step!</span>';
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
    if (this.isPhone()) return;
    this.config.zenMode = !this.config.zenMode;
    document.body.classList.toggle('zen-mode', this.config.zenMode);
    this.dom.btnZen?.classList.toggle('active', this.config.zenMode);
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

  toggleCompanionPanel() {
    if (!this.dom.sidePanel) return;
    const isHidden = this.dom.sidePanel.classList.toggle('hidden-panel');
    if (this.dom.containerMain) {
      this.dom.containerMain.classList.toggle('panel-collapsed', isHidden);
    }
    if (this.dom.btnTogglePanel) {
      this.dom.btnTogglePanel.classList.toggle('opacity-50', isHidden);
    }
    this.updateTasksWidgetVisibility();
  }

  setPanelCollapsed(collapsed) {
    if (!this.dom.sidePanel) return;
    this.dom.sidePanel.classList.toggle('hidden-panel', collapsed);
    if (this.dom.containerMain) {
      this.dom.containerMain.classList.toggle('panel-collapsed', collapsed);
    }
    if (this.dom.btnTogglePanel) {
      this.dom.btnTogglePanel.classList.toggle('opacity-50', collapsed);
    }
    if (collapsed) {
      this.setVideoFocusMode(false);
    }
    this.updateTasksWidgetVisibility();
  }

  switchDeckView(view) {
    this.deckView = view;
    localStorage.setItem('pomodoro_deck_view', view);

    if (view === 'video') {
      this.dom.btnViewVideo?.classList.add('active');
      this.dom.btnViewTurntable?.classList.remove('active');
      if (this.dom.turntableDeckView) this.dom.turntableDeckView.style.display = 'none';
      if (this.dom.biliPlayerWrapper) this.dom.biliPlayerWrapper.style.display = 'block';

      if (window.bilibiliController) {
        window.bilibiliController.mode = 'embedded';
        const select = document.getElementById('bili-mode-select');
        if (select) select.value = 'embedded';
        window.bilibiliController.saveSettings();

        // If focus timer is currently running, activate video focus mode
        if (this.status === 'running' && this.mode === 'focus') {
          window.bilibiliController.play();
          this.setPanelCollapsed(false);
          this.setVideoFocusMode(true);
        }
      }
    } else {
      this.dom.btnViewTurntable?.classList.add('active');
      this.dom.btnViewVideo?.classList.remove('active');
      if (this.dom.turntableDeckView) this.dom.turntableDeckView.style.display = 'flex';
      if (this.dom.biliPlayerWrapper) this.dom.biliPlayerWrapper.style.display = 'none';

      this.setVideoFocusMode(false);
      // If focus timer is running, auto-collapse panel for turntable
      if (this.status === 'running' && this.mode === 'focus') {
        this.setPanelCollapsed(true);
      }
    }
  }

  setVideoFocusMode(active) {
    this.isVideoFocusActive = active;
    if (this.dom.sidePanel) {
      this.dom.sidePanel.classList.toggle('video-focus-active', active);
      if (!active) {
        this.dom.sidePanel.classList.remove('controls-revealed');
      }
    }
  }

  toggleTasksWidget() {
    if (this.isPhone()) return;
    const isPanelHidden = this.dom.sidePanel ? this.dom.sidePanel.classList.contains('hidden-panel') : true;

    if (!isPanelHidden) {
      // If companion panel is open, collapse it and show the focus tasks widget
      this.setPanelCollapsed(true);
      this.isTasksMinimized = false;
      this.updateTasksWidgetVisibility();
    } else {
      // Toggle minimized state
      this.isTasksMinimized = !this.isTasksMinimized;
      this.updateTasksWidgetVisibility();
    }
  }

  updateTasksWidgetVisibility() {
    const isPanelHidden = this.dom.sidePanel ? this.dom.sidePanel.classList.contains('hidden-panel') : true;

    if (isPanelHidden) {
      // Panel is closed: show floating tasks widget (or pill if minimized)
      const showWidget = !this.isTasksMinimized;
      if (this.dom.focusTasksWidget) {
        this.dom.focusTasksWidget.classList.toggle('hidden-widget', !showWidget);
      }
      if (this.dom.focusTasksMinPill) {
        this.dom.focusTasksMinPill.classList.toggle('hidden-pill', showWidget);
      }
      if (this.dom.containerMain) {
        this.dom.containerMain.classList.toggle('tasks-open', showWidget);
      }
    } else {
      // Panel is open: tasks are visible inside companion panel, so hide floating widget & pill
      if (this.dom.focusTasksWidget) {
        this.dom.focusTasksWidget.classList.add('hidden-widget');
      }
      if (this.dom.focusTasksMinPill) {
        this.dom.focusTasksMinPill.classList.add('hidden-pill');
      }
      if (this.dom.containerMain) {
        this.dom.containerMain.classList.remove('tasks-open');
      }
    }
  }

  addNewTask(text) {
    const trimmed = text ? text.trim() : '';
    if (!trimmed) return;
    this.tasks.push({
      id: Date.now(),
      text: trimmed,
      done: false
    });
    this.saveData();
    this.renderTasks();
  }

  updateTaskCounters() {
    const uncompletedCount = this.tasks.filter((t) => !t.done).length;
    const totalCount = this.tasks.length;
    const badgeText = totalCount === 0 ? '0' : `${uncompletedCount}/${totalCount}`;

    if (this.dom.navTasksBadge) this.dom.navTasksBadge.textContent = uncompletedCount;
    if (this.dom.focusTaskCountBadge) this.dom.focusTaskCountBadge.textContent = badgeText;
    if (this.dom.focusTasksPillCount) this.dom.focusTasksPillCount.textContent = uncompletedCount;
  }

  renderTaskItemsHTML() {
    if (this.tasks.length === 0) {
      return `
        <div class="text-center py-6 text-white/30 text-xs">
          No tasks yet — jot down a small goal ✍️
        </div>
      `;
    }

    return this.tasks
      .map(
        (task) => `
        <div class="task-item flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 ${
          task.done ? 'opacity-40 line-through' : ''
        }" data-id="${task.id}">
          <label class="flex items-center gap-3 cursor-pointer flex-1 select-none min-w-0">
            <input type="checkbox" class="task-checkbox rounded border-white/20 bg-black/30 text-red-500 focus:ring-0" ${
              task.done ? 'checked' : ''
            }>
            <span class="text-sm font-medium text-white/90 truncate">${escapeHtml(task.text)}</span>
          </label>
          <button class="task-delete-btn text-white/30 hover:text-red-400 p-1 rounded transition-colors ml-2" title="Delete task">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      `
      )
      .join('');
  }

  bindTaskListEvents(container) {
    if (!container) return;
    container.querySelectorAll('.task-item').forEach((item) => {
      const id = parseInt(item.dataset.id, 10);
      const checkbox = item.querySelector('.task-checkbox');
      const deleteBtn = item.querySelector('.task-delete-btn');

      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const task = this.tasks.find((t) => t.id === id);
          if (task) {
            task.done = e.target.checked;
            this.saveData();
            this.renderTasks();
          }
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.tasks = this.tasks.filter((t) => t.id !== id);
          this.saveData();
          this.renderTasks();
        });
      }
    });
  }

  renderTasks() {
    this.updateTaskCounters();
    const html = this.renderTaskItemsHTML();

    if (this.dom.taskList) {
      this.dom.taskList.innerHTML = html;
      this.bindTaskListEvents(this.dom.taskList);
    }

    if (this.dom.focusTaskList) {
      this.dom.focusTaskList.innerHTML = html;
      this.bindTaskListEvents(this.dom.focusTaskList);
    }
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
