// WebXR VR Laboratory Session Manager for MediXR
export class VRManager {
  constructor(engine) {
    this.engine = engine;
    this.session = null;
    
    // VR specific environment objects
    this.vrEnvironment = null;
    this.controllers = [];
    this.controllerGrips = [];
  }

  // Check if immersive VR is supported on the device
  async checkAvailability() {
    if (navigator.xr) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        const btn = document.getElementById('btn-vr');
        if (supported && btn) {
          btn.classList.remove('disabled');
          btn.removeAttribute('disabled');
          console.log("VRManager: Immersive VR is supported.");
        }
      } catch (err) {
        console.warn("VRManager: Error checking VR availability: ", err);
      }
    }
  }

  // Start the VR session
  async startSession() {
    if (!navigator.xr) return;

    try {
      this.session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor']
      });

      console.log("VRManager: WebXR VR session started.");
      this.engine.renderer.xr.setSession(this.session);

      // Create futuristic virtual laboratory podium, floor grid
      this.buildVRLabEnvironment();
      this.setupControllers();

      // Reposition heart group on top of podium in front of the VR camera (0, 1.1, -1.2)
      if (this.engine.heartGroup) {
        this.engine.heartGroup.position.set(0, 1.1, -1.2);
        this.engine.heartGroup.scale.set(0.8, 0.8, 0.8);
      }
      
      // Position camera rig center (managed by WebXR session offset)
      
      this.session.addEventListener('end', () => this.endSession());
      document.body.classList.add('xr-vr-active');

    } catch (error) {
      console.error("VRManager: Failed to start VR session: ", error);
      throw error;
    }
  }

  buildVRLabEnvironment() {
    this.vrEnvironment = new THREE.Group();
    this.vrEnvironment.name = "vr_lab_environment";

    // 1. Futuristic Floor Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = 0.01;
    this.vrEnvironment.add(gridHelper);

    // 2. Circular platform base
    const platformGeo = new THREE.CylinderGeometry(4, 4.2, 0.1, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.05;
    this.vrEnvironment.add(platform);

    // 3. Heart Podium
    const podiumGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.8, 32);
    const podiumMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(0, 0.45, -1.2);
    podium.castShadow = true;
    podium.receiveShadow = true;
    this.vrEnvironment.add(podium);

    // Glowing holographic pedestal ring
    const ringGeo = new THREE.RingGeometry(0.33, 0.35, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide
    });
    const glowRing = new THREE.Mesh(ringGeo, ringMat);
    glowRing.position.set(0, 0.86, -1.2);
    this.vrEnvironment.add(glowRing);

    // 4. Background laboratory structural halos (sci-fi wall/cage feel)
    for (let i = 0; i < 3; i++) {
      const haloGeo = new THREE.TorusGeometry(8 + i * 2, 0.08, 16, 64);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x0066ff,
        transparent: true,
        opacity: 0.15 - i * 0.03
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, 4, -5);
      halo.rotation.y = Math.PI / 4 * i;
      this.vrEnvironment.add(halo);
    }

    this.engine.scene.add(this.vrEnvironment);
  }

  setupControllers() {
    const renderer = this.engine.renderer;
    
    // Laser pointer geometries
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const line = new THREE.Line(geometry);
    line.name = 'line';
    line.scale.z = 5; // length of laser ray
    
    const laserMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8
    });
    line.material = laserMaterial;

    // Controller listeners
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      controller.add(line.clone());
      
      // Raycast click triggers in VR
      controller.addEventListener('selectstart', () => this.onVRSelectStart(controller));
      
      this.engine.scene.add(controller);
      this.controllers.push(controller);

      // Model grips for hands
      const controllerGrip = renderer.xr.getControllerGrip(i);
      // Optional: attach standard models or loading cues
      this.engine.scene.add(controllerGrip);
      this.controllerGrips.push(controllerGrip);
    }
  }

  // VR click triggers raycasting along the laser pointer
  onVRSelectStart(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    this.engine.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.engine.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    if (this.engine.heartGroup) {
      const intersects = this.engine.raycaster.intersectObjects(this.engine.heartGroup.children, true);
      
      if (intersects.length > 0) {
        let mesh = intersects[0].object;
        while (mesh.parent && mesh.parent !== this.engine.heartGroup && mesh.parent.name !== 'heart_model') {
          mesh = mesh.parent;
        }
        
        const nameId = mesh.userData.nameId || mesh.name;
        this.engine.selectAnatomy(nameId);
      } else {
        // click empty air to clear selection
        this.engine.clearSelection();
      }
    }
  }

  // Restore scene to standard view
  endSession() {
    console.log("VRManager: VR Session ended.");
    this.session = null;
    
    // Remove environment
    if (this.vrEnvironment) {
      this.engine.scene.remove(this.vrEnvironment);
      this.vrEnvironment = null;
    }
    
    // Remove controllers
    this.controllers.forEach(c => this.engine.scene.remove(c));
    this.controllerGrips.forEach(g => this.engine.scene.remove(g));
    this.controllers = [];
    this.controllerGrips = [];

    // Reset heart positions
    if (this.engine.heartGroup) {
      this.engine.heartGroup.position.set(0, 0.2, 0);
      this.engine.heartGroup.scale.set(1.0, 1.0, 1.0);
    }
    
    document.body.classList.remove('xr-vr-active');
  }
}
