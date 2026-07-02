# Custom Anatomical Models Directory

To load a custom 3D human heart (or any future organs), drop your model file inside this directory and name it:
`heart.glb`

## Requirements:
1. **Format**: GLB (Binary GLTF 2.0).
2. **Mesh Names**: For individual raycasting selection, highlight overlays, and voice commands to work, ensure the key meshes in your GLB are named (or contain the terms):
   - `left_ventricle` (or `lv`)
   - `right_ventricle` (or `rv`)
   - `left_atrium` (or `la`)
   - `right_atrium` (or `ra`)
   - `aorta`
   - `pulmonary_artery` (or `pulmonary_trunk`)
   - `vena_cava` (or `svc` / `ivc`)

If the application does not find `heart.glb` in this directory, it will automatically fall back to its detailed procedural WebXR heart visualization engine.
