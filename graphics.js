// ==========================================
// GRAPHICS ENGINE & GLOBAL IMU
// ==========================================
const container3D = document.getElementById('spatial-view');
let viewportWidth = container3D.clientWidth;
let viewportHeight = container3D.clientHeight;

const scene3D = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(50, viewportWidth / viewportHeight, 0.1, 100);
camera3D.position.set(0, 0, 4); 

const renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer3D.setSize(viewportWidth, viewportHeight);
document.getElementById('canvas-container-3d').appendChild(renderer3D.domElement);

const sceneUS = new THREE.Scene();
const aspectUS = viewportWidth / viewportHeight;
const cameraUS = new THREE.OrthographicCamera(-aspectUS, aspectUS, 1, -1, 0.1, 10);
cameraUS.position.z = 1;

const rendererUS = new THREE.WebGLRenderer({ antialias: true });
rendererUS.setSize(viewportWidth, viewportHeight);
document.getElementById('canvas-container-us').appendChild(rendererUS.domElement);

// --- GLOBAL PROBE STATE (Accessible by all modules) ---
window.probeState = { fanAngle: 0, sweepX: 0 };
let targetFan = 0;
let targetSweep = 0;
const imuQuat = new THREE.Quaternion();
const degToRad = Math.PI / 180;

window.updateGlobalIMU = function(imuData) {
    if (!imuData) return;
    
    // THE FIX: Restored strict sanitization to prevent 'NaN' from deleting the 3D meshes!
    let beta = (imuData.beta !== null && imuData.beta !== undefined) ? imuData.beta : 90;
    let alpha = (imuData.alpha !== null && imuData.alpha !== undefined) ? imuData.alpha : 0;
    let gamma = (imuData.gamma !== null && imuData.gamma !== undefined) ? imuData.gamma : 0;

    const euler = new THREE.Euler(beta * degToRad, alpha * degToRad, -gamma * degToRad, 'YXZ');
    imuQuat.setFromEuler(euler);

    const bottomEdge = new THREE.Vector3(0, -1, 0);
    bottomEdge.applyQuaternion(imuQuat);

    // Left/Right tilt (Roll) = Fanning
    let calcFan = Math.atan2(bottomEdge.x, -bottomEdge.y);
    // Extra safety: if the math fails, default to 0 instead of NaN
    targetFan = isNaN(calcFan) ? 0 : Math.max(-0.78, Math.min(0.78, calcFan)); 

    // Forward/Back tilt (Pitch) = Sweeping (Translation)
    let calcSweep = bottomEdge.z * 1.5; 
    targetSweep = isNaN(calcSweep) ? 0 : Math.max(-0.8, Math.min(0.8, calcSweep)); 
};

// ==========================================
// MODULE 1: THE PULSE-ECHO PRINCIPLE
// ==========================================
let mod1Group, target1, target2, pulseMesh, echoMesh1, echoMesh2, scanDot1, scanDot2;
let pulse = { active: false, localY: -0.5 };
let echoes = []; 

window.loadModule1 = function() {
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);

    // Create a physical group for the probe that moves in 3D
    mod1Group = new THREE.Group();
    mod1Group.position.set(0, 1.2, 0);
    scene3D.add(mod1Group);

    const probe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.2), new THREE.MeshBasicMaterial({color: 0x888888}));
    mod1Group.add(probe);

    // The pulse is attached to the probe so it shoots in the direction of the tilt!
    pulseMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), new THREE.MeshBasicMaterial({color: 0x44ff44, transparent: true, opacity: 0}));
    mod1Group.add(pulseMesh);

    // Static Targets
    target1 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshBasicMaterial({color: 0x2196f3}));
    target1.position.set(0, 0.2, 0);
    scene3D.add(target1);

    target2 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshBasicMaterial({color: 0x2196f3}));
    target2.position.set(0, -1.0, 0);
    scene3D.add(target2);

    echoMesh1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.02), new THREE.MeshBasicMaterial({color: 0x58a6ff, transparent: true, opacity: 0}));
    echoMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.02), new THREE.MeshBasicMaterial({color: 0x58a6ff, transparent: true, opacity: 0}));
    scene3D.add(echoMesh1);
    scene3D.add(echoMesh2);

    scanDot1 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0}));
    scanDot1.position.set(0, 0.3, 0); 
    sceneUS.add(scanDot1);

    scanDot2 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0}));
    scanDot2.position.set(0, -0.7, 0); 
    sceneUS.add(scanDot2);

    pulse = { active: false, localY: -0.5 };
    echoes = [];
};

