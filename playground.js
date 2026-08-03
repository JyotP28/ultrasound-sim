// ==========================================
// PLAYGROUND MODE: LASER TRACE GAME
// ==========================================

let pgGroup, laserMesh;
let checkpoints = [];
let currentCheckpointIndex = 0;
let gameActive = false;
let startTime = 0;
let scoreOverlay;

// The Laser Raycaster
const raycaster = new THREE.Raycaster();
const laserDirection = new THREE.Vector3(0, -1, 0); // Laser points straight down from the probe

window.loadPlayground = function() {
    // Clear out the educational modules
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);

    pgGroup = new THREE.Group();
    pgGroup.position.set(0, 1.0, 0); // Moved probe down slightly for better centering
    scene3D.add(pgGroup);

    // 1. Render the Probe
    const probe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.2), new THREE.MeshBasicMaterial({color: 0x888888}));
    pgGroup.add(probe);

    // 2. Render the Laser Beam
    const laserGeo = new THREE.CylinderGeometry(0.015, 0.015, 10, 8);
    laserGeo.translate(0, -5, 0); // Shift origin so it scales down from the probe
    laserMesh = new THREE.Mesh(laserGeo, new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.8}));
    pgGroup.add(laserMesh);

    // 3. Build the 3D Checkpoint Ring
    checkpoints = [];
    const radius = 1.4; // Tightened the circle so it doesn't run off the edges of the screen
    const numPoints = 12;
    
    for (let i = 0; i < numPoints; i++) {
        let angle = (i / numPoints) * Math.PI * 2;
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * radius;
        
        // Made the spheres slightly larger (0.35) so they are easier to hit
        let cpMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            new THREE.MeshBasicMaterial({color: 0x333333}) 
        );
        
        // THE FIX: Brought the targets UP from -3.0 to -1.2 so they are clearly visible!
        cpMesh.position.set(x, -1.2, z); 
        scene3D.add(cpMesh);
        checkpoints.push(cpMesh);
    }

    createScoreUI();
    resetGame();
};

// Dynamically injects a retro arcade score screen over the 3D view
function createScoreUI() {
    if (document.getElementById('pg-score-ui')) return;
    
    scoreOverlay = document.createElement('div');
    scoreOverlay.id = 'pg-score-ui';
    scoreOverlay.style.position = 'absolute';
    scoreOverlay.style.top = '50%';
    scoreOverlay.style.left = '50%';
    scoreOverlay.style.transform = 'translate(-50%, -50%)';
    scoreOverlay.style.backgroundColor = 'rgba(22, 27, 34, 0.95)';
    scoreOverlay.style.padding = '40px';
    scoreOverlay.style.borderRadius = '15px';
    scoreOverlay.style.border = '2px solid #2ea043';
    scoreOverlay.style.color = '#fff';
    scoreOverlay.style.textAlign = 'center';
    scoreOverlay.style.display = 'none';
    scoreOverlay.style.zIndex = '1000';
    scoreOverlay.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    
    scoreOverlay.innerHTML = `
        <h2 style="margin-top:0; color: #44ff44; letter-spacing: 2px;">TRACE COMPLETE!</h2>
        <div style="font-size: 24px; margin: 15px 0; color: #8b949e;">Time: <span id="pg-time">0.0</span>s</div>
        <div style="font-size: 48px; font-weight: bold; margin-bottom: 25px; color: #58a6ff;">SCORE: <span id="pg-score">0</span></div>
        <button onclick="resetGame()" style="font-size: 20px; padding: 15px 30px; background: #238636; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(35, 134, 54, 0.4);">Play Again</button>
    `;
    
    document.getElementById('spatial-view').appendChild(scoreOverlay);
}

window.resetGame = function() {
    currentCheckpointIndex = 0;
    gameActive = true;
    startTime = Date.now();
    
    if (scoreOverlay) scoreOverlay.style.display = 'none';

    // Reset all checkpoints to grey, and turn the first one yellow
    checkpoints.forEach((cp, index) => {
        cp.scale.set(1, 1, 1);
        if (index === 0) {
            cp.material.color.setHex(0xffff00); // Glowing Yellow
        } else {
            cp.material.color.setHex(0x333333); // Dim Grey
        }
    });
};

function finishGame() {
    gameActive = false;
    let timeTaken = (Date.now() - startTime) / 1000;
    
    // Scoring Algorithm: 15,000 base points. Lose 250 points for every second it takes!
    let score = Math.max(0, Math.floor(15000 - (timeTaken * 250)));
    
    document.getElementById('pg-time').innerText = timeTaken.toFixed(1);
    document.getElementById('pg-score').innerText = score.toLocaleString();
    scoreOverlay.style.display = 'block';
}

// ==========================================
// THE GAME LOOP (Called every frame by graphics.js)
// ==========================================
window.animatePlayground = function() {
    // Only run if we are actually in Playground mode
    if (Tutorial.currentModule !== 'playground' || !pgGroup) return;

    // 1. Glides the probe to match your phone's physical hardware rotation
    pgGroup.quaternion.copy(window.probeState.currentQuat);

    if (!gameActive) return;

    let activeCp = checkpoints[currentCheckpointIndex];
    
    // 2. Add a pulsing visual effect to the target you need to hit
    if (activeCp) {
        let scale = 1.0 + 0.15 * Math.sin(Date.now() * 0.005);
        activeCp.scale.set(scale, scale, scale);
    }

    // 3. Fire the Raycaster (Collision Detection)
    let probeWorldPos = new THREE.Vector3();
    pgGroup.getWorldPosition(probeWorldPos);
    
    let currentLaserDir = laserDirection.clone().applyQuaternion(pgGroup.quaternion).normalize();
    raycaster.set(probeWorldPos, currentLaserDir);

    // 4. Check if the laser intersected with the active checkpoint sphere
    let intersects = raycaster.intersectObject(activeCp);
    
    if (intersects.length > 0) {
        // HIT DETECTED!
        activeCp.material.color.setHex(0x44ff44); // Turn it Success Green
        activeCp.scale.set(1, 1, 1); // Stop pulsing
        
        currentCheckpointIndex++;
        
        // Did we hit the last one?
        if (currentCheckpointIndex >= checkpoints.length) {
            finishGame();
        } else {
            // If not, light up the next one in the circle!
            checkpoints[currentCheckpointIndex].material.color.setHex(0xffff00);
        }
    }
};