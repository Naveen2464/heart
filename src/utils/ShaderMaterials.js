// PBR Materials and Blood Flow Mesh Particle System for MediXR

// 1. Create realistic transparent/glass PBR materials for the heart structures
export function createHeartMaterials(clippingPlane) {
  const materials = {
    // Left Ventricle — deepest crimson, thickest muscle wall
    left_ventricle: new THREE.MeshPhysicalMaterial({
      color: 0xb01020,
      metalness: 0.05,
      roughness: 0.55,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.88,
      emissive: new THREE.Color(0x5a0010),
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipIntersection: false
    }),

    // Right Ventricle — slightly lighter, thinner muscle wall
    right_ventricle: new THREE.MeshPhysicalMaterial({
      color: 0x991525,
      metalness: 0.05,
      roughness: 0.55,
      clearcoat: 0.9,
      clearcoatRoughness: 0.14,
      transparent: true,
      opacity: 0.85,
      emissive: new THREE.Color(0x48000e),
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipIntersection: false
    }),

    // Left Atrium — oxygenated, brighter red-pink
    left_atrium: new THREE.MeshPhysicalMaterial({
      color: 0xc93040,
      metalness: 0.04,
      roughness: 0.50,
      clearcoat: 0.75,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.82,
      emissive: new THREE.Color(0x60050f),
      emissiveIntensity: 0.28,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipIntersection: false
    }),

    // Right Atrium — slightly darker, deoxygenated blood arrives here
    right_atrium: new THREE.MeshPhysicalMaterial({
      color: 0xb02035,
      metalness: 0.04,
      roughness: 0.52,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
      transparent: true,
      opacity: 0.82,
      emissive: new THREE.Color(0x4a0010),
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipIntersection: false
    }),

    // Aorta — bright oxygenated arterial red, shiny smooth vessel wall
    aorta: new THREE.MeshPhysicalMaterial({
      color: 0xff2535,
      metalness: 0.12,
      roughness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.90,
      emissive: new THREE.Color(0x7a0010),
      emissiveIntensity: 0.40,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipIntersection: false
    }),

    // Pulmonary Artery — deep blue/indigo (deoxygenated, going to lungs)
    pulmonary_artery: new THREE.MeshPhysicalMaterial({
      color: 0x1a4aaa,
      metalness: 0.12,
      roughness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.90,
      emissive: new THREE.Color(0x050f50),
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipIntersection: false
    }),

    // Vena Cava — dark navy blue (deoxygenated blood returning from body)
    vena_cava: new THREE.MeshPhysicalMaterial({
      color: 0x0d3080,
      metalness: 0.08,
      roughness: 0.30,
      clearcoat: 0.75,
      clearcoatRoughness: 0.10,
      transparent: true,
      opacity: 0.87,
      emissive: new THREE.Color(0x020a2a),
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipIntersection: false
    })
  };

  // Store original properties for highlight/restore
  Object.keys(materials).forEach(key => {
    materials[key].userData = {
      originalColor: materials[key].color.getHex(),
      originalOpacity: materials[key].opacity,
      originalEmissive: materials[key].emissive.getHex(),
      originalEmissiveIntensity: materials[key].emissiveIntensity
    };
  });

  return materials;
}

// Helper to highlight a material — works for both procedural PBR and realistic GLB materials
export function highlightMaterial(material, isHighlighted) {
  if (!material) return;
  // Handle arrays (multi-material meshes from GLBs)
  if (Array.isArray(material)) {
    material.forEach(m => highlightMaterial(m, isHighlighted));
    return;
  }
  if (isHighlighted) {
    if (material.color) material.color.setHex(0x00f0ff); // neon cyan tint
    if (material.emissive) {
      material.emissive.setHex(0x00f0ff);
    }
    if (material.emissiveIntensity !== undefined) material.emissiveIntensity = 0.6;
    if (material.opacity !== undefined) material.opacity = 0.9;
    material.needsUpdate = true;
  } else {
    const od = material.userData;
    if (material.color && od && od.originalColor !== undefined) material.color.setHex(od.originalColor);
    if (material.emissive && od && od.originalEmissive !== undefined) material.emissive.setHex(od.originalEmissive);
    if (material.emissiveIntensity !== undefined && od && od.originalEmissiveIntensity !== undefined) {
      material.emissiveIntensity = od.originalEmissiveIntensity;
    } else if (material.emissiveIntensity !== undefined) {
      material.emissiveIntensity = 0.2;
    }
    if (material.opacity !== undefined && od && od.originalOpacity !== undefined) material.opacity = od.originalOpacity;
    material.needsUpdate = true;
  }
}

