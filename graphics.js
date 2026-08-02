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

window.updateGlobalIMU = function(imuData) {
    if (!imuData) return;
    
    // Fallbacks to prevent NaN crashes
    let beta = (imuData.beta !== null && imuData.beta !== undefined) ? imuData.beta : 90;
    let gamma = (imuData.gamma !== null && imuData.gamma !== undefined) ? imuData.gamma : 0;

    // 1. SLIDING (Translation X) = Left/Right Wrist Tilt (Gamma)
    // Gamma naturally rests at 0 when perfectly straight.
    let clampedGamma = Math.max(-45, Math.min(45, gamma));
    targetSweep = (clampedGamma / 45) * 0.8; 

    // 2. FANNING (Rotation Z) = Forward/Backward Wrist Tilt (Beta)
    // Holding a phone upright means Beta naturally rests at 90 degrees.
    let betaOffset = beta - 90; 
    let clampedBeta = Math.max(-45, Math.min(45, betaOffset));
    
    // Convert to radians and flip the sign for intuitive visual angling
    targetFan = -(clampedBeta * (Math.PI / 180)); 
};

// --- GLOBAL PROBE STATE (Full 3D Quaternion) ---
window.probeState = {
    targetQuat: new THREE.Quaternion(),
    currentQuat: new THREE.Quaternion(),
    baseAlpha: null // Used to calibrate "Forward"
};
const degToRad = Math.PI / 180;

// THE FIX: We define a perfect -90 degree X-axis rotation Quaternion.
// We apply this AFTER calculating the raw sensor math to prevent Gimbal Lock!
const qOffset = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

window.updateGlobalIMU = function(imuData) {
    if (!imuData) return;
    
    let beta = (imuData.beta !== null && imuData.beta !== undefined) ? imuData.beta : 90;
    let alpha = (imuData.alpha !== null && imuData.alpha !== undefined) ? imuData.alpha : 0;
    let gamma = (imuData.gamma !== null && imuData.gamma !== undefined) ? imuData.gamma : 0;

    // Calibrate the compass so "straight ahead" is whatever direction you are facing
    if (window.probeState.baseAlpha === null) window.probeState.baseAlpha = alpha;
    let relAlpha = alpha - window.probeState.baseAlpha;

    // 1. Create the Euler using RAW device angles. 
    // Because we removed the "- 90", pointing straight down (beta = 0) 
    // now sits perfectly on the equator of the math sphere. Zero glitches!
    const euler = new THREE.Euler(
        beta * degToRad,
        relAlpha * degToRad,
        -gamma * degToRad,
        'YXZ'
    );
    
    // 2. Convert raw angles to Quaternion
    window.probeState.targetQuat.setFromEuler(euler);

    // 3. Multiply by the offset globally to visually orient the probe downwards
    window.probeState.targetQuat.multiply(qOffset);
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

    mod1Group = new THREE.Group();
    // Plant the probe fixed on the surface!
    mod1Group.position.set(0, 1.2, 0);
    scene3D.add(mod1Group);

    const probe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.2), new THREE.MeshBasicMaterial({color: 0x888888}));
    mod1Group.add(probe);

    pulseMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), new THREE.MeshBasicMaterial({color: 0x44ff44, transparent: true, opacity: 0}));
    mod1Group.add(pulseMesh);

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
// RENDER LOOP & QUATERNION SLERP
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // 1. SPHERICAL LINEAR INTERPOLATION (SLERP)
    // Smoothly glides the probe's 3D rotation to match the phone's hardware rotation 
    window.probeState.currentQuat.slerp(window.probeState.targetQuat, 0.4);

    // 2. MODULE 1 SPECIFIC LOGIC
    if (Tutorial.currentModule === 1 && mod1Group) {
        // Apply Global Quaternion to Mod 1 Probe
        mod1Group.quaternion.copy(window.probeState.currentQuat);

        if (pulse.active) {
            pulse.localY -= 0.04; 
            pulseMesh.position.y = pulse.localY;

            let pulseWorld = new THREE.Vector3();
            pulseMesh.getWorldPosition(pulseWorld);

            if (pulseWorld.distanceTo(target1.position) < 0.2 && echoes.filter(e => e.id === 1).length === 0) {
                target1.material.color.setHex(0xffffff); 
                echoes.push({ y: target1.position.y, id: 1, mesh: echoMesh1 });
                echoMesh1.material.opacity = 0.8;
                echoMesh1.position.copy(target1.position);
            } else { target1.material.color.setHex(0x2196f3); }

            if (pulseWorld.distanceTo(target2.position) < 0.2 && echoes.filter(e => e.id === 2).length === 0) {
                target2.material.color.setHex(0xffffff); 
                echoes.push({ y: target2.position.y, id: 2, mesh: echoMesh2 });
                echoMesh2.material.opacity = 0.8;
                echoMesh2.position.copy(target2.position);
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

    // Call Module loops if they exist
    if (typeof window.animateMod2 === 'function') window.animateMod2();
    if (typeof window.animateMod3 === 'function') window.animateMod3();
    if (typeof window.animateMod4 === 'function') window.animateMod4(); // ADD THIS LINE

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