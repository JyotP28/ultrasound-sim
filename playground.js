// ==========================================
// PLAYGROUND MODE: MULTI-STAGE STABLE SMOOTHNESS
// ==========================================

let pgGroup, laserMesh, floorPlane;
let checkpoints = [];
let radarCheckpoints = []; 
let radarCursor;
let currentCheckpointIndex = 0;
let gameActive = false;
let startTime = 0;
let globalStartTime = 0;
let totalScore = 0;
let currentLevel = 1;
let scoreOverlay;
let liveHud;

const MAX_TRAIL_POINTS = 100;
let trailPoints = [];
let trailLine, radarTrailLine;

const raycaster = new THREE.Raycaster();
const laserDirection = new THREE.Vector3(0, -1, 0); 
const RADAR_SCALE = 0.5; 

// --- WEB AUDIO SYNTHESIZER ---
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playDing() {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playSuccess() {
    if (!audioCtx) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { 
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0, audioCtx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.5);
        
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.6);
    });
}

function createLiveHUD() {
    if (document.getElementById('pg-live-hud')) {
        liveHud = document.getElementById('pg-live-hud');
        return;
    }
    liveHud = document.createElement('div');
    liveHud.id = 'pg-live-hud';
    liveHud.style.position = 'absolute';
    liveHud.style.top = '15px';
    liveHud.style.right = '15px';
    liveHud.style.backgroundColor = 'rgba(13, 17, 23, 0.85)';
    liveHud.style.padding = '10px 20px';
    liveHud.style.borderRadius = '8px';
    liveHud.style.border = '1px solid #30363d';
    liveHud.style.color = '#8b949e';
    liveHud.style.fontFamily = 'monospace';
    liveHud.style.fontSize = '18px';
    liveHud.style.zIndex = '500';
    liveHud.style.pointerEvents = 'none';
    liveHud.innerHTML = `SCORE: <span id="live-score-val" style="color:#58a6ff; font-weight:bold; font-size: 22px;">0</span>`;
    
    document.getElementById('spatial-view').appendChild(liveHud);
}

function createScoreUI() {
    if (document.getElementById('pg-score-ui')) {
        scoreOverlay = document.getElementById('pg-score-ui');
        return;
    }
    scoreOverlay = document.createElement('div');
    scoreOverlay.id = 'pg-score-ui';
    scoreOverlay.style.position = 'absolute';
    scoreOverlay.style.top = '50%';
    scoreOverlay.style.left = '50%';
    scoreOverlay.style.transform = 'translate(-50%, -50%)';
    scoreOverlay.style.backgroundColor = 'rgba(13, 17, 23, 0.95)';
    scoreOverlay.style.padding = '40px';
    scoreOverlay.style.borderRadius = '15px';
    scoreOverlay.style.border = '2px solid #58a6ff';
    scoreOverlay.style.color = '#fff';
    scoreOverlay.style.textAlign = 'center';
    scoreOverlay.style.display = 'none';
    scoreOverlay.style.zIndex = '1000';
    scoreOverlay.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8)';
    
    scoreOverlay.innerHTML = `
        <h2 style="margin-top:0; color: #58a6ff; letter-spacing: 2px;">ALL STAGES CLEARED!</h2>
        <div style="font-size: 24px; margin: 15px 0; color: #8b949e;">Total Time: <span id="pg-time">0.0</span>s</div>
        <div style="font-size: 48px; font-weight: bold; margin-bottom: 25px; color: #44ff44;">FINAL SCORE: <span id="pg-score">0</span></div>
        <button onclick="window.loadPlayground()" style="font-size: 20px; padding: 15px 30px; background: #238636; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Play Again</button>
    `;
    document.getElementById('spatial-view').appendChild(scoreOverlay);
}

