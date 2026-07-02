// Procedural 3D Heart Geometry Generator for MediXR
export function createProceduralHeart(materials) {
  const heartGroup = new THREE.Group();
  heartGroup.name = "heart_model";

  // Helper function to create organic deformed meshes
  function createOrganicMesh(geometry, scale, position, rotation, material, name) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale.x, scale.y, scale.z);
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Store original scale and position for reset and animations
    mesh.userData = {
      originalScale: scale.clone(),
      originalPosition: position.clone(),
      originalRotation: rotation.clone(),
      nameId: name
    };
    
    return mesh;
  }

  // 1. Left Ventricle (LV) - Strongest, thickest chamber
  const lvGeo = new THREE.SphereGeometry(1, 32, 32);
  // Deform sphere to make it more conical/egg-shaped (ventricular shape)
  const posAttr = lvGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    let y = posAttr.getY(i);
    // Taper the bottom (negative y) to create an apex
    if (y < 0) {
      let factor = 1 + y * 0.45; // taper towards y = -1
      posAttr.setX(i, posAttr.getX(i) * factor);
      posAttr.setZ(i, posAttr.getZ(i) * factor);
    }
  }
  lvGeo.computeVertexNormals();

  const lv = createOrganicMesh(
    lvGeo,
    new THREE.Vector3(1.1, 1.6, 1.0),
    new THREE.Vector3(-0.4, -0.6, 0.0),
    new THREE.Vector3(0, 0, Math.PI / 10), // slight tilt
    materials.left_ventricle,
    "left_ventricle"
  );
  heartGroup.add(lv);

  // 2. Right Ventricle (RV) - Thinner, wrapped around left ventricle
  const rvGeo = new THREE.SphereGeometry(1, 32, 32);
  const posAttrRv = rvGeo.attributes.position;
  for (let i = 0; i < posAttrRv.count; i++) {
    let y = posAttrRv.getY(i);
    if (y < 0) {
      let factor = 1 + y * 0.35;
      posAttrRv.setX(i, posAttrRv.getX(i) * factor);
      posAttrRv.setZ(i, posAttrRv.getZ(i) * factor);
    }
  }
  rvGeo.computeVertexNormals();

  const rv = createOrganicMesh(
    rvGeo,
    new THREE.Vector3(0.9, 1.4, 0.8),
    new THREE.Vector3(0.4, -0.4, 0.2), // slightly forward and to the right
    new THREE.Vector3(0, -Math.PI / 12, -Math.PI / 12),
    materials.right_ventricle,
    "right_ventricle"
  );
  heartGroup.add(rv);

  // 3. Left Atrium (LA) - Upper chamber receiving from pulmonary veins
  const laGeo = new THREE.SphereGeometry(0.85, 32, 32);
  const la = createOrganicMesh(
    laGeo,
    new THREE.Vector3(0.8, 0.8, 0.8),
    new THREE.Vector3(-0.5, 0.6, -0.25),
    new THREE.Vector3(0, 0, 0),
    materials.left_atrium,
    "left_atrium"
  );
  heartGroup.add(la);

  // 4. Right Atrium (RA) - Upper chamber receiving from body
  const raGeo = new THREE.SphereGeometry(0.9, 32, 32);
  const ra = createOrganicMesh(
    raGeo,
    new THREE.Vector3(0.85, 0.85, 0.85),
    new THREE.Vector3(0.6, 0.5, 0.05),
    new THREE.Vector3(0, 0, 0),
    materials.right_atrium,
    "right_atrium"
  );
  heartGroup.add(ra);

  // 5. Aorta (Main systemic artery) - Curved arch
  // Create a 3D Bezier curve for the aortic arch
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 0.2, 0.0),      // outflow from LV
    new THREE.Vector3(-0.15, 1.2, 0.1),     // ascending aorta
    new THREE.Vector3(-0.4, 2.0, -0.2),     // top arch front
    new THREE.Vector3(-0.9, 1.8, -0.5),     // top arch back
    new THREE.Vector3(-1.0, 0.2, -0.6)      // descending aorta
  ]);

  const aortaGeo = new THREE.TubeGeometry(aortaCurve, 40, 0.32, 16, false);
  const aorta = createOrganicMesh(
    aortaGeo,
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    materials.aorta,
    "aorta"
  );
  heartGroup.add(aorta);

  // Add aortic branch vessels (arteries going to head and arms)
  const branchPoints = [
    { pos: new THREE.Vector3(-0.25, 1.7, 0.0), rot: new THREE.Vector3(0.2, 0, -0.2), size: 0.12, len: 0.6 },
    { pos: new THREE.Vector3(-0.45, 1.95, -0.12), rot: new THREE.Vector3(0.2, 0, -0.1), size: 0.1, len: 0.6 },
    { pos: new THREE.Vector3(-0.68, 1.95, -0.28), rot: new THREE.Vector3(0.1, 0, 0.1), size: 0.1, len: 0.5 }
  ];

  branchPoints.forEach((bp, index) => {
    const branchGeo = new THREE.CylinderGeometry(bp.size * 0.9, bp.size, bp.len, 12);
    // Shift geometry origin so it rotates/positions from its bottom end
    branchGeo.translate(0, bp.len / 2, 0);
    const branchMesh = new THREE.Mesh(branchGeo, materials.aorta);
    branchMesh.position.copy(bp.pos);
    branchMesh.rotation.set(bp.rot.x, bp.rot.y, bp.rot.z);
    branchMesh.castShadow = true;
    branchMesh.name = `aorta_branch_${index}`;
    // Attach to aorta group
    aorta.add(branchMesh);
  });

  // 6. Pulmonary Artery (PA) - Branching outflow from RV
  const paCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.25, -0.1, 0.3),     // outflow from RV
    new THREE.Vector3(0.2, 0.6, 0.4),      // trunk
    new THREE.Vector3(0.0, 1.1, 0.35)       // bifurcation point
  ]);

  const paGeo = new THREE.TubeGeometry(paCurve, 20, 0.26, 16, false);
  const pulmonaryArtery = createOrganicMesh(
    paGeo,
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    materials.pulmonary_artery,
    "pulmonary_artery"
  );

  // Left & Right Pulmonary Branches
  const leftBranchGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.8, 12);
  leftBranchGeo.translate(0, 0.4, 0);
  const leftBranch = new THREE.Mesh(leftBranchGeo, materials.pulmonary_artery);
  leftBranch.position.set(0.0, 1.05, 0.35);
  leftBranch.rotation.set(0.2, 0, -Math.PI / 3);
  pulmonaryArtery.add(leftBranch);

  const rightBranchGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.0, 12);
  rightBranchGeo.translate(0, 0.5, 0);
  const rightBranch = new THREE.Mesh(rightBranchGeo, materials.pulmonary_artery);
  rightBranch.position.set(0.0, 1.05, 0.35);
  rightBranch.rotation.set(-0.2, 0, Math.PI / 2.5);
  pulmonaryArtery.add(rightBranch);

  heartGroup.add(pulmonaryArtery);

  // 7. Vena Cava (SVC & IVC returning blood to RA)
  // Combine Superior Vena Cava and Inferior Vena Cava into one anatomical structure
  const svcGeo = new THREE.CylinderGeometry(0.25, 0.28, 1.5, 16);
  const svc = new THREE.Mesh(svcGeo, materials.vena_cava);
  svc.position.set(0.8, 1.4, -0.25);
  svc.rotation.set(0.1, 0, -Math.PI / 18);
  svc.name = "vena_cava_svc";
  svc.castShadow = true;

  const ivcGeo = new THREE.CylinderGeometry(0.28, 0.3, 1.5, 16);
  const ivc = new THREE.Mesh(ivcGeo, materials.vena_cava);
  ivc.position.set(0.7, -1.2, -0.3);
  ivc.rotation.set(-0.1, 0, Math.PI / 18);
  ivc.name = "vena_cava_ivc";
  ivc.castShadow = true;

  // Group VC
  const vcGroup = new THREE.Group();
  vcGroup.name = "vena_cava";
  vcGroup.add(svc);
  vcGroup.add(ivc);
  vcGroup.userData = {
    originalScale: new THREE.Vector3(1, 1, 1),
    originalPosition: new THREE.Vector3(0, 0, 0),
    originalRotation: new THREE.Vector3(0, 0, 0),
    nameId: "vena_cava"
  };
  
  // Set VC group materials mapping
  vcGroup.castShadow = true;
  heartGroup.add(vcGroup);

  // No pre-baked offset — Engine3D setVisualizerMode controls all positioning
  heartGroup.position.set(0, 0, 0);
  
  return heartGroup;
}
