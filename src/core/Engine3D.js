// Three.js 3D Rendering Engine for MediXR
import { ModelLoader } from './ModelLoader.js';
import { createHeartMaterials, highlightMaterial, createBloodFlowParticles, updateBloodFlowParticles } from '../utils/ShaderMaterials.js';
import { HeartData } from '../utils/HeartData.js';

export class Engine3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Simulation state variables
    this.rotationSpeed = 0.0;
    this.bpm = 72;
    this.isBeating = true;
    this.isFlowing = true;
    this.isCrossSection = false;
    this.showLabels = true;
    this.sliceDepth = 0.0;

    // Animation timers
    this.clock = new THREE.Clock();
    this.beatTimer = 0;

    // Selection and interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredMesh = null;
    this.selectedMesh = null;
    this.onSelectionChanged = null; // callback to UI

    this.skeletonGroup = null;
    this.heartGroup = null;
    this.particles = null;
    this.visualizerMode = 'skeleton'; // 'skeleton' or 'focused'
    this.appMode = 'desktop'; // 'desktop', 'ar', 'vr', 'mr', 'xr'
    this.arSimGroup = null;
    this.vrSimGroup = null;
    this.mrSimGroup = null;
    this.simulatedHands = null;
    this.leftSimHand = null;
    this.rightSimHand = null;
    this.simHandJoints = [];
    this.arScanPlane = null;
    this.podiumMat = null;
    this.rimRing = null;

    // Clipping plane for cross sections
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100.0);
    this.materials = null;

    // Label anchors for projection
    this.labelAnchors = {
      left_ventricle: new THREE.Vector3(-0.7, -0.6, 0.4),
      right_ventricle: new THREE.Vector3(0.7, -0.4, 0.4),
      left_atrium: new THREE.Vector3(-0.6, 0.7, -0.1),
      right_atrium: new THREE.Vector3(0.65, 0.6, 0.15),
      aorta: new THREE.Vector3(-0.4, 2.1, -0.1),
      pulmonary_artery: new THREE.Vector3(0.15, 1.25, 0.45),
      vena_cava: new THREE.Vector3(0.8, 1.5, -0.2)
    };
    this.labelElements = {};
  }

  init() {
    this.setupScene();
    this.setupLights();
    this.setupControls();
    this.setupMaterials();
    this.setupBloodFlow();
    this.setupSimulatedEnvironments();
    this.loadModels();
    this.setupLabels();
    this.setupEvents();

    // Start animation loop
    this.renderer.setAnimationLoop(() => this.animate());
  }

  setupScene() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a12);
    this.scene.fog = new THREE.FogExp2(0x050a12, 0.12);

    // 2. Camera
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      100
    );
    this.camera.position.set(0, 1.2, 5.5);

    // 3. Renderer with WebXR and Clipping support
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enable WebXR support
    this.renderer.xr.enabled = true;

    // Enable local clipping plane
    this.renderer.localClippingEnabled = true;

    // Append canvas
    this.container.appendChild(this.renderer.domElement);
  }

  setupLights() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Hemisphere Light (sky/ground color contrast)
    const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x003366, 0.3);
    hemiLight.position.set(0, 10, 0);
    this.scene.add(hemiLight);

    // Directional Key Light (casting soft shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // Cyan Fill Light (adds biological/sci-fi glow)
    const fillLight = new THREE.PointLight(0x00f0ff, 0.8, 12);
    fillLight.position.set(-4, 2, -2);
    this.scene.add(fillLight);

    // Blue back Light
    const backLight = new THREE.PointLight(0x0066ff, 1.2, 10);
    backLight.position.set(2, -2, -3);
    this.scene.add(backLight);
  }

  setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 15.0;
    this.controls.maxPolarAngle = Math.PI / 1.8; // prevent going too far below floor

    // Initial target at chest level of skeleton
    this.controls.target.set(0, 1.0, 0);
  }

  setupMaterials() {
    // Create central physical materials sharing our clipping plane
    this.materials = createHeartMaterials(this.clippingPlane);
  }

  setupBloodFlow() {
    // Create the particle system
    this.particles = createBloodFlowParticles();
    this.scene.add(this.particles);
    this.particles.visible = this.isFlowing;
  }

  setupSimulatedEnvironments() {
    // 1. AR Simulated Environment (Green grid and scan line)
    this.arSimGroup = new THREE.Group();
    this.arSimGroup.name = "ar_simulation";
    this.arSimGroup.visible = false;
    this.scene.add(this.arSimGroup);

    // Green AR Grid Helper (positioned below the scaled down heart)
    const arGrid = new THREE.GridHelper(10, 20, 0x00ff88, 0x004422);
    arGrid.position.y = -0.4;
    this.arSimGroup.add(arGrid);

    // Green scanning light plane
    const scanGeo = new THREE.PlaneGeometry(3, 3);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    this.arScanPlane = new THREE.Mesh(scanGeo, scanMat);
    this.arScanPlane.rotation.x = Math.PI / 2;
    this.arScanPlane.position.y = 0.6;
    this.arSimGroup.add(this.arScanPlane);

    // 2. VR Simulated Environment (Purple glowing podium, lab floor grid)
    this.vrSimGroup = new THREE.Group();
    this.vrSimGroup.name = "vr_simulation";
    this.vrSimGroup.visible = false;
    this.scene.add(this.vrSimGroup);

    // Dark purple lab grid
    const vrGrid = new THREE.GridHelper(15, 30, 0xa855f7, 0x3b0764);
    vrGrid.position.y = -1.2;
    this.vrSimGroup.add(vrGrid);

    // Glowing podium cylinder (0.5 top, 0.6 bottom, 1.0 height)
    const podiumGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.0, 32);
    this.podiumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x581c87,
      emissiveIntensity: 0.5
    });
    const podium = new THREE.Mesh(podiumGeo, this.podiumMat);
    podium.position.y = -0.8; // top is at y=-0.3
    this.vrSimGroup.add(podium);

    // Glowing podium rim ring (aligned with top surface of podium)
    const ringGeo = new THREE.RingGeometry(0.48, 0.52, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide
    });
    this.rimRing = new THREE.Mesh(ringGeo, ringMat);
    this.rimRing.rotation.x = Math.PI / 2;
    this.rimRing.position.y = -0.29;
    this.vrSimGroup.add(this.rimRing);

    // 3. MR Simulated Environment (Holographic pedestal, hand trackers)
    this.mrSimGroup = new THREE.Group();
    this.mrSimGroup.name = "mr_simulation";
    this.mrSimGroup.visible = false;
    this.scene.add(this.mrSimGroup);

    // Holographic pedestal (semi-transparent glowing cylinder)
    const mrPodiumGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.8, 32);
    const mrPodiumMat = new THREE.MeshPhysicalMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.6,
      ior: 1.5,
      emissive: 0x0088ff,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
    const mrPodium = new THREE.Mesh(mrPodiumGeo, mrPodiumMat);
    mrPodium.position.y = -0.7;
    this.mrSimGroup.add(mrPodium);

    // Glowing podium rim ring (cyan/blue)
    const mrRingGeo = new THREE.RingGeometry(0.33, 0.35, 32);
    const mrRingMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      side: THREE.DoubleSide
    });
    const mrGlowRing = new THREE.Mesh(mrRingGeo, mrRingMat);
    mrGlowRing.rotation.x = Math.PI / 2;
    mrGlowRing.position.y = -0.29;
    this.mrSimGroup.add(mrGlowRing);

    // Simulated Hand Tracking: Left and Right hands represented by glowing spheres/lines
    this.simulatedHands = new THREE.Group();
    this.mrSimGroup.add(this.simulatedHands);

    const jointGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const jointMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // Left Hand group
    this.leftSimHand = new THREE.Group();
    this.leftSimHand.position.set(-0.6, 0.5, 0.2);
    this.simulatedHands.add(this.leftSimHand);

    // Right Hand group
    this.rightSimHand = new THREE.Group();
    this.rightSimHand.position.set(0.6, 0.5, 0.2);
    this.simulatedHands.add(this.rightSimHand);

    // Create joint meshes for simulated hands
    this.simHandJoints = [];
    for (let h = 0; h < 2; h++) {
      const handGroup = h === 0 ? this.leftSimHand : this.rightSimHand;
      const joints = [];

      // Wrist joint (index 0)
      const wrist = new THREE.Mesh(jointGeo, jointMat);
      wrist.position.set(0, 0, 0);
      handGroup.add(wrist);
      joints.push(wrist);

      // Simple skeleton of a hand: 5 fingers * 3 joints each = 15 joints
      for (let f = 0; f < 5; f++) {
        const angle = (f - 2) * 0.2;
        for (let k = 1; k <= 3; k++) {
          const joint = new THREE.Mesh(jointGeo, jointMat);
          const dist = 0.05 + k * 0.04;
          joint.position.set(
            Math.sin(angle) * dist,
            Math.cos(angle) * dist + (f === 0 ? -0.01 : 0), // adjust thumb position slightly
            k * 0.01
          );
          handGroup.add(joint);
          joints.push(joint);
        }
      }
      this.simHandJoints.push(joints);

      // Connect them with thin lines to show bones
      const lineMat = new THREE.LineBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.6 });
      for (let f = 0; f < 5; f++) {
        const points = [];
        points.push(new THREE.Vector3(0, 0, 0));
        const baseIndex = 1 + f * 3;
        for (let k = 0; k < 3; k++) {
          const jointMesh = joints[baseIndex + k];
          points.push(jointMesh.position);
        }

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, lineMat);
        handGroup.add(line);
      }
    }
  }

  setAppMode(mode) {
    this.appMode = mode; // 'desktop', 'ar', 'vr', 'mr', 'xr'

    // Reset all body classes
    document.body.classList.remove('body-mode-ar', 'body-mode-vr', 'body-mode-mr', 'body-mode-xr');

    // Hide all simulated environment groups by default
    if (this.arSimGroup) this.arSimGroup.visible = false;
    if (this.vrSimGroup) this.vrSimGroup.visible = false;
    if (this.mrSimGroup) this.mrSimGroup.visible = false;

    // Handle status banner text & icon updates
    const banner = document.getElementById('mode-banner');
    const bannerText = document.getElementById('mode-banner-text');
    const bannerIcon = document.getElementById('mode-banner-icon');

    const panelLeft = document.getElementById('panel-left');
    const panelRight = document.getElementById('panel-right');

    if (mode === 'desktop') {
      if (this.scene) this.scene.background = new THREE.Color(0x050a12);
      if (banner) banner.classList.add('hidden');
      this.setVisualizerMode('skeleton');
      if (panelLeft) panelLeft.classList.remove('collapsed');
      if (panelRight) panelRight.classList.add('collapsed');
    } else {
      if (banner) banner.classList.remove('hidden');
      this.setVisualizerMode('focused');

      // Scale down the heart in simulated AR/VR/MR/XR modes so it fits the viewport & podium perfectly (0.6x)
      if (this.heartGroup) {
        this.heartGroup.scale.set(0.6, 0.6, 0.6);
        this.heartGroup.position.set(0, 0.6, 0);
      }
      if (this.controls) {
        this.controls.target.set(0, 0.6, 0);
        this.camera.position.set(0, 0.6, 3.8); // Adjust camera target and distance accordingly
      }

      // Collapse sidebars for clean immersive simulation
      if (panelLeft) panelLeft.classList.add('collapsed');
      if (panelRight) panelRight.classList.add('collapsed');

      if (mode === 'ar') {
        document.body.classList.add('body-mode-ar');
        if (this.scene) this.scene.background = null;
        if (bannerText) bannerText.textContent = 'Simulated AR Mode';
        if (bannerIcon) bannerIcon.textContent = '🟢';
        if (this.arSimGroup) this.arSimGroup.visible = true;
      } else if (mode === 'vr') {
        document.body.classList.add('body-mode-vr');
        if (this.scene) this.scene.background = new THREE.Color(0x050a12);
        if (bannerText) bannerText.textContent = 'Simulated VR Lab';
        if (bannerIcon) bannerIcon.textContent = '🟣';
        if (this.vrSimGroup) this.vrSimGroup.visible = true;

        // Use purple color scheme
        if (this.rimRing) this.rimRing.material.color.setHex(0xa855f7);
        if (this.podiumMat) {
          this.podiumMat.emissive.setHex(0x581c87);
          this.podiumMat.emissiveIntensity = 0.5;
        }
      } else if (mode === 'mr') {
        document.body.classList.add('body-mode-mr');
        if (this.scene) this.scene.background = null;
        if (bannerText) bannerText.textContent = 'Simulated MR Mode';
        if (bannerIcon) bannerIcon.textContent = '🔵';
        if (this.mrSimGroup) this.mrSimGroup.visible = true;
      } else if (mode === 'xr') {
        document.body.classList.add('body-mode-xr');
        if (this.scene) this.scene.background = new THREE.Color(0x050a12);
        if (bannerText) bannerText.textContent = 'Simulated Auto XR';
        if (bannerIcon) bannerIcon.textContent = '💖';
        if (this.vrSimGroup) this.vrSimGroup.visible = true;

        // Use hot pink/magenta color scheme for Auto XR
        if (this.rimRing) this.rimRing.material.color.setHex(0xff0080);
        if (this.podiumMat) {
          this.podiumMat.emissive.setHex(0x9d174d);
          this.podiumMat.emissiveIntensity = 0.6;
        }
      }
    }
  }

  loadModels() {
    const loader = new ModelLoader();
    const progressEl = document.getElementById('progress-bar');
    const loaderStatusEl = document.getElementById('loader-status');

    if (loaderStatusEl) loaderStatusEl.textContent = 'Loading skeletal system...';

    loader.loadSkeletonModel((percent) => {
      if (progressEl) progressEl.style.width = `${percent * 0.4}%`;
    }).then((skeletonGroup) => {
      this.skeletonGroup = skeletonGroup;
      this.scene.add(this.skeletonGroup);

      if (loaderStatusEl) loaderStatusEl.textContent = 'Loading cardiovascular system...';

      return loader.loadHeartModel(this.materials, (percent) => {
        if (progressEl) progressEl.style.width = `${40 + percent * 0.6}%`;
      });
    }).then((heartGroup) => {
      this.heartGroup = heartGroup;

      // Add particles as child of heartGroup so they scale/move together
      if (this.particles) {
        this.heartGroup.add(this.particles);
      }

      this.scene.add(this.heartGroup);

      // Default to landing page skeleton view
      this.setVisualizerMode('skeleton');

      // Complete Loading
      setTimeout(() => {
        const loaderOverlay = document.getElementById('loader');
        if (loaderOverlay) {
          loaderOverlay.classList.add('fade-out');
        }
      }, 500);
    });
  }

  setVisualizerMode(mode) {
    if (this.appMode !== 'desktop') {
      mode = 'focused';
    }
    this.visualizerMode = mode; // 'skeleton' or 'focused'

    // Sync the UI checkbox state
    const viewModeSwitch = document.getElementById('switch-view-mode');
    if (viewModeSwitch) {
      viewModeSwitch.checked = (mode === 'focused');
    }

    if (mode === 'skeleton') {
      this.showLabels = false;
      this.hideAllLabels();
      this.clearSelection();

      if (this.skeletonGroup) {
        this.skeletonGroup.visible = true;
      }
      if (this.heartGroup) {
        this.heartGroup.visible = true; // Enforce heart visibility
        // Scale heart small to fit inside the ribcage
        this.heartGroup.scale.set(0.08, 0.08, 0.08);
        // Position inside the chest cavity
        // With feet at y=0 and head at y=2.0, chest/ribcage center is ~y=1.35
        this.heartGroup.position.set(0.02, 1.35, 0.05);
        if (this.skeletonGroup) {
          this.skeletonGroup.add(this.heartGroup);
        }
      }

      // Camera target: chest area of skeleton (y=1.2)
      if (this.controls) {
        this.controls.target.set(0, 1.2, 0);
        this.camera.position.set(0, 1.2, 5.0);
      }
    } else { // 'focused'
      this.showLabels = true;
      if (this.skeletonGroup) {
        this.skeletonGroup.visible = false;
      }

      const isXR = this.renderer.xr.isPresenting;
      if (this.heartGroup) {
        this.heartGroup.visible = true; // Enforce heart visibility
        this.scene.add(this.heartGroup); // ALWAYS add back to scene root so it detaches from invisible skeleton
        if (!isXR) {
          if (this.appMode === 'ar' || this.appMode === 'vr' || this.appMode === 'xr') {
            this.heartGroup.scale.set(0.6, 0.6, 0.6);
            this.heartGroup.position.set(0, 0.6, 0);
          } else {
            this.heartGroup.scale.set(1.0, 1.0, 1.0);
            this.heartGroup.position.set(0, 0.5, 0); // centered in viewport
          }
        }
      }

      // Camera target: center of focused heart
      if (this.controls && !isXR) {
        if (this.appMode === 'ar' || this.appMode === 'vr' || this.appMode === 'xr') {
          this.controls.target.set(0, 0.6, 0);
          this.camera.position.set(0, 0.6, 3.8);
        } else {
          this.controls.target.set(0, 0.5, 0);
          this.camera.position.set(0, 0.5, 5.0);
        }
      }
    }

    if (this.controls) this.controls.update();
  }

  hideAllLabels() {
    Object.keys(this.labelElements).forEach(key => {
      const element = this.labelElements[key];
      if (element) {
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
      }
    });
  }

  setupLabels() {
    // Generate overlay label containers in HUD layer
    const hudContainer = document.querySelector('.hud-layer');
    if (!hudContainer) return;

    Object.keys(this.labelAnchors).forEach(key => {
      const label = document.createElement('div');
      label.className = 'heart-label-tag';
      label.id = `label-tag-${key}`;

      // Get formatted label name
      const name = HeartData[key] ? HeartData[key].name : key;

      // Display small dot icon depending on blood oxygenation
      let dotColor = 'var(--color-primary)';
      if (key === 'aorta' || key === 'left_ventricle' || key === 'left_atrium') dotColor = 'var(--color-ox)';
      if (key === 'pulmonary_artery' || key === 'right_ventricle' || key === 'right_atrium' || key === 'vena_cava') dotColor = 'var(--color-deox)';

      label.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background-color:${dotColor};box-shadow:0 0 4px ${dotColor}"></span>${name}`;

      // Save reference and add to HUD
      this.labelElements[key] = label;
      hudContainer.appendChild(label);
    });
  }

  setupEvents() {
    // Window Resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Mouse Move (Hover checking)
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Click / Touch select
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));

    // Mobile Touch interaction helpers (raycasting support)
    this.renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    }, { passive: true });
  }

  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  highlightAnatomy(mesh, isHighlighted) {
    if (!mesh) return;
    const nameId = mesh.userData.nameId;
    const mat = this.materials[nameId] || mesh.material;
    highlightMaterial(mat, isHighlighted);
  }

  onMouseMove(event) {
    // Get mouse coordinates normalized
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast check
    if (this.heartGroup) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.heartGroup.children, true);

      if (intersects.length > 0) {
        // Find topmost named mesh node with a nameId (handling nested groups of GLB models)
        let mesh = intersects[0].object;
        let nameId = null;
        let target = null;
        let current = mesh;
        while (current) {
          if (current.userData && current.userData.nameId) {
            nameId = current.userData.nameId;
            target = current;
            break;
          }
          if (current === this.heartGroup) break;
          current = current.parent;
        }

        if (nameId && target) {
          if (this.hoveredMesh !== target) {
            // Remove previous hover color
            if (this.hoveredMesh && this.hoveredMesh !== this.selectedMesh) {
              this.highlightAnatomy(this.hoveredMesh, false);
            }

            this.hoveredMesh = target;

            // Apply hover highlight
            if (this.hoveredMesh !== this.selectedMesh) {
              this.highlightAnatomy(this.hoveredMesh, true);
              document.body.style.cursor = 'pointer';
            }
          }
        }
      } else {
        if (this.hoveredMesh) {
          if (this.hoveredMesh !== this.selectedMesh) {
            this.highlightAnatomy(this.hoveredMesh, false);
          }
          this.hoveredMesh = null;
          document.body.style.cursor = 'default';
        }
      }
    }
  }

  onMouseClick(event) {
    if (this.heartGroup) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.heartGroup.children, true);

      if (intersects.length > 0) {
        // Find topmost named mesh node with a nameId
        let mesh = intersects[0].object;
        let nameId = null;
        let current = mesh;
        while (current) {
          if (current.userData && current.userData.nameId) {
            nameId = current.userData.nameId;
            break;
          }
          if (current === this.heartGroup) break;
          current = current.parent;
        }

        // Auto-focus on heart when clicked inside skeleton
        if (this.visualizerMode === 'skeleton') {
          this.setVisualizerMode('focused');
          return;
        }

        if (nameId && HeartData[nameId]) {
          // Toggle selection: if already selected, clear it
          if (this.selectedMesh && this.selectedMesh.userData.nameId === nameId) {
            this.clearSelection();
          } else {
            this.selectAnatomy(nameId);
          }
        }
      } else {
        // Clicked empty space: clear selection
        this.clearSelection();
      }
    }
  }

  // Set selected anatomy structure
  selectAnatomy(nameId) {
    // 1. Clear previous selection highlight
    if (this.selectedMesh) {
      this.highlightAnatomy(this.selectedMesh, false);
    }

    // 2. Find target mesh in group
    let targetMesh = null;
    this.heartGroup.traverse(node => {
      if (node.userData && node.userData.nameId === nameId) {
        targetMesh = node;
      }
    });

    if (targetMesh) {
      this.selectedMesh = targetMesh;
      this.highlightAnatomy(this.selectedMesh, true);

      // Hide all other parts, show only the selected part
      this.heartGroup.traverse(node => {
        if (node.isMesh) {
          if (node.userData && node.userData.nameId) {
            node.visible = (node.userData.nameId === nameId);
          } else {
            // Check parent hierarchy for match (for submeshes of groups like aorta branches/vena cava)
            let parentNode = node.parent;
            let match = false;
            while (parentNode && parentNode !== this.heartGroup) {
              if (parentNode.userData && parentNode.userData.nameId === nameId) {
                match = true;
                break;
              }
              parentNode = parentNode.parent;
            }
            node.visible = match;
          }
        }
      });

      // Temporarily hide particles while showing only one selected part
      if (this.particles) {
        this.particles.visible = false;
      }

      // Update UI callback
      if (this.onSelectionChanged) {
        this.onSelectionChanged(nameId);
      }
    }
  }

  // Reset selected mesh
  clearSelection() {
    if (this.selectedMesh) {
      this.highlightAnatomy(this.selectedMesh, false);
      this.selectedMesh = null;
    }

    // Show all parts of the heart again
    if (this.heartGroup) {
      this.heartGroup.traverse(node => {
        if (node.isMesh) {
          node.visible = true;
        }
      });
    }

    // Restore active particles visibility
    if (this.particles) {
      this.particles.visible = this.isFlowing;
    }

    if (this.onSelectionChanged) {
      this.onSelectionChanged(null);
    }
  }

  resetScene() {
    this.controls.reset();
    this.clearSelection();

    // Reset rotations/scales
    if (this.heartGroup) {
      this.heartGroup.rotation.set(0, 0, 0);
      this.heartGroup.traverse(node => {
        if (node.userData && node.userData.originalScale) {
          node.scale.copy(node.userData.originalScale);
          node.position.copy(node.userData.originalPosition);
        }
      });
    }

    // Restore skeleton landing view if on desktop, otherwise keep focused view
    if (this.appMode === 'desktop') {
      this.setVisualizerMode('skeleton');
    } else {
      this.setVisualizerMode('focused');
    }
  }

  // Config modifier setters
  setRotationSpeed(speed) {
    this.rotationSpeed = parseFloat(speed);
  }

  setPulseRate(rate) {
    this.bpm = parseInt(rate);
  }

  setHeartbeatEnabled(enabled) {
    this.isBeating = enabled;
    // reset scale if disabled
    if (!enabled && this.heartGroup) {
      this.heartGroup.traverse(node => {
        if (node.userData && node.userData.originalScale) {
          node.scale.copy(node.userData.originalScale);
        }
      });
    }
  }

  setBloodFlowEnabled(enabled) {
    this.isFlowing = enabled;
    if (this.particles) {
      this.particles.visible = enabled;
    }
  }

  setCrossSectionEnabled(enabled) {
    this.isCrossSection = enabled;
    if (enabled) {
      // Enable slicing
      this.clippingPlane.constant = this.sliceDepth;
    } else {
      // Move slicing plane completely outside boundaries to disable cuts
      this.clippingPlane.constant = 100.0;
    }
  }

  setSliceDepth(depth) {
    this.sliceDepth = parseFloat(depth);
    if (this.isCrossSection) {
      this.clippingPlane.constant = this.sliceDepth;
    }
  }

  setLabelsEnabled(enabled) {
    this.showLabels = enabled;
    Object.values(this.labelElements).forEach(el => {
      el.style.display = enabled ? 'flex' : 'none';
    });
  }

  // Projects 3D label anchors to HTML screen coords
  updateLabelsProjection() {
    if (!this.showLabels || !this.heartGroup) return;

    const tempV = new THREE.Vector3();
    const widthHalf = (this.container.clientWidth || window.innerWidth) / 2;
    const heightHalf = (this.container.clientHeight || window.innerHeight) / 2;

    Object.keys(this.labelAnchors).forEach(key => {
      const anchor = this.labelAnchors[key];
      const element = this.labelElements[key];
      if (!element) return;

      // Map local heart space to world space coordinates
      tempV.copy(anchor);
      this.heartGroup.localToWorld(tempV);

      // Project to 2D normalized screen space [-1, 1]
      tempV.project(this.camera);

      // Check if coordinate is behind camera lens
      if (tempV.z > 1) {
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
        return;
      }

      // Convert to CSS positions
      const x = (tempV.x * widthHalf) + widthHalf;
      const y = -(tempV.y * heightHalf) + heightHalf;

      // Apply positions to HTML elements
      element.style.opacity = '1';
      element.style.pointerEvents = 'auto';
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    });
  }

  // Heartbeat ECG simulation formula
  getHeartbeatScale(time, bpm) {
    const period = 60 / bpm; // duration of 1 beat cycle in seconds
    const phase = (time % period) / period; // progress in current beat [0, 1]

    let scale = 0;
    // ECG Waveform Approximation (P-Q-R-S-T wave contraction peaks)
    // Ventricular systole (R wave) peaks around phase = 0.2
    if (phase > 0.15 && phase < 0.28) {
      const t = (phase - 0.15) / 0.13;
      scale = Math.sin(t * Math.PI) * 0.14; // rapid ventricular squeeze
    }
    // Atrial systole (P wave) contract around phase = 0.0
    else if (phase > 0.85 || phase < 0.08) {
      const t = (phase > 0.85 ? phase - 0.85 : phase + 0.15) / 0.23;
      scale = Math.sin(t * Math.PI) * 0.05; // smaller atrial pulse
    }
    // Diastolic relaxation (T wave) swells around phase = 0.45
    else if (phase > 0.38 && phase < 0.65) {
      const t = (phase - 0.38) / 0.27;
      scale = -Math.sin(t * Math.PI) * 0.04; // slight expand/dilation
    }

    return scale;
  }

  animate() {
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Update simulated AR scanning plane height cycle
    if (this.arSimGroup && this.arSimGroup.visible && this.arScanPlane) {
      this.arScanPlane.position.y = 0.6 + Math.sin(elapsedTime * 2) * 0.4;
    }

    // Update simulated MR hands tracking movements
    if (this.mrSimGroup && this.mrSimGroup.visible && this.simulatedHands) {
      const t = elapsedTime;
      this.leftSimHand.position.y = 0.45 + Math.sin(t * 1.5) * 0.05;
      this.leftSimHand.position.x = -0.6 + Math.cos(t * 0.8) * 0.03;

      this.rightSimHand.position.y = 0.45 + Math.cos(t * 1.7) * 0.05;
      this.rightSimHand.position.x = 0.6 + Math.sin(t * 0.9) * 0.03;

      // Wiggle finger joints slightly
      this.simHandJoints.forEach((joints, h) => {
        joints.forEach((joint, j) => {
          if (j > 0) {
            const wiggle = Math.sin(t * 3.0 + j * 0.5) * 0.005;
            joint.position.z += wiggle * 0.1;
          }
        });
      });
    }

    // 1. Controls
    if (this.controls) this.controls.update();

    // 2. Auto-rotation
    if (this.rotationSpeed > 0) {
      const angle = this.rotationSpeed * delta * 60;
      if (this.visualizerMode === 'skeleton') {
        if (this.skeletonGroup) this.skeletonGroup.rotation.y += angle;
      } else {
        if (this.heartGroup) this.heartGroup.rotation.y += angle;
      }
    }

    // 3. Heartbeat Animation Squeeze
    if (this.heartGroup && this.isBeating) {
      const beatScaleVal = this.getHeartbeatScale(elapsedTime, this.bpm);

      this.heartGroup.traverse(node => {
        // Scale meshes with registered original scales (supporting deep node structures of GLTF)
        if (node.isMesh && node.userData && node.userData.originalScale) {
          const original = node.userData.originalScale;
          let factor = 1.0;

          if (node.name === 'left_ventricle' || node.name === 'right_ventricle') {
            factor = 1.0 - beatScaleVal; // squeeze during ventricular contraction
          } else if (node.name === 'left_atrium' || node.name === 'right_atrium') {
            // Atrial beating has opposite phase
            const atrialScaleVal = this.getHeartbeatScale(elapsedTime + (60 / this.bpm) * 0.2, this.bpm);
            factor = 1.0 - atrialScaleVal * 0.8;
          } else if (node.name === 'heart') {
            // Realistic heart beats as a single unified organ
            factor = 1.0 - beatScaleVal * 0.55;
          } else {
            // Vessels expand slightly due to blood surge during vent contraction
            factor = 1.0 + beatScaleVal * 0.15;
          }

          node.scale.set(
            original.x * factor,
            original.y * factor,
            original.z * factor
          );
        }
      });
    }

    // 4. Update Blood Flow Particles
    if (this.isFlowing && this.particles) {
      // Speed scales proportionally with Heart BPM
      const speedCoeff = this.bpm / 72;
      updateBloodFlowParticles(this.particles, speedCoeff);
    }

    // 5. Update HTML Label coordinates projecting on screen
    this.updateLabelsProjection();

    // 6. Render call
    this.renderer.render(this.scene, this.camera);
  }
}
