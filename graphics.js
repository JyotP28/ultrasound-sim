// ==========================================
// GRAPHICS ENGINE (The Scene Manager)
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

// ==========================================
// MODULE 1: THE PULSE-ECHO PRINCIPLE
// ==========================================

// Global variable declarations for animation tracking
let target1, target2, pulseMesh, echoMesh1, echoMesh2, scanDot1, scanDot2;
let pulse = { active: false, y: 1.5 };
let echoes = []; 

window.loadModule1 = function() {
    // 1. CLEAR ANY PREVIOUS MODULES
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);

    // 2. REBUILD MODULE 1 SCENE
    const probe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.2), new THREE.MeshBasicMaterial({color: 0x888888}));
    probe.position.y = 1.5;
    scene3D.add(probe);

    target1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({color: 0x2196f3}));
    target1.position.y = 0.5;
    scene3D.add(target1);

    target2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({color: 0x2196f3}));
    target2.position.y = -1.0;
    scene3D.add(target2);

    pulseMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), new THREE.MeshBasicMaterial({color: 0x44ff44, transparent: true, opacity: 0}));
    scene3D.add(pulseMesh);

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

    // Reset Animation state
    pulse = { active: false, y: 1.5 };
    echoes = [];
};

// Start by loading Mod 1 when the page boots up
loadModule1();

window.triggerPulseAnimation = function() {
    if (pulse.active) return;
    pulse.active = true;
    pulse.y = 1.3; 
    pulseMesh.material.opacity = 0.8;
    scanDot1.material.opacity = 0;
    scanDot2.material.opacity = 0;
    echoes = [];
};

// ==========================================
// RENDER LOOP & RESIZING
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // Only run this specific animation if Module 1's assets are currently loaded
    if (Tutorial.currentModule === 1 && pulse.active && target1 && target2) {
        pulse.y -= 0.04; 
        pulseMesh.position.y = pulse.y;

        if (Math.abs(pulse.y - target1.position.y) < 0.02 && echoes.filter(e => e.id === 1).length === 0) {
            target1.material.color.setHex(0xffffff); 
            echoes.push({ y: target1.position.y, id: 1, mesh: echoMesh1 });
            echoMesh1.material.opacity = 0.8;
            echoMesh1.position.y = target1.position.y;
        } else { target1.material.color.setHex(0x2196f3); }

        if (Math.abs(pulse.y - target2.position.y) < 0.02 && echoes.filter(e => e.id === 2).length === 0) {
            target2.material.color.setHex(0xffffff); 
            echoes.push({ y: target2.position.y, id: 2, mesh: echoMesh2 });
            echoMesh2.material.opacity = 0.8;
            echoMesh2.position.y = target2.position.y;
        } else { target2.material.color.setHex(0x2196f3); }

        if (pulse.y < -2.5) { pulse.active = false; pulseMesh.material.opacity = 0; } 
    }

    if (Tutorial.currentModule === 1) {
        for(let i = echoes.length - 1; i >= 0; i--) {
            let echo = echoes[i];
            echo.y += 0.04; 
            echo.mesh.position.y = echo.y;

            if (echo.y >= 1.3) {
                echo.mesh.material.opacity = 0; 
                if (echo.id === 1) scanDot1.material.opacity = 1.0;
                if (echo.id === 2) scanDot2.material.opacity = 1.0;
                echoes.splice(i, 1); 
            }
        }
    }

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
    cameraUS.top = 1;
    cameraUS.bottom = -1;
    cameraUS.updateProjectionMatrix();
});

animate();