// HUD Panel Controller and Event Binder for MediXR
import { HeartData } from '../utils/HeartData.js';

export class UIController {
  constructor(engine, voiceEngine, arManager, vrManager) {
    this.engine = engine;
    this.voiceEngine = voiceEngine;
    this.arManager = arManager;
    this.vrManager = vrManager;

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

    // 6. Transparency Switch
    const transSwitch = document.getElementById('switch-transparency');
    if (transSwitch) {
      transSwitch.addEventListener('change', (e) => {
        this.engine.setTransparencyMode(e.target.checked);
      });
    }

    // 7. Exploded Switch
    const explodedSwitch = document.getElementById('switch-exploded');
    if (explodedSwitch) {
      explodedSwitch.addEventListener('change', (e) => {
        this.engine.setExplodedMode(e.target.checked);
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

    // 4. Disease select dropdown
    const diseaseSelect = document.getElementById('select-disease');
    if (diseaseSelect) {
      diseaseSelect.addEventListener('change', (e) => {
        this.engine.setDiseaseMode(e.target.value);
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
          rotSlider.value = 0.0;
          this.engine.setRotationSpeed(0.0);
          if (rotVal) rotVal.textContent = "0%";
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

        // Reset transparency and exploded switches
        const transSwitch = document.getElementById('switch-transparency');
        if (transSwitch) {
          transSwitch.checked = false;
          this.engine.setTransparencyMode(false);
        }

        const explodedSwitch = document.getElementById('switch-exploded');
        if (explodedSwitch) {
          explodedSwitch.checked = false;
          this.engine.setExplodedMode(false);
        }

        const diseaseSelect = document.getElementById('select-disease');
        if (diseaseSelect) {
          diseaseSelect.value = 'healthy';
          this.engine.setDiseaseMode('healthy');
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

    // Download Reference Diagram Button
    const downloadDiagramBtn = document.getElementById('btn-download-diagram');
    if (downloadDiagramBtn) {
      downloadDiagramBtn.addEventListener('click', () => {
        const imgEl = document.getElementById('info-image');
        if (imgEl && imgEl.src) {
          const link = document.createElement('a');
          const title = document.getElementById('info-title').textContent.toLowerCase().replace(/\s+/g, '_');
          link.download = `${title}_diagram.png`;
          link.href = imgEl.src;
          link.click();
        }
      });
    }

    // Download 3D Render Snapshot Button
    const downloadSnapshotBtn = document.getElementById('btn-download-snapshot');
    if (downloadSnapshotBtn) {
      downloadSnapshotBtn.addEventListener('click', () => {
        // Force rendering the scene immediately so WebGL's backbuffer contains active pixels
        this.engine.renderer.render(this.engine.scene, this.engine.camera);
        const dataUrl = this.engine.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        const title = document.getElementById('info-title').textContent.toLowerCase().replace(/\s+/g, '_');
        link.download = `${title}_3d_snapshot.png`;
        link.href = dataUrl;
        link.click();
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

      // Remove 'selected' class from all anatomy labels
      document.querySelectorAll('.heart-label-tag').forEach(el => el.classList.remove('selected'));

      if (!nameId) {
        // Clear card content
        if (placeholder) placeholder.classList.remove('hidden');
        if (details) details.classList.add('hidden');
        return;
      }

      const data = HeartData[nameId];
      if (!data) return;

      // Highlight the corresponding anatomy label tag
      const labelEl = document.getElementById(`label-tag-${nameId}`);
      if (labelEl) labelEl.classList.add('selected');

      // Populate Texts
      if (title) title.textContent = data.name;
      if (funcText) funcText.textContent = data.function;
      if (clinicalText) clinicalText.textContent = data.clinical;
      if (explanationText) explanationText.textContent = data.explanation;

      // Set anatomical reference image src
      const imgEl = document.getElementById('info-image');
      if (imgEl) {
        let imageSrc = '';
        if (nameId === 'aorta') {
          imageSrc = 'assets/images/aorta.png';
        } else if (nameId === 'pulmonary_artery') {
          imageSrc = 'assets/images/pulmonary_artery.png';
        } else if (nameId === 'vena_cava') {
          imageSrc = 'assets/images/vena_cava.png';
        } else if (nameId === 'left_ventricle' || nameId === 'right_ventricle') {
          imageSrc = 'assets/images/ventricle.png';
        } else if (nameId === 'left_atrium' || nameId === 'right_atrium') {
          imageSrc = 'assets/images/atrium.png';
        } else {
          imageSrc = 'assets/images/ventricle.png'; // default fallback
        }
        imgEl.src = imageSrc;
      }

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

      // Automatically speak the medical details when selected in any mode (desktop, AR, VR)
      const textToSpeak = `${data.name}. Function: ${data.function}. Clinical Importance: ${data.clinical}`;
      if (readBtn) readBtn.classList.add('active');
      this.voiceEngine.speak(textToSpeak, () => {
        if (readBtn) readBtn.classList.remove('active');
      });

      // Accessibility notification
      const srHud = document.getElementById('screen-reader-hud');
      if (srHud) {
        srHud.textContent = `Selected: ${data.name}. Function: ${data.function}.`;
      }
    };
  }

  // Helper to coordinate: Exit Current Mode -> Dispose Session -> Clear Prev Environment -> Reset UI -> Load Selected -> Create New Environment
  async transitionToMode(targetMode, startSessionFn) {
    console.log(`UIController: Transitioning to mode: ${targetMode}`);

    // 1. Exit current session if presenting (Exit Current Mode & Dispose Previous XR Session)
    if (this.engine.renderer.xr.isPresenting) {
      const session = this.engine.renderer.xr.getSession();
      if (session) {
        // Wait for session to end completely before proceeding
        await new Promise((resolve) => {
          const onSessionEnd = () => {
            this.engine.renderer.xr.removeEventListener('sessionend', onSessionEnd);
            // Wait slightly for browser/Three.js state cleanup
            setTimeout(resolve, 150);
          };
          this.engine.renderer.xr.addEventListener('sessionend', onSessionEnd);
          session.end();
        });
      }
    }

    // 2. Load the target mode (which triggers setAppMode to Clear Previous and Load Selected)
    this.engine.setAppMode(targetMode);

    // 3. Request the new session or run simulated environment (Create New Environment)
    if (startSessionFn && navigator.xr) {
      try {
        await startSessionFn();
      } catch (err) {
        console.warn(`WebXR session request failed for ${targetMode}, falling back to simulation:`, err);
        this.engine.setAppMode(targetMode);
      }
    }
  }

  // Wires WebXR start buttons
  bindXRSessionTriggers() {
    const btnAr = document.getElementById('btn-ar');
    const btnVr = document.getElementById('btn-vr');

    const updateActiveButton = (activeBtn) => {
      [btnAr, btnVr].forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (btnAr) {
      btnAr.addEventListener('click', () => {
        if (this.engine.appMode === 'ar') {
          updateActiveButton(null);
          this.transitionToMode('desktop', null);
        } else {
          updateActiveButton(btnAr);
          this.transitionToMode('ar', () => this.arManager.startSession());
        }
      });
    }

    if (btnVr) {
      btnVr.addEventListener('click', () => {
        if (this.engine.appMode === 'vr') {
          updateActiveButton(null);
          this.transitionToMode('desktop', null);
        } else {
          updateActiveButton(btnVr);
          this.transitionToMode('vr', () => this.vrManager.startSession());
        }
      });
    }
  }
}
