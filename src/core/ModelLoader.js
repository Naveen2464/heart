// Model Loader Service with Procedural Fallback for MediXR
import { createProceduralHeart } from '../utils/HeartGeometry.js';
import { createProceduralSkeleton } from '../utils/SkeletonGeometry.js';

export class ModelLoader {
  constructor(manager) {
    this.loader = new THREE.GLTFLoader(manager);
    this.modelPath = 'assets/models/realistic_human_heart.glb';
  }

  /**
   * Load the 3D skeleton model. If GLB file is missing, fallback to procedural skeleton.
   * @param {Function} onProgress - Callback for download progress tracking
   * @returns {Promise<THREE.Group>}
   */
  loadSkeletonModel(onProgress) {
    return new Promise(async (resolve) => {
      const path = 'assets/models/skeleton.glb';
      console.log(`ModelLoader: Checking for skeleton at '${path}'...`);
      
      // Check if the file exists first to avoid noisy 404 errors
      let fileExists = false;
      try {
        const headResp = await fetch(path, { method: 'HEAD' });
        fileExists = headResp.ok;
      } catch (e) {
        fileExists = false;
      }
      
      if (!fileExists) {
        console.log("ModelLoader: No skeleton GLB found. Using procedural wireframe skeleton.");
        const proceduralSkeleton = createProceduralSkeleton();
        resolve(proceduralSkeleton);
        return;
      }
      
      console.log(`ModelLoader: Skeleton GLB found! Loading...`);
      this.loader.load(
        path,
        (gltf) => {
          console.log("ModelLoader: Skeleton GLB loaded successfully!");
          const loadedModel = gltf.scene;
          
          // Cool glowing holographic-like bone material
          const skeletonBoneMat = new THREE.MeshStandardMaterial({
            color: 0x80b3ff,
            metalness: 0.15,
            roughness: 0.6,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide
          });
          
          loadedModel.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              node.material = skeletonBoneMat;
            }
          });
          
          const origBox = new THREE.Box3().setFromObject(loadedModel);
          const origSize = origBox.getSize(new THREE.Vector3());
          
          const desiredHeight = 2.0;
          const scaleFactor = desiredHeight / (origSize.y || 1);
          loadedModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
          
          loadedModel.position.set(0, 0, 0);
          loadedModel.updateMatrixWorld(true);
          const scaledBox = new THREE.Box3().setFromObject(loadedModel);
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
          const scaledMin = scaledBox.min;
          
          const wrapperGroup = new THREE.Group();
          wrapperGroup.name = "skeleton_model";
          wrapperGroup.add(loadedModel);
          
          loadedModel.position.set(
            -scaledCenter.x,
            -scaledMin.y,
            -scaledCenter.z
          );
          
          wrapperGroup.position.set(0, 0, 0);
          
          resolve(wrapperGroup);
        },
        (xhr) => {
          if (xhr.lengthComputable && onProgress) {
            onProgress((xhr.loaded / xhr.total) * 100);
          }
        },
        (error) => {
          console.warn("ModelLoader: Skeleton GLB failed to parse. Falling back to procedural skeleton.");
          const proceduralSkeleton = createProceduralSkeleton();
          resolve(proceduralSkeleton);
        }
      );
    });
  }

  /**
   * Load the 3D heart model. If GLB file is missing, fallback to procedural heart.
   * @param {Object} materials - Dictionary of physical materials to use for procedural model
   * @param {Function} onProgress - Callback for download progress tracking
   * @returns {Promise<THREE.Group>}
   */
  loadHeartModel(materials, onProgress) {
    return new Promise(async (resolve) => {
      console.log(`ModelLoader: Checking for GLB model at '${this.modelPath}'...`);
      
      // First, check if the file exists to avoid noisy 404 errors in the terminal
      let fileExists = false;
      try {
        const headResp = await fetch(this.modelPath, { method: 'HEAD' });
        fileExists = headResp.ok;
      } catch (e) {
        fileExists = false;
      }
      
      if (!fileExists) {
        console.log("ModelLoader: No GLB file found. Using high-fidelity procedural 3D heart model.");
        if (onProgress) onProgress(100);
        const proceduralHeart = createProceduralHeart(materials);
        resolve(proceduralHeart);
        return;
      }
      
      console.log(`ModelLoader: GLB found! Loading from '${this.modelPath}'...`);
      this.loader.load(
        this.modelPath,
        (gltf) => {
          console.log("ModelLoader: GLB model loaded successfully!");
          const loadedModel = gltf.scene;
          
          // Set up shadows and material associations for loaded meshes
          loadedModel.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              
              // If it's the realistic human heart model, preserve the original realistic material/textures!
              const lowerName = node.name.toLowerCase();
              if (lowerName.includes('hart') || lowerName.includes('heart') || lowerName.includes('group_heart_tex')) {
                // Apply clipping plane to the original realistic material
                if (node.material) {
                  node.material.clippingPlanes = [materials.left_ventricle.clippingPlanes[0]];
                  node.material.clipIntersection = false;
                  
                  // Setup highlight properties
                  node.material.userData = {
                    originalColor: node.material.color ? node.material.color.getHex() : 0xffffff,
                    originalOpacity: node.material.opacity !== undefined ? node.material.opacity : 1.0,
                    originalEmissive: node.material.emissive ? node.material.emissive.getHex() : 0x000000
                  };
                }
                
                node.name = 'heart';
                node.userData = {
                  originalScale: node.scale.clone(),
                  originalPosition: node.position.clone(),
                  originalRotation: node.rotation.clone(),
                  nameId: 'heart'
                };
              } else {
                // Normalize names: map node name to closest anatomical ID
                const normalizedName = this.normalizeMeshName(node.name);
                if (normalizedName && materials[normalizedName]) {
                  node.material = materials[normalizedName];
                  node.name = normalizedName;
                  node.userData = {
                    originalScale: node.scale.clone(),
                    originalPosition: node.position.clone(),
                    originalRotation: node.rotation.clone(),
                    nameId: normalizedName
                  };
                } else {
                  // If it doesn't match, give it a default red material
                  node.material = materials.left_ventricle.clone();
                  node.userData = {
                    originalScale: node.scale.clone(),
                    originalPosition: node.position.clone(),
                    originalRotation: node.rotation.clone(),
                    nameId: node.name.toLowerCase()
                  };
                }
              }
            }
          });
          
          // Normalize scale of loaded model to a standard size (height = 3.0)
          const heartBox = new THREE.Box3().setFromObject(loadedModel);
          const heartSize = heartBox.getSize(new THREE.Vector3());
          const targetHeight = 3.0;
          const scaleFactor = targetHeight / (heartSize.y || 1);
          loadedModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
          
          // Center the loaded model's geometry so it spins around its local center
          loadedModel.updateMatrixWorld(true);
          const heartCenter = heartBox.getCenter(new THREE.Vector3());
          loadedModel.position.set(-heartCenter.x, -heartCenter.y + 0.2, -heartCenter.z);
          
          const wrapperGroup = new THREE.Group();
          wrapperGroup.name = "heart_model";
          wrapperGroup.add(loadedModel);
          
          resolve(wrapperGroup);
        },
        // Progress callback
        (xhr) => {
          if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            if (onProgress) onProgress(percentComplete);
          }
        },
        // Error callback: Trigger fallback immediately
        (error) => {
          console.warn("ModelLoader: GLB failed to parse. Falling back to procedural model.");
          if (onProgress) onProgress(100);
          const proceduralHeart = createProceduralHeart(materials);
          resolve(proceduralHeart);
        }
      );
    });
  }

  /**
   * Normalize mesh node names from GLB to match our HeartData IDs
   * @param {string} name 
   * @returns {string|null}
   */
  normalizeMeshName(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('left_ventricle') || lowerName.includes('leftventricle') || lowerName === 'lv') {
      return 'left_ventricle';
    }
    if (lowerName.includes('right_ventricle') || lowerName.includes('rightventricle') || lowerName === 'rv') {
      return 'right_ventricle';
    }
    if (lowerName.includes('left_atrium') || lowerName.includes('leftatrium') || lowerName === 'la') {
      return 'left_atrium';
    }
    if (lowerName.includes('right_atrium') || lowerName.includes('rightatrium') || lowerName === 'ra') {
      return 'right_atrium';
    }
    if (lowerName.includes('aorta')) {
      return 'aorta';
    }
    if (lowerName.includes('pulmonary_artery') || lowerName.includes('pulmonaryartery') || lowerName.includes('pulmonary_trunk') || lowerName === 'pa') {
      return 'pulmonary_artery';
    }
    if (lowerName.includes('vena_cava') || lowerName.includes('venacava') || lowerName === 'vc' || lowerName.includes('svc') || lowerName.includes('ivc')) {
      return 'vena_cava';
    }
    
    return null;
  }
}