window.loadPlayground = function() {
    initAudio(); 
    
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);

    pgGroup = new THREE.Group();
    pgGroup.position.set(0, 1.0, 0); 
    scene3D.add(pgGroup);

    const probeMat = new THREE.MeshPhongMaterial({color: 0x555555, specular: 0x222222, shininess: 30});
    const probe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.2), probeMat);
    pgGroup.add(probe);

    const laserGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 8);
    laserGeo.translate(0, -0.5, 0); 
    laserMesh = new THREE.Mesh(laserGeo, new THREE.MeshBasicMaterial({color: 0xff0044, transparent: true, opacity: 0.8}));
    pgGroup.add(laserMesh);

    const gridHelper = new THREE.GridHelper(8, 24, 0x58a6ff, 0x30363d);
    gridHelper.position.y = -1.2;
    scene3D.add(gridHelper);

    floorPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshBasicMaterial({visible: false})
    );
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = -1.2;
    scene3D.add(floorPlane);

    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({color: 0xff0044, linewidth: 2}));
    scene3D.add(trailLine);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene3D.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 5, 2);
    scene3D.add(dirLight);

    const radarGrid = new THREE.GridHelper(10, 20, 0x1f6feb, 0x161b22);
    radarGrid.rotation.x = Math.PI / 2; 
    sceneUS.add(radarGrid);
    
    radarCursor = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 16),
        new THREE.MeshBasicMaterial({color: 0xff0044})
    );
    radarCursor.position.z = 0.1; 
    sceneUS.add(radarCursor);

    const radarTrailGeo = new THREE.BufferGeometry();
    const radarTrailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
    radarTrailGeo.setAttribute('position', new THREE.BufferAttribute(radarTrailPositions, 3));
    radarTrailLine = new THREE.Line(radarTrailGeo, new THREE.LineBasicMaterial({color: 0xff0044, linewidth: 2}));
    sceneUS.add(radarTrailLine);

    const topLeftText = document.querySelector('#us-monitor .top-left');
    const topRightText = document.querySelector('#us-monitor .top-right');
    if (topLeftText) topLeftText.innerHTML = 'TOP-DOWN RADAR<br>TARGET ACQUISITION';
    if (topRightText) topRightText.innerHTML = 'Mode: Trace<br>Status: Active';

    createLiveHUD();
    createScoreUI();
    
    // THE FIX: Explicitly hide the pop-up and show the live HUD when restarting
    if (scoreOverlay) scoreOverlay.style.display = 'none';
    if (liveHud) liveHud.style.display = 'block';
    
    totalScore = 0;
    globalStartTime = Date.now();
    currentLevel = 1;
    loadPlaygroundLevel(currentLevel);
};

window.loadPlaygroundLevel = function(level) {
    checkpoints.forEach(cp => scene3D.remove(cp));
    radarCheckpoints.forEach(cp => sceneUS.remove(cp));
    checkpoints = [];
    radarCheckpoints = [];
    trailPoints = []; 
    
    let points = [];

    if (level === 1) { 
        for (let i = 0; i < 12; i++) {
            let angle = (i / 12) * Math.PI * 2;
            points.push({x: Math.cos(angle) * 1.4, z: Math.sin(angle) * 1.4});
        }
    } else if (level === 2) { 
        for (let i = 0; i < 16; i++) {
            let t = (i / 16) * Math.PI * 2;
            let scale = 1.8;
            let x = (scale * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
            let z = (scale * Math.cos(t) * Math.sin(t)) / (1 + Math.sin(t) * Math.sin(t));
            points.push({x: x, z: z});
        }
    } else if (level === 3) { 
        points = [
            {x: -1.5, z: -1.2}, {x: 0, z: -0.2}, {x: 1.5, z: -1.2},
            {x: 1.0, z: 1.2},   {x: 0, z: 0.2},  {x: -1.0, z: 1.2},
            {x: -1.5, z: 0},    {x: 1.5, z: 0}
        ];
    }

    points.forEach((p, index) => {
        let cpMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16), 
            new THREE.MeshPhongMaterial({color: (index === 0) ? 0xffd700 : 0x333333}) 
        );
        cpMesh.position.set(p.x, -1.2, p.z); 
        scene3D.add(cpMesh);
        checkpoints.push(cpMesh);

        let radarCp = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.12, 16),
            new THREE.MeshBasicMaterial({color: (index === 0) ? 0xffd700 : 0x333333, side: THREE.DoubleSide})
        );
        radarCp.position.set(p.x * RADAR_SCALE, -p.z * RADAR_SCALE, 0);
        sceneUS.add(radarCp);
        radarCheckpoints.push(radarCp);
    });

    currentCheckpointIndex = 0;
    startTime = Date.now();
    gameActive = true;

    if (window.Tutorial && window.Tutorial.updatePlaygroundUI) {
        window.Tutorial.updatePlaygroundUI(level);
    }
};