loadModule1();

window.triggerPulseAnimation = function() {
    if (pulse.active) return;
    pulse.active = true;
    pulse.localY = -0.6; 
    pulseMesh.material.opacity = 0.8;
    scanDot1.material.opacity = 0;
    scanDot2.material.opacity = 0;
    echoes = [];
};

// ==========================================
// RENDER LOOP & PHYSICS LERP
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // 1. GLOBAL PHYSICS LERP (Smooths motion for all modules)
    window.probeState.fanAngle += (targetFan - window.probeState.fanAngle) * 0.1;
    window.probeState.sweepX += (targetSweep - window.probeState.sweepX) * 0.1;

    // 2. MODULE 1 SPECIFIC LOGIC
    if (Tutorial.currentModule === 1 && mod1Group) {
        // Apply Global Physics to Mod 1 Probe
        mod1Group.position.x = window.probeState.sweepX;
        mod1Group.rotation.z = window.probeState.fanAngle;

        if (pulse.active) {
            pulse.localY -= 0.04; 
            pulseMesh.position.y = pulse.localY;

            // Get global position of the traveling pulse for collision detection
            let pulseWorld = new THREE.Vector3();
            pulseMesh.getWorldPosition(pulseWorld);

            if (pulseWorld.distanceTo(target1.position) < 0.2 && echoes.filter(e => e.id === 1).length === 0) {
                target1.material.color.setHex(0xffffff); 
                echoes.push({ y: target1.position.y, id: 1, mesh: echoMesh1 });
                echoMesh1.material.opacity = 0.8;
                echoMesh1.position.x = target1.position.x;
                echoMesh1.position.y = target1.position.y;
            } else { target1.material.color.setHex(0x2196f3); }

            if (pulseWorld.distanceTo(target2.position) < 0.2 && echoes.filter(e => e.id === 2).length === 0) {
                target2.material.color.setHex(0xffffff); 
                echoes.push({ y: target2.position.y, id: 2, mesh: echoMesh2 });
                echoMesh2.material.opacity = 0.8;
                echoMesh2.position.x = target2.position.x;
                echoMesh2.position.y = target2.position.y;
            } else { target2.material.color.setHex(0x2196f3); }

            if (pulse.localY < -3.5) { pulse.active = false; pulseMesh.material.opacity = 0; } 
        }

        for(let i = echoes.length - 1; i >= 0; i--) {
            let echo = echoes[i];
            echo.y += 0.04; 
            echo.mesh.position.y = echo.y;
            if (echo.y >= 1.0) {
                echo.mesh.material.opacity = 0; 
                if (echo.id === 1) scanDot1.material.opacity = 1.0;
                if (echo.id === 2) scanDot2.material.opacity = 1.0;
                echoes.splice(i, 1); 
            }
        }
    }

    // Call Module 2/3 update loops if they exist
    if (typeof window.animateMod2 === 'function') window.animateMod2();
    if (typeof window.animateMod3 === 'function') window.animateMod3();

    renderer3D.render(scene3D, camera3D);
    rendererUS.render(sceneUS, cameraUS);
}

window.addEventListener('resize', () => {
    viewportWidth = container3D.clientWidth;
    viewportHeight = container3D.clientHeight;
    renderer3D.setSize(viewportWidth, viewportHeight);
    camera3D.aspect = viewportWidth / viewportHeight;
    camera3D.updateProjectionMatrix();
    rendererUS.setSize(viewportWidth, viewportHeight);
    const aspectUS = viewportWidth / viewportHeight;
    cameraUS.left = -aspectUS;
    cameraUS.right = aspectUS;
    cameraUS.updateProjectionMatrix();
});

animate();