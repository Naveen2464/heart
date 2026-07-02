// WebXR AR Session Manager for MediXR
export class ARManager {
  constructor(engine) {
    this.engine = engine;
    this.session = null;
    this.hitTestSource = null;
    this.hitTestSpace = null;
    
    // Reticle (placement ring) for showing detected planes
    this.reticle = null;
    this.isPlaced = false;
  }

  // Check if immersive AR is supported on the device
  async checkAvailability() {
    if (navigator.xr) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        const btn = document.getElementById('btn-ar');
        if (supported && btn) {
          btn.classList.remove('disabled');
          btn.removeAttribute('disabled');
          console.log("ARManager: Immersive AR is supported.");
        }
      } catch (err) {
        console.warn("ARManager: Error checking AR availability: ", err);
      }
    }
  }

  // Starts the WebXR AR Session
  async startSession() {
    if (!navigator.xr) return;
    
    this.isPlaced = false;
    
    try {
      this.session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.querySelector('.hud-layer') }
      });

      console.log("ARManager: WebXR AR session started.");
      this.engine.renderer.xr.setSession(this.session);
      
      // Configure scene adjustments for AR (hide background, shift scale)
      this.engine.scene.background = null;
      if (this.engine.heartGroup) {
        this.engine.heartGroup.visible = false; // hide until placed
        this.engine.heartGroup.scale.set(0.4, 0.4, 0.4); // shrink for desktop space
      }
      
      // Setup reticle indicator
      this.createReticle();
      
      // Request reference spaces
      const refSpace = await this.session.requestReferenceSpace('viewer');
      this.hitTestSource = await this.session.requestHitTestSource({ space: refSpace });
      
      this.session.requestReferenceSpace('local-floor').then((refSpaceFloor) => {
        this.hitTestSpace = refSpaceFloor;
      });

      // Handle screen tap/select to place model
      this.session.addEventListener('select', () => this.onPlaceHeart());
      
      // Listen for session end
      this.session.addEventListener('end', () => this.endSession());

      // Update UI state
      document.body.classList.add('xr-ar-active');
      
    } catch (error) {
      console.error("ARManager: Failed to start AR session: ", error);
      throw error;
    }
  }

  createReticle() {
    // A simple glowing ring to represent plane placement target
    const ringGeo = new THREE.RingGeometry(0.12, 0.15, 32);
    ringGeo.rotateX(-Math.PI / 2); // align horizontal with ground
    
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    this.reticle = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.engine.scene.add(this.reticle);
  }

  // Triggers when plane is clicked to place the heart
  onPlaceHeart() {
    if (this.reticle && this.reticle.visible && !this.isPlaced) {
      this.isPlaced = true;
      
      // Extract position from reticle matrix
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(this.reticle.matrix);
      
      if (this.engine.heartGroup) {
        this.engine.heartGroup.position.copy(position);
        this.engine.heartGroup.position.y += 0.3; // float slightly above target
        this.engine.heartGroup.visible = true;
        console.log("ARManager: Heart placed in physical environment at ", position);
      }
      
      // Remove reticle
      this.engine.scene.remove(this.reticle);
      this.reticle = null;
    }
  }

  // Monitors hit test markers inside Engine frame updates
  updateARFrame(frame) {
    if (!this.session || !this.hitTestSource || !this.reticle) return;
    
    // Retrieve reference space from renderer
    const refSpace = this.engine.renderer.xr.getReferenceSpace();
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);
    
    if (hitTestResults.length > 0 && !this.isPlaced) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(refSpace);
      
      this.reticle.visible = true;
      this.reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      this.reticle.visible = false;
    }
  }

  // Restore scene to 3D Viewer defaults
  endSession() {
    console.log("ARManager: AR Session ended.");
    this.session = null;
    
    if (this.reticle) {
      this.engine.scene.remove(this.reticle);
      this.reticle = null;
    }
    
    // Reset background and heart transforms
    this.engine.scene.background = new THREE.Color(0x050a12);
    if (this.engine.heartGroup) {
      this.engine.heartGroup.position.set(0, 0.2, 0);
      this.engine.heartGroup.scale.set(1.0, 1.0, 1.0);
      this.engine.heartGroup.visible = true;
    }
    
    document.body.classList.remove('xr-ar-active');
  }
}