// 2. Dynamic Blood Flow Mesh Spheres (Bulletproof Mobile Sizing)
export function createBloodFlowParticles() {
  const particleGroup = new THREE.Group();
  particleGroup.name = "blood_flow_particles";

  // Spawning parameters (60 particles per system is visually rich and performs at 60fps)
  const particleCount = 60;
  
  // Shared geometry for small spherical blood cells
  const sphereGeo = new THREE.SphereGeometry(0.015, 8, 8);
  
  // Basic emissive-like materials (super lightweight, no shading cost)
  const redMat = new THREE.MeshBasicMaterial({
    color: 0xff3b30,
    transparent: true,
    opacity: 0.85
  });

  const blueMat = new THREE.MeshBasicMaterial({
    color: 0x007aff,
    transparent: true,
    opacity: 0.85
  });

  // Define trajectory curves
  const oxCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.4, -0.6, 0.0), // LV
    new THREE.Vector3(-0.25, 0.2, 0.0), // Aorta entry
    new THREE.Vector3(-0.15, 1.2, 0.1), // Ascending
    new THREE.Vector3(-0.4, 2.0, -0.2), // Arch
    new THREE.Vector3(-0.9, 1.8, -0.5), // Descending
    new THREE.Vector3(-1.0, 0.2, -0.6)
  ]);
  
  const deoxCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.8, 2.1, -0.25),  // SVC entry
    new THREE.Vector3(0.65, 0.5, 0.05),  // RA
    new THREE.Vector3(0.4, -0.4, 0.2),   // RV
    new THREE.Vector3(0.25, -0.1, 0.3),  // PA entry
    new THREE.Vector3(0.2, 0.6, 0.4),    // PA trunk
    new THREE.Vector3(0.0, 1.1, 0.35),   // Split
    new THREE.Vector3(-0.6, 1.25, 0.1)   // Left branch exit
  ]);

  const deoxCurveRight = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.7, -1.9, -0.3),  // IVC entry
    new THREE.Vector3(0.65, 0.5, 0.05),  // RA
    new THREE.Vector3(0.4, -0.4, 0.2),   // RV
    new THREE.Vector3(0.25, -0.1, 0.3),  // PA entry
    new THREE.Vector3(0.2, 0.6, 0.4),    // PA trunk
    new THREE.Vector3(0.0, 1.1, 0.35),   // Split
    new THREE.Vector3(0.6, 1.3, 0.6)     // Right branch exit
  ]);

  const flowData = [];

  // Spawn Red Blood Mesh Cells
  for (let i = 0; i < particleCount; i++) {
    const t = Math.random();
    const speed = 0.003 + Math.random() * 0.005;
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * 0.14,
      (Math.random() - 0.5) * 0.14,
      (Math.random() - 0.5) * 0.14
    );

    const sphere = new THREE.Mesh(sphereGeo, redMat);
    const pos = oxCurve.getPointAt(t).add(jitter);
    sphere.position.copy(pos);
    
    particleGroup.add(sphere);
    flowData.push({
      mesh: sphere,
      t,
      speed,
      curve: oxCurve,
      jitter
    });
  }

  // Spawn Blue Blood Mesh Cells
  for (let i = 0; i < particleCount; i++) {
    const t = Math.random();
    const speed = 0.003 + Math.random() * 0.005;
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * 0.12,
      (Math.random() - 0.5) * 0.12,
      (Math.random() - 0.5) * 0.12
    );

    const curve = Math.random() > 0.5 ? deoxCurve : deoxCurveRight;
    const sphere = new THREE.Mesh(sphereGeo, blueMat);
    const pos = curve.getPointAt(t).add(jitter);
    sphere.position.copy(pos);
    
    particleGroup.add(sphere);
    flowData.push({
      mesh: sphere,
      t,
      speed,
      curve: curve,
      jitter
    });
  }

  particleGroup.userData = { flowData };
  return particleGroup;
}

// 3. Update mesh sphere coordinates along spline paths
export function updateBloodFlowParticles(particleGroup, speedFactor = 1.0) {
  if (!particleGroup || !particleGroup.userData || !particleGroup.userData.flowData) return;

  const flowData = particleGroup.userData.flowData;
  for (let i = 0; i < flowData.length; i++) {
    const p = flowData[i];
    p.t += p.speed * speedFactor;
    if (p.t > 1.0) p.t = 0.0;

    const pos = p.curve.getPointAt(p.t);
    p.mesh.position.set(
      pos.x + p.jitter.x,
      pos.y + p.jitter.y,
      pos.z + p.jitter.z
    );
  }
}
