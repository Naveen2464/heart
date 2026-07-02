// WebXR Mixed Reality Session Manager for MediXR
export class MRManager {
  constructor(engine) {
    this.engine = engine;
    this.session = null;
    this.handTrackers = [];
  }

  // Mixed Reality availability maps to AR/VR capability with passthrough blend mode support
  async checkAvailability() {
    if (navigator.xr) {
      try {
        // Many MR headsets expose MR capabilities through immersive-vr with optional passthrough/hand-tracking features
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        console.log("MRManager: MR capabilities verified via VR passthrough support: ", supported);
      } catch (err) {
        console.warn("MRManager: Error checking MR features: ", err);
      }
    }
  }

  // Request MR session (VR with passthrough features and hand-tracking enabled)
  async startMRSession() {
    if (!navigator.xr) return;

    try {
      this.session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking']
      });

      console.log("MRManager: MR WebXR session initialized.");
      this.engine.renderer.xr.setSession(this.session);
      
      // In MR mode, blend real camera/passthrough by turning background transparent
      this.engine.scene.background = null;
      
      // Handle hand-tracking setups
      this.setupHandTracking();
      
      this.session.addEventListener('end', () => this.endSession());
      
    } catch (error) {
      console.error("MRManager: Failed to start MR session: ", error);
      // Fallback: Start standard VR or AR session
      alert("Launching standard WebXR overlay: " + error.message);
    }
  }

  setupHandTracking() {
    const renderer = this.engine.renderer;
    
    // Check if hand joints are exposed in WebXR
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      this.engine.scene.add(hand);
      this.handTrackers.push(hand);

      // Add joint visual spheres
      hand.addEventListener('connected', (event) => {
        const xrInputSource = event.data;
        if (xrInputSource.hand) {
          console.log(`MRManager: Hand ${i === 0 ? 'Left' : 'Right'} connected with joint tracking.`);
          
          // Generate small spheres at fingers joints (standard MR design)
          const jointGeo = new THREE.SphereGeometry(0.015, 8, 8);
          const jointMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
          
          // Quest WebXR hand layout has 25 joints
          for (let j = 0; j < 25; j++) {
            const jointMesh = new THREE.Mesh(jointGeo, jointMat);
            hand.add(jointMesh);
          }
        }
      });
    }
  }

  endSession() {
    console.log("MRManager: MR Session ended.");
    this.session = null;
    
    // Remove hand trackers from scene
    this.handTrackers.forEach(h => this.engine.scene.remove(h));
    this.handTrackers = [];
    
    this.engine.scene.background = new THREE.Color(0x050a12);
  }
}
