// ==========================================
// THE APP ENGINE: Game Logic & Networking
// ==========================================
let score = 0;

// Initialize the first level
generateNewTest();

function makeDiagnosis(guess) {
    const feedbackEl = document.getElementById('feedback');
    if (guess === currentDiagnosis) {
        score += 10;
        document.getElementById('score-val').innerText = score;
        feedbackEl.innerText = "Correct! Generating next case...";
        feedbackEl.style.color = "#44ff44";
        
        setTimeout(() => {
            feedbackEl.innerText = "Scan the block to find the hidden anomaly.";
            feedbackEl.style.color = "#aaa";
            generateNewTest();
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
// Generate a random 4-digit PIN
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
    document.getElementById('status').style.color = '#00ffcc';
    document.getElementById('room-display').innerText = ''; // Hide the PIN to save space

    conn.on('data', data => {
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
            
            // Pass the data to graphics.js
            setProbeRotation(q);
        }
    });
});