function updateTrail(hitPoint) {
    trailPoints.push(hitPoint.clone());
    if (trailPoints.length > MAX_TRAIL_POINTS) {
        trailPoints.shift(); 
    }
    
    const positions = trailLine.geometry.attributes.position.array;
    const radarPositions = radarTrailLine.geometry.attributes.position.array;
    
    for (let i = 0; i < trailPoints.length; i++) {
        positions[i * 3] = trailPoints[i].x;
        positions[i * 3 + 1] = trailPoints[i].y + 0.02; 
        positions[i * 3 + 2] = trailPoints[i].z;
        
        radarPositions[i * 3] = trailPoints[i].x * RADAR_SCALE;
        radarPositions[i * 3 + 1] = -trailPoints[i].z * RADAR_SCALE;
        radarPositions[i * 3 + 2] = 0.05; 
    }
    
    trailLine.geometry.attributes.position.needsUpdate = true;
    radarTrailLine.geometry.attributes.position.needsUpdate = true;
    
    trailLine.geometry.setDrawRange(0, trailPoints.length);
    radarTrailLine.geometry.setDrawRange(0, trailPoints.length);
}

function finishGame() {
    gameActive = false;
    
    let totalTimeTaken = (Date.now() - globalStartTime) / 1000;
    if (liveHud) liveHud.style.display = 'none';
    
    document.getElementById('pg-time').innerText = totalTimeTaken.toFixed(1);
    document.getElementById('pg-score').innerText = totalScore.toLocaleString();
    scoreOverlay.style.display = 'block';

    if (window.Tutorial && window.Tutorial.updatePlaygroundUI) {
        window.Tutorial.updatePlaygroundUI('win');
    }
}

// ==========================================
// THE GAME LOOP (Called every frame)
// ==========================================
window.animatePlayground = function() {
    if (Tutorial.currentModule !== 'playground' || !pgGroup) return;

    if (window.probeState.currentQuat) {
        pgGroup.quaternion.copy(window.probeState.currentQuat);
    }

    if (gameActive) {
        let timeTaken = (Date.now() - startTime) / 1000;
        let currentDisplayScore = totalScore + Math.max(0, Math.floor(15000 - (timeTaken * 250)));
        let scoreEl = document.getElementById('live-score-val');
        if (scoreEl) scoreEl.innerText = currentDisplayScore.toLocaleString();
    }

    if (!gameActive) return;

    let activeCp = checkpoints[currentCheckpointIndex];
    let activeRadarCp = radarCheckpoints[currentCheckpointIndex];
    
    if (activeCp) {
        let scale = 1.0 + 0.25 * Math.sin(Date.now() * 0.006);
        activeCp.scale.set(scale, scale, scale);
        activeRadarCp.scale.set(scale, scale, scale);
    }

    let probeWorldPos = new THREE.Vector3();
    pgGroup.getWorldPosition(probeWorldPos);
    let currentLaserDir = laserDirection.clone().applyQuaternion(pgGroup.quaternion).normalize();
    raycaster.set(probeWorldPos, currentLaserDir);

    let floorIntersects = raycaster.intersectObject(floorPlane);
    if (floorIntersects.length > 0) {
        let hit = floorIntersects[0];
        laserMesh.scale.y = hit.distance;
        updateTrail(hit.point);
        radarCursor.position.set(hit.point.x * RADAR_SCALE, -hit.point.z * RADAR_SCALE, 0.1);
    } else {
        laserMesh.scale.y = 10; 
    }

    let intersects = raycaster.intersectObject(activeCp);
    
    if (intersects.length > 0) {
        playDing(); 

        activeCp.material.color.setHex(0x44ff44); 
        activeCp.scale.set(1, 1, 1); 
        activeRadarCp.material.color.setHex(0x44ff44); 
        activeRadarCp.scale.set(1, 1, 1);

        currentCheckpointIndex++;
        
        if (currentCheckpointIndex >= checkpoints.length) {
            playSuccess();
            gameActive = false;
            
            let timeTaken = (Date.now() - startTime) / 1000;
            totalScore += Math.max(0, Math.floor(15000 - (timeTaken * 250)));
            
            if (currentLevel < 3) {
                setTimeout(() => {
                    currentLevel++;
                    loadPlaygroundLevel(currentLevel);
                }, 1500);
            } else {
                finishGame();
            }

        } else {
            checkpoints[currentCheckpointIndex].material.color.setHex(0xffd700);
            radarCheckpoints[currentCheckpointIndex].material.color.setHex(0xffd700);
        }
    }
};