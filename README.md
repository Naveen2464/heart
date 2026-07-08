# 🫀 MediXR — Immersive 3D Human Heart Anatomy Visualizer

MediXR is a premium, interactive WebXR medical education application designed to visualize and inspect a medically accurate 3D model of the human heart. Built on **Three.js** and native **WebXR APIs** (enhanced with the Zappar XR Polyfill), the application bridges desktop 3D simulation with fully immersive Augmented Reality (AR) and Virtual Reality (VR) environments.

## 🎥 Project Video Walkthrough

Watch the application in action showing the 3D heart model loading, voice commands, simulation controls, and AR camera placements:

https://github.com/Naveen2464/heart/raw/main/assets/demo_walkthrough.mp4

*(Note: Once you record your screen, add your video file to the `assets/` directory and name it `demo_walkthrough.mp4` to automatically render the player directly on GitHub.)*

---

## 🌟 Key Features

### 🖥️ 1. Interactive 3D Desktop View
*   **Orbit Controls:** Rotate, zoom, and pan around a high-fidelity 3D model of the heart.
*   **Structure Highlighting:** Hover and click on distinct anatomical chambers, valves, and blood vessels to view clinical explanations.
*   **Dynamic HUD Sidebars:** Sleek, glassmorphism panel interfaces showing medical details, cross-sections, and scene controls.

### 📱 2. Augmented Reality (AR) Explorer
*   **Scan & Tap Placement:** Leverages the device's camera feed to map the surrounding room and anchors the 3D heart onto horizontal surfaces (floors, tables). Includes immediate placement coordinate fail-safes.
*   **Interactive Mobile HUD:** Clean viewport layout optimized for touch gestures.
*   **Pulsing Presenting Indicators:** Smooth breathing neon pulse overlays on buttons and panels during active sessions.

### 🥽 3. Virtual Reality (VR) Laboratory
*   **Immersive Lab Space:** Teleport onto a professional room-scale platform with floor grids and spatial UI elements.
*   **Laser Pointer Controllers:** Point and select individual anatomical structures in real-time.
*   **Grab & Inspect:** Clutches the heart in 3D space to inspect internal and external structures up close.
*   **Pulsing Active States:** Dynamic breathing neon-glow indicators tracking headset presentation status.

### 🔄 4. Advanced Simulation Modes
*   **Heartbeat & Pulse Control:** Procedural cardiac animations with adjustable beats per minute (BPM) from 40 to 180.
*   **Blood Flow Visualization:** Custom GPU particle systems representing oxygenated (red) and deoxygenated (blue) blood paths.
*   **Cross-Section (Slice View):** A dynamic clipping plane allows slicing through the chambers to inspect the interior ventricular septum and valves.
*   **Exploded View:** Separates the heart into constituent chambers and vessels to understand spatial assemblies.
*   **Translucent Mode:** Turns outer shells translucent to reveal internal structures while maintaining the outline.
*   **Clinical Pathology Simulations:** Toggle real-time animations for conditions like *Myocardial Infarction* (ischemic necrotic tissue), *Valve Disease* (leaking/malfunctioning flows), and *Cardiac Hypertrophy* (ventricular wall thickening).

### 🗣️ 5. Voice Command & AI Assistant
*   **Web Speech Recognition:** Operates hands-free using simple spoken triggers to toggle visualizations or highlight sections.
*   **Text-to-Speech (TTS):** A medical voice reads out anatomical functions and clinical notes.

### ♿ 6. Accessible Design System
*   **Screen Reader HUD:** Native announcements via screen reader virtual DOM regions (`aria-live`).
*   **High Contrast Mode:** Swaps styling to high-visibility, high-contrast assets.
*   **Large Typography Scaling:** Dynamically scales font sizes to support low-vision users.

---

## 📂 Project Structure

The project has a modular, clean ES6 architecture structure:

