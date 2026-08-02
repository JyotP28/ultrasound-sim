// ==========================================
// THE APP ENGINE: Game Logic & Networking
// ==========================================
let score = 0;

// Global State for the Caliper Tool
window.isUSFrozen = false;
window.currentUSDepth = 10;

// SAFETY CHECK: Only generate a fake test if phantom.js exists!
if (typeof generateNewTest === 'function') {
    generateNewTest();
}

function makeDiagnosis(guess) {
    if (typeof currentDiagnosis === 'undefined') return; 
    
    const feedbackEl = document.getElementById('feedback');
    if (guess === currentDiagnosis) {
        score += 10;
        document.getElementById('score-val').innerText = score;
        feedbackEl.innerText = "Correct! Generating next case...";
        feedbackEl.style.color = "#44ff44";
        
        setTimeout(() => {
            feedbackEl.innerText = "Scan the block to find the hidden anomaly.";
            feedbackEl.style.color = "#8b949e";
            if (typeof generateNewTest === 'function') generateNewTest();
        }, 1500);
    } else {
        score -= 5;
        document.getElementById('score-val').innerText = score;
        feedbackEl.innerText = `Incorrect. Look closer at the echogenicity and shadows.`;
        feedbackEl.style.color = "#ff4444";
    }
}

// ==========================================
// DYNAMIC NETWORK CONNECTION (JACKBOX STYLE)
// ==========================================
const roomPIN = Math.floor(1000 + Math.random() * 9000); 
const roomId = 'sim-hosp-' + roomPIN;

const peer = new Peer(roomId);

peer.on('open', (id) => {
    document.getElementById('status').innerText = 'Awaiting probe connection...';
    document.getElementById('status').style.color = '#ffcc00';
    document.getElementById('room-display').innerText = 'Room PIN: ' + roomPIN;
});

peer.on('error', (err) => {
    document.getElementById('status').innerText = 'Network Error: ' + err.type;
    document.getElementById('status').style.color = '#ff4444';
});

peer.on('connection', conn => {
    document.getElementById('status').innerText = 'Probe Connected!';
    document.getElementById('status').style.color = '#58a6ff';
    document.getElementById('room-display').innerText = ''; 

    conn.on('data', data => {
        if(data.depth !== undefined) {
            window.currentUSDepth = data.depth;
            if(typeof setDepth === 'function') setDepth(data.depth);
        }

        if(data.freeze !== undefined) {
            window.isUSFrozen = data.freeze; 
        }
        
        if(window.isUSFrozen === true) return; 

        if(data.a !== undefined && data.a !== null) {
            const euler = new THREE.Euler(
                THREE.MathUtils.degToRad(data.b),
                THREE.MathUtils.degToRad(data.a),
                THREE.MathUtils.degToRad(-data.g),
                'YXZ'
            );
            const q = new THREE.Quaternion().setFromEuler(euler);
            const tiltOffset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
            q.multiply(tiltOffset);
            
            if(typeof setProbeRotation === 'function') setProbeRotation(q);
        }
    });
});