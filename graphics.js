// Calculate dimensions based on the new stacked HTML containers
const container3D = document.getElementById('spatial-view');
let viewportWidth = container3D.clientWidth;
let viewportHeight = container3D.clientHeight;

// --- Left Viewport (3D Spatial World) ---
const scene3D = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(50, viewportWidth / viewportHeight, 0.1, 100);
camera3D.position.set(0, 0, 4); 

const renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer3D.setSize(viewportWidth, viewportHeight);
document.getElementById('canvas-container-3d').appendChild(renderer3D.domElement);

// --- Right Viewport (2D Ultrasound Monitor) ---
const sceneUS = new THREE.Scene();
const aspectUS = viewportWidth / viewportHeight;
const cameraUS = new THREE.OrthographicCamera(-aspectUS, aspectUS, 1, -1, 0.1, 10);
cameraUS.position.z = 1;

const rendererUS = new THREE.WebGLRenderer({ antialias: true });
rendererUS.setSize(viewportWidth, viewportHeight);
document.getElementById('canvas-container-us').appendChild(rendererUS.domElement);

// ==========================================
// MODULE 1: THE PULSE-ECHO PRINCIPLE
// (Chunked logic specific to this lesson)
// ==========================================

// 3D Assets
const probe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.2), new THREE.MeshBasicMaterial({color: 0x888888}));
probe.position.y = 1.5;
scene3D.add(probe);

const target1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({color: 0x2196f3}));
target1.position.y = 0.5; // Shallow target
scene3D.add(target1);

const target2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({color: 0x2196f3}));
target2.position.y = -1.0; // Deep target
scene3D.add(target2);

// The Sound Wave (Pulse)
const pulseMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), new THREE.MeshBasicMaterial({color: 0x44ff44, transparent: true, opacity: 0}));
scene3D.add(pulseMesh);

// The Returning Echoes
const echoMesh1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.02), new THREE.MeshBasicMaterial({color: 0x58a6ff, transparent: true, opacity: 0}));
const echoMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.02), new THREE.MeshBasicMaterial({color: 0x58a6ff, transparent: true, opacity: 0}));
scene3D.add(echoMesh1);
scene3D.add(echoMesh2);

// Ultrasound Monitor Assets (The Scan Lines)
const scanDot1 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0}));
scanDot1.position.set(0, 0.3, 0); // Mapped to shallow depth
sceneUS.add(scanDot1);

const scanDot2 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0}));
scanDot2.position.set(0, -0.7, 0); // Mapped to deep depth
sceneUS.add(scanDot2);

// Animation State
let pulse = { active: false, y: 1.5 };
let echoes = []; 

// This is called by app.js when the phone presses FIRE
window.triggerPulseAnimation = function() {
    if (pulse.active) return;
    
    // Reset visuals
    pulse.active = true;
    pulse.y = 1.3; // Start just below probe
    pulseMesh.material.opacity = 0.8;
    
    scanDot1.material.opacity = 0;
    scanDot2.material.opacity = 0;
    echoes = [];
};

// ==========================================
// THE RENDER LOOP (Physics & Drawing)
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // 1. ANIMATE THE PULSE GOING DOWN
    if (pulse.active) {
        pulse.y -= 0.04; 
        pulseMesh.position.y = pulse.y;

        // Hit Shallow Target? Spawn an upward echo!
        if (Math.abs(pulse.y - target1.position.y) < 0.02 && echoes.filter(e => e.id === 1).length === 0) {
            target1.material.color.setHex(0xffffff); // Flash target
            echoes.push({ y: target1.position.y, id: 1, mesh: echoMesh1 });
            echoMesh1.material.opacity = 0.8;
            echoMesh1.position.y = target1.position.y;
        } else { target1.material.color.setHex(0x2196f3); }

        // Hit Deep Target? Spawn an upward echo!
        if (Math.abs(pulse.y - target2.position.y) < 0.02 && echoes.filter(e => e.id === 2).length === 0) {
            target2.material.color.setHex(0xffffff); // Flash target
            echoes.push({ y: target2.position.y, id: 2, mesh: echoMesh2 });
            echoMesh2.material.opacity = 0.8;
            echoMesh2.position.y = target2.position.y;
        } else { target2.material.color.setHex(0x2196f3); }

        // Hide pulse when it passes the screen
        if (pulse.y < -2.5) { 
            pulse.active = false; 
            pulseMesh.material.opacity = 0; 
        } 
    }

    // 2. ANIMATE THE ECHOES GOING BACK UP
    for(let i = echoes.length - 1; i >= 0; i--) {
        let echo = echoes[i];
        echo.y += 0.04; // Travel back to probe
        echo.mesh.position.y = echo.y;

        // Did the echo reach the transducer?
        if (echo.y >= 1.3) {
            echo.mesh.material.opacity = 0; // Hide echo
            
            // Draw the returning echo as a scan line on the Ultrasound Monitor!
            if (echo.id === 1) scanDot1.material.opacity = 1.0;
            if (echo.id === 2) scanDot2.material.opacity = 1.0;
            
            echoes.splice(i, 1); // Remove from tracking array
        }
    }

    renderer3D.render(scene3D, camera3D);
    rendererUS.render(sceneUS, cameraUS);
}

// Window resizing handler
window.addEventListener('resize', () => {
    viewportWidth = container3D.clientWidth;
    viewportHeight = container3D.clientHeight;
    
    // Update 3D Spatial Camera
    renderer3D.setSize(viewportWidth, viewportHeight);
    camera3D.aspect = viewportWidth / viewportHeight;
    camera3D.updateProjectionMatrix();
    
    // Update 2D Ultrasound Camera (Prevents Stretching!)
    rendererUS.setSize(viewportWidth, viewportHeight);
    const aspectUS = viewportWidth / viewportHeight;
    cameraUS.left = -aspectUS;
    cameraUS.right = aspectUS;
    cameraUS.top = 1;
    cameraUS.bottom = -1;
    cameraUS.updateProjectionMatrix();
});

animate();