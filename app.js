// The App Engine: Handles Game Logic and Networking
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

// Network Connection
const peer = new Peer('us-sim-room-1');

peer.on('connection', conn => {
    document.getElementById('status').innerText = 'Probe Connected!';
    document.getElementById('status').style.color = '#00ffcc';

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
            
            // Pass the data to the graphics engine
            setProbeRotation(q);
        }
    });
});

// ==========================================
// Network Connection
// ==========================================
const peer = new Peer('us-sim-room-2'); // <-- Changed to room 2!

peer.on('error', (err) => {
    // If the ID is taken or network fails, show it on the screen!
    document.getElementById('status').innerText = 'Network Error: ' + err.type;
    document.getElementById('status').style.color = '#ff4444';
});

peer.on('connection', conn => {
    document.getElementById('status').innerText = 'Probe Connected!';
    document.getElementById('status').style.color = '#00ffcc';

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
            
            // Pass the data to the graphics engine
            setProbeRotation(q);
        }
    });
});