// Accessibility Controller for MediXR (A11y Features)
export class Accessibility {
  constructor(engine, voiceEngine) {
    this.engine = engine;
    this.voiceEngine = voiceEngine;
    
    this.largeTextActive = false;
    this.highContrastActive = false;

    // Configurable Keyboard Shortcuts
    this.defaultKeys = {
      toggleHeartbeat: 'b',
      toggleFlow: 'f',
      toggleSlice: 's',
      toggleControls: 'c',
      toggleAccessibility: 'h',
      resetScene: 'r',
      toggleVoice: 'v'
    };
    this.keys = { ...this.defaultKeys };
    this.rebindingAction = null; // tracks which action is currently listening for a new key
  }

  init() {
    this.loadCustomKeys();
    this.bindDOMEvents();
    this.bindKeyboardShortcuts();
    this.announceToScreenReader("MediXR application loaded. Ready for keyboard or voice navigation.");
  }

  loadCustomKeys() {
    try {
      const saved = localStorage.getItem('medixr_shortcuts');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(this.defaultKeys).forEach(action => {
          if (parsed[action]) {
            this.keys[action] = parsed[action];
          }
        });
      }
    } catch (e) {
      console.warn("Accessibility: Error loading custom key shortcuts from localStorage:", e);
    }
  }

  saveCustomKeys() {
    try {
      localStorage.setItem('medixr_shortcuts', JSON.stringify(this.keys));
    } catch (e) {
      console.warn("Accessibility: Error saving custom key shortcuts to localStorage:", e);
    }
  }

  bindDOMEvents() {
    const accessBtn = document.getElementById('btn-accessibility');
    const closeBtn = document.getElementById('btn-close-access');
    const modal = document.getElementById('modal-accessibility');

    // 1. Modal Visibility Toggles
    if (accessBtn && modal) {
      accessBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        // Set focus to modal header for screen readers
        modal.querySelector('h2').setAttribute('tabindex', '-1');
        modal.querySelector('h2').focus();
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (accessBtn) accessBtn.focus(); // return focus
      });
    }

    // Close on click outside modal content
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
          if (accessBtn) accessBtn.focus();
        }
      });
    }

    // 2. High Contrast Theme Switch
    const contrastSwitch = document.getElementById('switch-contrast');
    if (contrastSwitch) {
      contrastSwitch.addEventListener('change', (e) => {
        this.toggleHighContrast(e.target.checked);
      });
    }

    // 3. Large Typography Scale Switch
    const textSwitch = document.getElementById('switch-large-text');
    if (textSwitch) {
      textSwitch.addEventListener('change', (e) => {
        this.toggleLargeText(e.target.checked);
      });
    }

    // 4. Controls Guide Modal Visibility Toggles
    const guideBtn = document.getElementById('btn-controls-guide');
    const closeGuideBtn = document.getElementById('btn-close-controls');
    const guideModal = document.getElementById('modal-controls-guide');

    if (guideBtn && guideModal) {
      guideBtn.addEventListener('click', () => {
        guideModal.classList.remove('hidden');
        guideModal.querySelector('h2').setAttribute('tabindex', '-1');
        guideModal.querySelector('h2').focus();
        this.updateRebindUI();
      });
    }

    // Bind custom key rebinding buttons
    document.querySelectorAll('.rebind-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        this.rebindingAction = action;
        this.updateRebindUI();
      });
    });

    const resetKeysBtn = document.getElementById('btn-reset-keys');
    if (resetKeysBtn) {
      resetKeysBtn.addEventListener('click', () => {
        this.keys = { ...this.defaultKeys };
        this.saveCustomKeys();
        this.updateRebindUI();
        this.announceToScreenReader("Keyboard shortcuts reset to default.");
      });
    }

    // Bind Tab switching logic for Controls Guide modal
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetTab = btn.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => {
          if (content.id === targetTab) {
            content.classList.remove('hidden');
          } else {
            content.classList.add('hidden');
          }
        });
      });
    });

    if (closeGuideBtn && guideModal) {
      closeGuideBtn.addEventListener('click', () => {
        guideModal.classList.add('hidden');
        if (guideBtn) guideBtn.focus();
      });
    }

    if (guideModal) {
      guideModal.addEventListener('click', (e) => {
        if (e.target === guideModal) {
          guideModal.classList.add('hidden');
          if (guideBtn) guideBtn.focus();
        }
      });
    }
  }

  // Bind key inputs for A11y and visual helpers
  bindKeyboardShortcuts() {
    const anatomicalKeys = {
      '1': 'left_ventricle',
      '2': 'right_ventricle',
      '3': 'left_atrium',
      '4': 'right_atrium',
      '5': 'aorta',
      '6': 'pulmonary_artery',
      '7': 'vena_cava'
    };

    window.addEventListener('keydown', (e) => {
      // Rebinding mode intercept
      if (this.rebindingAction) {
        e.preventDefault();
        const action = this.rebindingAction;
        const newKey = e.key.toLowerCase();

        // Prevent binding to System keys like Escape or Tab
        if (newKey === 'escape' || newKey === 'tab') {
          this.rebindingAction = null;
          this.updateRebindUI();
          return;
        }

        // Rebind the key
        this.keys[action] = newKey;
        this.saveCustomKeys();
        this.rebindingAction = null;
        this.updateRebindUI();
        this.announceToScreenReader(`Rebound shortcut to ${newKey.toUpperCase()}`);
        return;
      }

      // Avoid hotkeys when typing in search bars or inputs
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      // Escape: clear selections, close modals
      if (key === 'escape') {
        this.engine.clearSelection();
        const modal = document.getElementById('modal-accessibility');
        if (modal) modal.classList.add('hidden');
        const guideModal = document.getElementById('modal-controls-guide');
        if (guideModal) guideModal.classList.add('hidden');
        return;
      }

      // Hotkey: reset
      if (key === this.keys.resetScene) {
        const resetBtn = document.getElementById('btn-reset-scene');
        if (resetBtn) resetBtn.click();
        this.announceToScreenReader("Scene reset.");
        return;
      }

      // Hotkey: heartbeat toggle
      if (key === this.keys.toggleHeartbeat) {
        const beatSwitch = document.getElementById('switch-beat');
        if (beatSwitch) {
          beatSwitch.click();
          this.announceToScreenReader(`Heartbeat animation ${beatSwitch.checked ? 'activated' : 'deactivated'}.`);
        }
        return;
      }

      // Hotkey: flow toggle
      if (key === this.keys.toggleFlow) {
        const flowSwitch = document.getElementById('switch-flow');
        if (flowSwitch) {
          flowSwitch.click();
          this.announceToScreenReader(`Blood flow visualization ${flowSwitch.checked ? 'activated' : 'deactivated'}.`);
        }
        return;
      }

      // Hotkey: controls guide toggle
      if (key === this.keys.toggleControls) {
        const guideBtn = document.getElementById('btn-controls-guide');
        if (guideBtn) {
          guideBtn.click();
        }
        return;
      }

      // Hotkey: cross-section toggle
      if (key === this.keys.toggleSlice) {
        const sectionSwitch = document.getElementById('switch-section');
        if (sectionSwitch) {
          sectionSwitch.click();
          this.announceToScreenReader(`Cross section cut ${sectionSwitch.checked ? 'activated' : 'deactivated'}.`);
        }
        return;
      }

      // Hotkey: Voice recording trigger
      if (key === this.keys.toggleVoice) {
        const micBtn = document.getElementById('btn-voice-toggle');
        if (micBtn) {
          micBtn.click();
        }
        return;
      }

      // Hotkey: Accessibility panel
      if (key === this.keys.toggleAccessibility) {
        const accessBtn = document.getElementById('btn-accessibility');
        if (accessBtn) accessBtn.click();
        return;
      }

      // Numeric keys 1-7: directly highlight chambers
      if (anatomicalKeys[key]) {
        const nameId = anatomicalKeys[key];
        this.engine.selectAnatomy(nameId);
        return;
      }
    });
  }

  // Toggle contrast layout styles
  toggleHighContrast(active) {
    this.highContrastActive = active;
    if (active) {
      document.body.classList.add('accessibility-high-contrast');
      this.announceToScreenReader("High contrast mode enabled.");
    } else {
      document.body.classList.remove('accessibility-high-contrast');
      this.announceToScreenReader("High contrast mode disabled.");
    }
  }

  // Toggle text enlargement variables
  toggleLargeText(active) {
    this.largeTextActive = active;
    if (active) {
      document.body.classList.add('accessibility-large-text');
      this.announceToScreenReader("Large text size enabled.");
    } else {
      document.body.classList.remove('accessibility-large-text');
      this.announceToScreenReader("Large text size disabled.");
    }
  }

  // Populates screen reader HUD for text-to-speech assistive readers
  announceToScreenReader(message) {
    const hud = document.getElementById('screen-reader-hud');
    if (hud) {
      hud.textContent = message;
    }
  }

  // Update visual text labels of custom key rebinding buttons
  updateRebindUI() {
    document.querySelectorAll('.rebind-btn').forEach(btn => {
      const action = btn.dataset.action;
      if (this.rebindingAction === action) {
        btn.textContent = '...';
        btn.classList.add('rebinding');
      } else if (this.keys[action]) {
        btn.textContent = this.keys[action].toUpperCase();
        btn.classList.remove('rebinding');
      }
    });
  }
}
export default Accessibility;
