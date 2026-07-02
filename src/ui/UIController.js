// HUD Panel Controller and Event Binder for MediXR
import { HeartData } from '../utils/HeartData.js';

export class UIController {
  constructor(engine, voiceEngine, arManager, vrManager, mrManager) {
    this.engine = engine;
    this.voiceEngine = voiceEngine;
    this.arManager = arManager;
    this.vrManager = vrManager;
    this.mrManager = mrManager;
    
    this.activeMobileTab = 'viewer';
  }

  bindUI() {
    this.bindSimulationToggles();
    this.bindRangeSliders();
    this.bindActionButtons();
    this.bindVoiceOverlay();
    this.bindMobileNavigation();
    this.bindSelectionCallback();
    this.bindXRSessionTriggers();
  }

  // Bind side control panel switches
  bindSimulationToggles() {
    // 1. Heartbeat Switch
    const beatSwitch = document.getElementById('switch-beat');
    if (beatSwitch) {
      beatSwitch.addEventListener('change', (e) => {
        this.engine.setHeartbeatEnabled(e.target.checked);
      });
    }

    // 2. Blood Flow Switch
    const flowSwitch = document.getElementById('switch-flow');
    if (flowSwitch) {
      flowSwitch.addEventListener('change', (e) => {
        this.engine.setBloodFlowEnabled(e.target.checked);
      });
    }

    // 3. Cross-Section (Clipping) Switch
    const sectionSwitch = document.getElementById('switch-section');
    const sliceSlider = document.getElementById('slider-slice-pos');
    if (sectionSwitch) {
      sectionSwitch.addEventListener('change', (e) => {
        const checked = e.target.checked;
        this.engine.setCrossSectionEnabled(checked);
        if (sliceSlider) {
          sliceSlider.disabled = !checked;
        }
      });
    }

    // 4. Labels Switch
    const labelsSwitch = document.getElementById('switch-labels');
    if (labelsSwitch) {
      labelsSwitch.addEventListener('change', (e) => {
        this.engine.setLabelsEnabled(e.target.checked);
      });
    }

    // 5. View Mode Switch (Skeleton vs Focused Heart Only)
    const viewModeSwitch = document.getElementById('switch-view-mode');
    if (viewModeSwitch) {
      viewModeSwitch.addEventListener('change', (e) => {
        const mode = e.target.checked ? 'focused' : 'skeleton';
        this.engine.setVisualizerMode(mode);
      });
    }
  }

