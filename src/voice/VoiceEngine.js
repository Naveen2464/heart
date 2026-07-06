// Voice Recognition and Speech Synthesis Engine for MediXR
export class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.speechActive = false;
    this.syntheticVoice = null;
    this.currentUtterance = null; // Stored to prevent garbage collection
    this.speakTimeout = null; // Stored to queue speak after cancel
    
    // Callbacks to UI
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onResult = null;
    this.onCommand = null;
    this.onError = null;
    
    this.initRecognition();
    this.initSynthesis();
  }

  // Initialize Speech Recognition
  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("VoiceEngine: Web Speech Recognition API is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log("VoiceEngine: Listening started");
      if (this.onSpeechStart) this.onSpeechStart();
    };

    this.recognition.onerror = (event) => {
      console.error("VoiceEngine recognition error: ", event.error);
      // 'no-speech' and 'aborted' are non-fatal — auto-restart
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Will auto-restart via onend handler
        return;
      }
      if (this.onError) this.onError(event.error);
      this.isListening = false;
      this._wantsListening = false;
      if (this.onSpeechEnd) this.onSpeechEnd();
    };

    this.recognition.onend = () => {
      console.log("VoiceEngine: Recognition ended. wantsListening:", this._wantsListening);
      this.isListening = false;
      // Auto-restart if user still wants to listen
      if (this._wantsListening) {
        try {
          setTimeout(() => {
            if (this._wantsListening) {
              this.recognition.start();
            }
          }, 300);
        } catch (e) {
          console.warn("VoiceEngine: Failed to auto-restart:", e);
        }
        return;
      }
      if (this.onSpeechEnd) this.onSpeechEnd();
    };

    this.recognition.onresult = (event) => {
      // Get the latest result
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim().toLowerCase();
      
      if (this.onResult) this.onResult(transcript);
      
      // Only parse commands on final (non-interim) results
      if (lastResult.isFinal) {
        console.log(`VoiceEngine: Final transcript: "${transcript}"`);
        this.parseCommand(transcript);
      }
    };
  }

  // Initialize Speech Synthesis
  initSynthesis() {
    if (!window.speechSynthesis) {
      console.warn("VoiceEngine: Speech Synthesis API is not supported in this browser.");
      return;
    }

    // Attempt to load standard pleasant voices (optional)
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Look for a pleasant English voice (Google US English, Microsoft David, etc.)
      this.syntheticVoice = voices.find(v => 
        (v.lang.startsWith('en') && v.name.includes('Google')) || 
        (v.lang.startsWith('en') && v.name.includes('Natural')) ||
        (v.lang.startsWith('en') && v.name.includes('Male'))
      ) || voices.find(v => v.lang.startsWith('en')) || null;
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  startListening() {
    if (!this.recognition) {
      if (this.onError) this.onError("Speech API not supported");
      return;
    }
    
    // Stop any active speech before listening to avoid echo interference
    this.stopSpeaking();
    
    this._wantsListening = true;
    
    try {
      this.recognition.start();
    } catch (e) {
      console.warn("VoiceEngine: Recognition already active or failed to start: ", e);
    }
  }

  stopListening() {
    this._wantsListening = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Speaks out descriptions of selected items
  speak(text, onEndCallback = null) {
    if (!window.speechSynthesis) return;

    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }

    this.stopSpeaking();

    const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    const performSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance; // Prevent garbage collection

      if (this.syntheticVoice) {
        utterance.voice = this.syntheticVoice;
      }
      
      // Adjust speech rate & pitch for medical professional tone
      utterance.rate = 0.95; 
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.speechActive = true;
      };

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.speechActive = false;
          this.currentUtterance = null;
        }
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = (err) => {
        if (err.error !== 'interrupted') {
          console.error("Speech Synthesis error: ", err);
        }
        if (this.currentUtterance === utterance) {
          this.speechActive = false;
          this.currentUtterance = null;
        }
        if (onEndCallback) onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    };

    if (isMobile) {
      performSpeak();
    } else {
      this.speakTimeout = setTimeout(performSpeak, 150);
    }
  }

  stopSpeaking() {
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.speechActive = false;
      this.currentUtterance = null;
    }
  }

  // Parse voice text into actionable command parameters
  parseCommand(text) {
    if (!this.onCommand) return;

    // Command: Reset Scene
    if (text.includes('reset') || text.includes('restore') || text.includes('recenter')) {
      this.onCommand({ type: 'RESET' });
      this.speak("Scene reset complete.");
      return;
    }

    // Command: Zoom / Size modification
    if (text.includes('increase size') || text.includes('zoom in') || text.includes('scale up') || text.includes('make bigger')) {
      this.onCommand({ type: 'SCALE', value: 'UP' });
      this.speak("Scaling up heart model.");
      return;
    }
    if (text.includes('decrease size') || text.includes('zoom out') || text.includes('scale down') || text.includes('make smaller')) {
      this.onCommand({ type: 'SCALE', value: 'DOWN' });
      this.speak("Scaling down heart model.");
      return;
    }

    // Command: Rotation controls
    if (text.includes('rotate heart') || text.includes('spin heart') || text.includes('start rotation') || text.includes('turn on rotation')) {
      this.onCommand({ type: 'ROTATE', value: 'ON' });
      this.speak("Enabling auto rotation.");
      return;
    }
    if (text.includes('stop rotation') || text.includes('turn off rotation') || text.includes('freeze')) {
      this.onCommand({ type: 'ROTATE', value: 'OFF' });
      this.speak("Auto rotation stopped.");
      return;
    }

    // Command: Blood flow particles toggle
    if (text.includes('show blood flow') || text.includes('start blood flow') || text.includes('enable blood flow')) {
      this.onCommand({ type: 'BLOOD_FLOW', value: true });
      this.speak("Displaying blood flow particle streams.");
      return;
    }
    if (text.includes('hide blood flow') || text.includes('stop blood flow') || text.includes('disable blood flow')) {
      this.onCommand({ type: 'BLOOD_FLOW', value: false });
      this.speak("Hiding blood flow.");
      return;
    }

    // Command: Cross Section Slicing
    if (text.includes('show cross section') || text.includes('slice heart') || text.includes('enable cross section')) {
      this.onCommand({ type: 'CROSS_SECTION', value: true });
      this.speak("Cross-section active. Displaying inner chambers.");
      return;
    }
    if (text.includes('hide cross section') || text.includes('unslice heart') || text.includes('disable cross section')) {
      this.onCommand({ type: 'CROSS_SECTION', value: false });
      this.speak("Cross-section deactivated.");
      return;
    }

    // Command: Read information details
    if (text.includes('explain heart') || text.includes('read info') || text.includes('read details') || text.includes('read explanation')) {
      this.onCommand({ type: 'SPEAK_INFO' });
      return;
    }

    // Command: Anatomical Highlights
    if (text.includes('left ventricle') || text.includes('highlight left ventricle')) {
      this.onCommand({ type: 'HIGHLIGHT', value: 'left_ventricle' });
      this.speak("Highlighting Left Ventricle.");
      return;
    }
    if (text.includes('right ventricle') || text.includes('highlight right ventricle')) {
      this.onCommand({ type: 'HIGHLIGHT', value: 'right_ventricle' });
      this.speak("Highlighting Right Ventricle.");
      return;
    }
    if (text.includes('left atrium') || text.includes('highlight left atrium')) {
      this.onCommand({ type: 'HIGHLIGHT', value: 'left_atrium' });
      this.speak("Highlighting Left Atrium.");
      return;
    }
    if (text.includes('right atrium') || text.includes('highlight right atrium')) {
      this.onCommand({ type: 'HIGHLIGHT', value: 'right_atrium' });
      this.speak("Highlighting Right Atrium.");
      return;
    }
    if (text.includes('aorta') || text.includes('highlight aorta')) {
      this.onCommand({ type: 'HIGHLIGHT', value: 'aorta' });
      this.speak("Highlighting Aorta.");
      return;
    }
    if (text.includes('pulmonary artery') || text.includes('highlight pulmonary artery')) {
      this.onCommand({ type: 'HIGHLIGHT', value: 'pulmonary_artery' });
      this.speak("Highlighting Pulmonary Artery.");
      return;
    }
    if (text.includes('vena cava') || text.includes('highlight vena cava') || text.includes('superior vena cava')) {
      this.onCommand({ type: 'HIGHLIGHT', value: 'vena_cava' });
      this.speak("Highlighting Vena Cava.");
      return;
    }

    // Unrecognized Command feedback
    this.speak("Command not recognized. Please check the voice command list.");
  }
}
export default VoiceEngine;
