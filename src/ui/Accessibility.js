// Accessibility Controller for MediXR (A11y Features)
export class Accessibility {
  constructor(engine, voiceEngine) {
    this.engine = engine;
    this.voiceEngine = voiceEngine;
    
    this.largeTextActive = false;
    this.highContrastActive = false;
  }

  init() {
    this.bindDOMEvents();
    this.bindKeyboardShortcuts();
    this.announceToScreenReader("MediXR application loaded. Ready for keyboard or voice navigation.");
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
        return;
      }

      // Hotkey: reset
      if (key === 'r') {
        const resetBtn = document.getElementById('btn-reset-scene');
        if (resetBtn) resetBtn.click();
        this.announceToScreenReader("Scene reset.");
        return;
      }

      // Hotkey: heartbeat toggle
      if (key === 'b') {
        const beatSwitch = document.getElementById('switch-beat');
        if (beatSwitch) {
          beatSwitch.click();
          this.announceToScreenReader(`Heartbeat animation ${beatSwitch.checked ? 'activated' : 'deactivated'}.`);
        }
        return;
      }

      // Hotkey: flow toggle
      if (key === 'f') {
        const flowSwitch = document.getElementById('switch-flow');
        if (flowSwitch) {
          flowSwitch.click();
          this.announceToScreenReader(`Blood flow visualization ${flowSwitch.checked ? 'activated' : 'deactivated'}.`);
        }
        return;
      }

      // Hotkey: cross-section toggle
      if (key === 'c') {
        const sectionSwitch = document.getElementById('switch-section');
        if (sectionSwitch) {
          sectionSwitch.click();
          this.announceToScreenReader(`Cross section cut ${sectionSwitch.checked ? 'activated' : 'deactivated'}.`);
        }
        return;
      }

      // Hotkey: Voice recording trigger
      if (key === 'v') {
        const micBtn = document.getElementById('btn-voice-toggle');
        if (micBtn) {
          micBtn.click();
        }
        return;
      }

      // Hotkey: Accessibility panel
      if (key === 'h') {
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
}
export default Accessibility;