```
webxr_PROJECT/
│
├── index.html                     # Main HTML application layout, CDNs, and UI overlays
├── server.js                      # Custom HTTP/HTTPS Node.js dev server with auto-SSL
├── package.json                   # Project scripts and package configuration metadata
├── realistic_human_heart.glb      # Root medically accurate GLB 3D heart model file
├── favicon.ico                    # Browser favicon icon
│
├── certs/                         # SSL Certificate files for local HTTPS testing
│   ├── generate.ps1               # PowerShell SSL generator command script
│   └── server.pfx                 # Generated PKCS#12 SSL/TLS Certificate archive
│
├── assets/                        # Shared project assets (diagrams, 3D GLTF models)
│   ├── images/                    # Anatomical reference diagram overlays
│   │   ├── aorta.png              # Aorta clinical reference image diagram
│   │   ├── atrium.png             # Atria clinical reference image diagram
│   │   ├── pulmonary_artery.png   # Pulmonary artery clinical reference image
│   │   ├── vena_cava.png          # Vena Cava clinical reference image diagram
│   │   └── ventricle.png          # Ventricles clinical reference image diagram
│   │
│   └── models/                    # Subfolder containing 3D GLTF model files
│       ├── README.md              # Model documentation notes
│       ├── realistic_human_heart.glb # Main heart model copy inside assets
│       └── skeleton.glb           # Chest ribcage skeleton context model
│
├── styles/                        # Style assets folder
│   └── main.css                   # Main Glassmorphic Dark UI & layout stylesheet
│
└── src/                           # Modular application source code directory
    ├── ar/                        # Augmented Reality (AR) scripts
    │   └── ARManager.js           # AR session events, hit testing, and floor placement
    │
    ├── vr/                        # Virtual Reality (VR) scripts
    │   └── VRManager.js           # VR room setup, 6DoF controller rays, and grab physics
    │
    ├── core/                      # Application core engine modules
    │   ├── App.js                 # App coordinator, entry, and WebXR session listener
    │   ├── Engine3D.js            # Core Three.js render loop, lights, and simulated modes
    │   └── ModelLoader.js         # Model importer, progress tracker, and PBR materials
    │
    ├── ui/                        # User interface modules
    │   ├── UIController.js        # Event binder for HUD, panels, sliders, and buttons
    │   └── Accessibility.js       # accessibility features, high contrast, and screen readers
    │
    ├── voice/                     # Voice recognition and synthesis
    │   └── VoiceEngine.js         # Speech commands listener and medical text TTS reader
    │
    └── utils/                     # Utility services and geometry generators
        ├── HeartData.js           # Detailed medical descriptions & pathology conditions database
        ├── HeartGeometry.js       # Procedural heart chambers (fallback geometry generator)
        ├── ShaderMaterials.js     # Custom WebGL shaders (blood flows, heartbeat contraction)
        └── SkeletonGeometry.js    # Procedural skeleton (fallback geometry generator)
```

---

## 🚀 Getting Started

### 📋 Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (LTS version recommended).

### 🛠️ Setup & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Naveen2464/heart.git
    cd heart
    ```
2.  **Run the local development server:**
    ```bash
    npm run dev
    ```

This starts the **MediXR Development Server** on two ports simultaneously:
*   🌐 **HTTP:** `http://localhost:8080` — Best for desktop debugging and normal 3D viewer.
*   🔒 **HTTPS:** `https://localhost:8443` — **Required** for mobile AR and VR WebXR cameras.

The terminal will automatically output your local network IPs (e.g. `https://192.168.1.15:8443`). Use this network URL to open the app on your smartphone or VR headset.

### ⚡ Direct Zapbox Launch Mode
To maximize immersive flow, the loader is configured with **Direct Entry Actions** once assets are fully initialized:
*   **"Enter Zapbox VR Lab"** — Instantly transitions the engine into standard WebXR immersive VR presentation mode. Tapping this button satisfies the browser gesture requirement, launching the headset camera streams and 6DoF controller handlers immediately.
*   **"Explore in Desktop 3D Mode"** — Dismisses the loader and lets you explore the default desktop simulation with mouse controls.

---

## 🔒 Local HTTPS & Mobile Testing Guide

WebXR applications **require a secure connection (HTTPS)** to access the camera (AR) and gyro sensors (VR). 

### Method A: Connect using the Self-Signed Certificate (Recommended)
1.  Verify the terminal printed your local network IP (e.g., `https://192.168.x.x:8443`).
2.  Ensure your computer and mobile phone/headset are connected to the **same Wi-Fi network**.
3.  Open the HTTPS URL on your phone's browser (Safari, Chrome, or Samsung Internet).
4.  Your browser will display a warning saying **"Your connection is not private/secure"** (due to the self-signed certificate).
5.  **Bypass the warning:**
    *   **iOS/Safari:** Tap *Show Details* at the bottom, then tap *visit this website*.
    *   **Android/Chrome:** Tap *Advanced*, then tap *Proceed to [IP Address] (unsafe)*.