  // Bind side control panel range inputs
  bindRangeSliders() {
    // 1. Auto-rotation speed
    const rotSlider = document.getElementById('slider-rotation-speed');
    const rotVal = document.getElementById('rotation-speed-val');
    if (rotSlider) {
      rotSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        this.engine.setRotationSpeed(val);
        if (rotVal) rotVal.textContent = `${Math.round(val * 100)}%`;
      });
    }

    // 2. Pulse rate (BPM)
    const bpmSlider = document.getElementById('slider-pulse-rate');
    const bpmVal = document.getElementById('pulse-rate-val');
    if (bpmSlider) {
      bpmSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        this.engine.setPulseRate(val);
        if (bpmVal) bpmVal.textContent = `${val} BPM`;
      });
    }

    // 3. Slicing position
    const sliceSlider = document.getElementById('slider-slice-pos');
    const sliceVal = document.getElementById('slice-pos-val');
    if (sliceSlider) {
      sliceSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        this.engine.setSliceDepth(val);
        if (sliceVal) sliceVal.textContent = parseFloat(val).toFixed(2);
      });
    }
  }

  // Bind reset, text-to-speech, and modal triggers
  bindActionButtons() {
    // Reset Space
    const resetBtn = document.getElementById('btn-reset-scene');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.engine.resetScene();
        // Restore sliders visual values
        const rotSlider = document.getElementById('slider-rotation-speed');
        const rotVal = document.getElementById('rotation-speed-val');
        if (rotSlider) {
          rotSlider.value = 0.05;
          this.engine.setRotationSpeed(0.05);
          if (rotVal) rotVal.textContent = "5%";
        }

        const bpmSlider = document.getElementById('slider-pulse-rate');
        const bpmVal = document.getElementById('pulse-rate-val');
        if (bpmSlider) {
          bpmSlider.value = 72;
          this.engine.setPulseRate(72);
          if (bpmVal) bpmVal.textContent = "72 BPM";
        }
        
        const sectionSwitch = document.getElementById('switch-section');
        const sliceSlider = document.getElementById('slider-slice-pos');
        if (sectionSwitch && sliceSlider) {
          sectionSwitch.checked = false;
          sliceSlider.disabled = true;
          this.engine.setCrossSectionEnabled(false);
        }
      });
    }

    // Read Description out loud (TTS)
    const readBtn = document.getElementById('btn-read-info');
    if (readBtn) {
      readBtn.addEventListener('click', () => {
        if (this.voiceEngine.speechActive) {
          this.voiceEngine.stopSpeaking();
          readBtn.classList.remove('active');
        } else {
          const title = document.getElementById('info-title').textContent;
          const func = document.getElementById('info-function').textContent;
          const clinical = document.getElementById('info-clinical').textContent;
          const textToSpeak = `${title}. Function: ${func}. Clinical Importance: ${clinical}`;
          
          readBtn.classList.add('active');
          this.voiceEngine.speak(textToSpeak, () => {
            readBtn.classList.remove('active');
          });
        }
      });
    }
  }

  // Wires Voice Overlay microphone triggering
  bindVoiceOverlay() {
    const micBtn = document.getElementById('btn-voice-toggle');
    const overlay = document.getElementById('voice-overlay');
    const status = document.getElementById('voice-status');
    const transcript = document.getElementById('voice-transcript');

    if (!micBtn || !overlay) return;

    micBtn.addEventListener('click', () => {
      if (this.voiceEngine.isListening) {
        this.voiceEngine.stopListening();
      } else {
        this.voiceEngine.startListening();
      }
    });

    // Wire Speech start animations
    this.voiceEngine.onSpeechStart = () => {
      micBtn.classList.add('listening');
      overlay.classList.remove('hidden');
      if (status) status.textContent = "Listening for medical commands...";
      if (transcript) transcript.textContent = 'Say a command, e.g. "Highlight Left Ventricle"';
    };

    // Wire speech result callback
    this.voiceEngine.onResult = (text) => {
      if (transcript) transcript.textContent = `"${text}"`;
    };

    // Close overlays when speech ends
    this.voiceEngine.onSpeechEnd = () => {
      micBtn.classList.remove('listening');
      // Hide card after short delay so user can read final transcript
      setTimeout(() => {
        if (!this.voiceEngine.isListening) {
          overlay.classList.add('hidden');
        }
      }, 1500);
    };

    // Connect voice commands back to the 3D scene inputs
    this.voiceEngine.onCommand = (cmd) => {
      console.log("UIController: Executing voice command: ", cmd);
      
      switch (cmd.type) {
        case 'RESET':
          this.engine.resetScene();
          break;
        case 'SCALE':
          if (this.engine.heartGroup) {
            const current = this.engine.heartGroup.scale.x;
            const factor = cmd.value === 'UP' ? 1.25 : 0.8;
            this.engine.heartGroup.scale.setScalar(Math.min(Math.max(current * factor, 0.2), 3.0));
          }
          break;
        case 'ROTATE':
          const rotSlider = document.getElementById('slider-rotation-speed');
          const rotVal = document.getElementById('rotation-speed-val');
          const val = cmd.value === 'ON' ? 0.05 : 0.0;
          this.engine.setRotationSpeed(val);
          if (rotSlider) rotSlider.value = val;
          if (rotVal) rotVal.textContent = cmd.value === 'ON' ? '5%' : '0%';
          break;
        case 'BLOOD_FLOW':
          const flowSwitch = document.getElementById('switch-flow');
          if (flowSwitch) flowSwitch.checked = cmd.value;
          this.engine.setBloodFlowEnabled(cmd.value);
          break;
        case 'CROSS_SECTION':
          const sectSwitch = document.getElementById('switch-section');
          const slSlider = document.getElementById('slider-slice-pos');
          if (sectSwitch) sectSwitch.checked = cmd.value;
          if (slSlider) slSlider.disabled = !cmd.value;
          this.engine.setCrossSectionEnabled(cmd.value);
          break;
        case 'HIGHLIGHT':
          this.engine.selectAnatomy(cmd.value);
          break;
        case 'SPEAK_INFO':
          const speakBtn = document.getElementById('btn-read-info');
          if (speakBtn) speakBtn.click();
          break;
      }
    };
  }

  // Wires Mobile screen tab bar selections
  bindMobileNavigation() {
    const navViewer = document.getElementById('nav-viewer');
    const navInfo = document.getElementById('nav-info');
    const navControls = document.getElementById('nav-controls');
    
    const body = document.body;

    const clearMobileClasses = () => {
      body.classList.remove('mobile-show-left', 'mobile-show-right');
      [navViewer, navInfo, navControls].forEach(el => {
        if (el) el.classList.remove('active');
      });
    };

    if (navViewer) {
      navViewer.addEventListener('click', () => {
        clearMobileClasses();
        navViewer.classList.add('active');
        this.activeMobileTab = 'viewer';
      });
    }

    if (navInfo) {
      navInfo.addEventListener('click', () => {
        clearMobileClasses();
        navInfo.classList.add('active');
        body.classList.add('mobile-show-right');
        this.activeMobileTab = 'info';
        
        // ensure sidebar is visible
        document.getElementById('panel-right').classList.remove('collapsed');
      });
    }

    if (navControls) {
      navControls.addEventListener('click', () => {
        clearMobileClasses();
        navControls.classList.add('active');
        body.classList.add('mobile-show-left');
        this.activeMobileTab = 'controls';
        
        // ensure sidebar is visible
        document.getElementById('panel-left').classList.remove('collapsed');
      });
    }
  }

  // Wires 3D selection events to fill details in panel cards
  bindSelectionCallback() {
    const placeholder = document.getElementById('selection-placeholder');
    const details = document.getElementById('info-details');
    const title = document.getElementById('info-title');
    const funcText = document.getElementById('info-function');
    const clinicalText = document.getElementById('info-clinical');
    const explanationText = document.getElementById('info-explanation');

    const rightPanel = document.getElementById('panel-right');

    this.engine.onSelectionChanged = (nameId) => {
      // If voice speaking is active, cancel it immediately when changing selection
      this.voiceEngine.stopSpeaking();
      
      const readBtn = document.getElementById('btn-read-info');
      if (readBtn) readBtn.classList.remove('active');

      if (!nameId) {
        // Clear card content
        if (placeholder) placeholder.classList.remove('hidden');
        if (details) details.classList.add('hidden');
        return;
      }

      const data = HeartData[nameId];
      if (!data) return;

      // Populate Texts
      if (title) title.textContent = data.name;
      if (funcText) funcText.textContent = data.function;
      if (clinicalText) clinicalText.textContent = data.clinical;
      if (explanationText) explanationText.textContent = data.explanation;

      // Swap Visibility
      if (placeholder) placeholder.classList.add('hidden');
      if (details) details.classList.remove('hidden');

      // Expand sidebar panel on desktop/tablets when selection triggers
      if (rightPanel && rightPanel.classList.contains('collapsed') && window.innerWidth >= 768) {
        rightPanel.classList.remove('collapsed');
      }

      // In Mobile, automatically switch to the "Heart Info" tab if screen tap selects a part
      if (window.innerWidth < 768 && this.activeMobileTab !== 'info') {
        const navInfo = document.getElementById('nav-info');
        if (navInfo) navInfo.click();
      }

      // Automatically speak the medical details if in simulated AR/VR/XR modes
      if (this.engine.appMode !== 'desktop') {
        const textToSpeak = `${data.name}. Function: ${data.function}. Clinical Importance: ${data.clinical}`;
        if (readBtn) readBtn.classList.add('active');
        this.voiceEngine.speak(textToSpeak, () => {
          if (readBtn) readBtn.classList.remove('active');
        });
      }

      // Accessibility notification
      const srHud = document.getElementById('screen-reader-hud');
      if (srHud) {
        srHud.textContent = `Selected: ${data.name}. Function: ${data.function}.`;
      }
    };
  }

  // Wires WebXR start buttons
  bindXRSessionTriggers() {
    const btnAr = document.getElementById('btn-ar');
    const btnVr = document.getElementById('btn-vr');
    const btnMr = document.getElementById('btn-mr');
    const btnDesktop = document.getElementById('btn-desktop');
    const btnXr = document.getElementById('btn-xr');

    const updateActiveButton = (activeBtn) => {
      [btnDesktop, btnAr, btnVr, btnMr, btnXr].forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (btnAr) {
      btnAr.addEventListener('click', async () => {
        updateActiveButton(btnAr);
        if (!navigator.xr) {
          this.engine.setAppMode('ar');
          return;
        }
        try {
          await this.arManager.startSession();
        } catch (err) {
          console.warn("WebXR AR session failed, falling back to desktop AR simulation:", err);
          this.engine.setAppMode('ar');
        }
      });
    }

    if (btnVr) {
      btnVr.addEventListener('click', async () => {
        updateActiveButton(btnVr);
        if (!navigator.xr) {
          this.engine.setAppMode('vr');
          return;
        }
        try {
          await this.vrManager.startSession();
        } catch (err) {
          console.warn("WebXR VR session failed, falling back to desktop VR simulation:", err);
          this.engine.setAppMode('vr');
        }
      });
    }

    if (btnMr) {
      btnMr.addEventListener('click', async () => {
        updateActiveButton(btnMr);
        this.engine.setAppMode('mr');
        if (!navigator.xr) {
          return;
        }
        try {
          await this.mrManager.startMRSession();
        } catch (err) {
          console.warn("WebXR MR session failed, falling back to desktop MR simulation:", err);
          this.engine.setAppMode('mr');
        }
      });
    }

    if (btnDesktop) {
      btnDesktop.addEventListener('click', () => {
        updateActiveButton(btnDesktop);
        // Exits active XR session
        if (this.engine.renderer.xr.isPresenting) {
          const session = this.engine.renderer.xr.getSession();
          if (session) session.end();
        }
        this.engine.setAppMode('desktop');
      });
    }

    if (btnXr) {
      btnXr.addEventListener('click', async () => {
        updateActiveButton(btnXr);
        if (navigator.xr) {
          try {
            const isVR = await navigator.xr.isSessionSupported('immersive-vr');
            if (isVR) {
              await this.vrManager.startSession();
              return;
            }
            const isAR = await navigator.xr.isSessionSupported('immersive-ar');
            if (isAR) {
              await this.arManager.startSession();
              return;
            }
          } catch (e) {
            console.warn("Auto XR checking failed:", e);
          }
        }
        // Fallback simulated Auto XR
        this.engine.setAppMode('xr');
      });
    }
  }
}