### Method B: Treat Insecure Origin as Secure (Fallback)
If the self-signed certificate fails or is blocked on your mobile browser:
1.  Open Chrome on your phone.
2.  Navigate to `chrome://flags/#treat-insecure-origin-as-secure`.
3.  **Enable** the flag: *"Insecure origins treated as secure"*.
4.  Under the input text area, type your HTTP server URL:
    `http://192.168.x.x:8080` (replace with your local IP and HTTP port).
5.  Relaunch Chrome. The browser will now permit camera/WebXR sensor usage over HTTP.

---

## 🗣️ Voice Commands Guide

Click the microphone button (`#btn-voice-toggle`) on the top-right of the HUD to start listening. Use the following verbal command triggers:

| Command Spoken | Action Triggered |
| :--- | :--- |
| **"reset"** / **"restore"** / **"recenter"** | Resets the 3D scene camera and resets modifiers. |
| **"increase size"** / **"zoom in"** / **"scale up"** | Increases the scale of the 3D heart. |
| **"decrease size"** / **"zoom out"** / **"scale down"** | Decreases the scale of the 3D heart. |
| **"rotate heart"** / **"start rotation"** / **"spin heart"** | Enables auto-rotation of the heart. |
| **"stop rotation"** / **"freeze"** | Freezes the heart rotation in place. |
| **"show blood flow"** / **"enable blood flow"** | Shows the animating red/blue blood flow particle streams. |
| **"hide blood flow"** / **"disable blood flow"** | Turns off the blood flow particles. |
| **"show cross section"** / **"slice heart"** | Activates the slicing plane to view inner chambers. |
| **"hide cross section"** / **"unslice heart"** | Deactivates the clipping plane. |
| **"explain heart"** / **"read info"** | Speaks the medical details of the currently selected chamber. |
| **"left ventricle"** / **"highlight left ventricle"** | Focuses and highlights the Left Ventricle chamber. |
| **"right ventricle"** / **"highlight right ventricle"** | Focuses and highlights the Right Ventricle chamber. |
| **"left atrium"** / **"highlight left atrium"** | Focuses and highlights the Left Atrium chamber. |
| **"right atrium"** / **"highlight right atrium"** | Focuses and highlights the Right Atrium chamber. |
| **"aorta"** / **"highlight aorta"** | Focuses and highlights the Aorta blood vessel. |
| **"pulmonary artery"** / **"highlight pulmonary artery"** | Focuses and highlights the Pulmonary Artery. |
| **"vena cava"** / **"highlight vena cava"** | Focuses and highlights the Superior/Inferior Vena Cava. |

---

## ⚙️ Simulation Control Configuration

Use the left sidebar controls to interact with the following parameters:

*   **Heartbeat Animation (Checkbox):** Toggles the pulsing contraction animation.
*   **Blood Flow Visualization (Checkbox):** Shows/hides the procedural particle flows.
*   **Cross-Section (Checkbox + Slider):** Enable slicing and use the depth slider to scroll through the slice path.
*   **Anatomy Label Tags (Checkbox):** Show or hide 3D CSS / canvas labels floating above individual chambers.
*   **Focus Heart Only (Checkbox):** Hides the surrounding skeletal model to isolate the heart.
*   **Transparency Mode (Checkbox):** Turns materials semi-transparent.
*   **Exploded View (Checkbox):** Moves the anatomical components away from each other along their normal directions.
*   **Auto-Rotation Speed (Slider):** Controls the continuous slow-rotation speed.
*   **Heartbeat Speed (BPM Slider):** Speeds up or slows down the heartbeat and particle flow rates dynamically (40–180 BPM).
*   **Anatomy Condition (Dropdown Select):**
    *   *Healthy Heart:* Baseline standard beating and blood flows.
    *   *Myocardial Infarction:* Applies ischemic shaders (dark spots) on the ventricular wall representing necrotic tissue from blockages.
    *   *Valve Disease:* Renders backflow (reversing particles) indicating valve leakage.
    *   *Cardiac Hypertrophy:* Thickens the left ventricle mesh walls to show pathological enlargement.

---

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file (if present) for details.
