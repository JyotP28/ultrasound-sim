// ==========================================
// APP.JS - MASTER ENGINE & CURRICULUM LOGIC
// ==========================================

const ABLY_API_KEY = 'PASTE_YOUR_ABLY_API_KEY_HERE'; // <-- Don't forget your key!

window.probeState = {
    currentQuat: {
        _x: 0, _y: 0, _z: 0, _w: 1,
        isQuaternion: true,
        clone: function() { return this; },
        copy: function() { return this; },
        slerp: function() { return this; }
    },
    targetQuat: null
};

// THE FIX: Variables for the Safe Zero Offset
window.needsRecenter = false;
window.baseOffset = null; 

let vrQ0 = null, vrQ1 = null, vrZee = null;
let roomPIN = Math.floor(1000 + Math.random() * 9000).toString();
let activeP2PConn = null, ablyChannel = null;

// ==========================================
// 1. NETWORK & MATH LOGIC
// ==========================================
function handleIncomingData(data) {
    if (!vrQ0 && typeof THREE !== 'undefined') {
        window.probeState.currentQuat = new THREE.Quaternion();
        window.probeState.targetQuat = new THREE.Quaternion();
        window.baseOffset = new THREE.Quaternion();
        vrQ0 = new THREE.Quaternion();
        vrQ1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
        vrZee = new THREE.Vector3(0, 0, 1);
    }

    if (data.command === 'recenter') {
        window.needsRecenter = true;
        return;
    }
    if (data.command === 'restart' && window.resetGame) return window.resetGame();

    if (data.orientation && typeof THREE !== 'undefined') {
        const alpha = (data.orientation.alpha || 0) * (Math.PI / 180);
        const beta = (data.orientation.beta || 0) * (Math.PI / 180);
        const gamma = (data.orientation.gamma || 0) * (Math.PI / 180);

        const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
        let rawQ = new THREE.Quaternion().setFromEuler(euler);

        // THE FIX: Safely zero the probe without Gimbal Lock!
        // We capture the exact inverse of your current weird holding angle, 
        // making it mathematically evaluate to absolute zero (0,0,0).
        if (window.needsRecenter) {
            window.baseOffset.copy(rawQ).invert();
            window.needsRecenter = false;
        }

        // Apply the zeroing offset BEFORE the W3C VR fixes
        let finalQ = new THREE.Quaternion().copy(window.baseOffset).multiply(rawQ);
        
        finalQ.multiply(vrQ1);
        finalQ.multiply(vrQ0.setFromAxisAngle(vrZee, 0)); 

        if (window.probeState.targetQuat) window.probeState.targetQuat.copy(finalQ);
    }

    if (data.fire) {
        if (window.triggerPulse) window.triggerPulse();
        if (window.Tutorial) window.Tutorial.evaluateAction('fire_pulse');
    }
}

function initNetwork() {
    document.getElementById('room-display').innerText = 'Room PIN: ' + roomPIN;
    const peer = new Peer('sim-hosp-' + roomPIN);

    peer.on('open', () => document.getElementById('status').innerText = 'Direct P2P: READY\nCloud Relay: WAITING...');
    peer.on('connection', (conn) => {
        activeP2PConn = conn;
        document.getElementById('status').innerText = 'PROBE CONNECTED (Direct P2P)';
        document.getElementById('status').style.color = '#44ff44';
        
        if (Tutorial.currentModule === 1 && Tutorial.currentStep === 1) Tutorial.evaluateAction('connect');
        
        conn.on('data', handleIncomingData);
        conn.on('close', () => activeP2PConn = null);
    });

    const ablyRealtime = new Ably.Realtime({ key: ABLY_API_KEY, clientId: 'laptop-host' });
    ablyChannel = ablyRealtime.channels.get('sim-hosp-' + roomPIN);
    ablyChannel.presence.enter('laptop-host');
    ablyChannel.subscribe('sensor-data', (message) => {
        if (!activeP2PConn || !activeP2PConn.open) handleIncomingData(message.data);
    });
}

// ==========================================
// 2. THE MULTI-STEP CURRICULUM ENGINE
// ==========================================
window.Tutorial = {
    currentModule: 1,
    currentStep: 1,
    stepComplete: false,

    curriculum: {
        1: {
            title: "Module 1: The Pulse-Echo",
            steps: [
                { instr: "What is Ultrasound?", desc: "Ultrasound uses high-frequency sound waves to create images. When sound waves hit different tissues, they bounce back to the probe.<br><br><b>Action:</b> Enter the Room PIN on your smartphone to connect.", action: "connect" },
                { instr: "Fire a Pulse", desc: "Let's see it in action.<br><br><b>Action:</b> Tap the <b style='color:#ff4444'>FIRE PULSE</b> button on your phone to send a sound wave into the tissue.", action: "fire_pulse" }
            ]
        },
        2: {
            title: "Module 2: Amplitude & Echogenicity",
            steps: [
                { instr: "Find Fluid (Anechoic)", desc: "Sound passes easily through fluid, appearing <b>Black</b>.<br><br><b>Action:</b> Rock the probe towards the top of the phantom to find the fluid.", action: "find_fluid" },
                { instr: "Find Bone (Hyperechoic)", desc: "Sound bounces completely off bone, appearing bright <b>White</b>.<br><br><b>Action:</b> Rock the probe towards the bottom of the phantom to find the bone surface.", action: "find_bone" }
            ]
        },
        3: {
            title: "Module 3: Depth & Frequency",
            steps: [
                { instr: "High Frequency (Shallow)", desc: "High frequency waves give great detail, but lose energy quickly (attenuation).<br><br><b>Action:</b> Set the console Frequency slider to <b>12 MHz</b>.", action: "freq_high" },
                { instr: "Low Frequency (Deep)", desc: "To see the hidden mass deep in the tissue, we must sacrifice resolution for penetration.<br><br><b>Action:</b> Drop the console Frequency slider to <b>3 MHz</b>.", action: "freq_low" }
            ]
        },
        4: {
            title: "Module 4: Probe Manipulations",
            steps: [
                {
                    // THE FIX: Fanning is now Step 1, with Forward/Back 3D animation!
                    instr: "Fanning the Clot",
                    desc: `
                    <style>
                        @keyframes fanAnim { 0%, 100% { transform: perspective(200px) rotateX(0deg); } 25% { transform: perspective(200px) rotateX(-45deg); } 75% { transform: perspective(200px) rotateX(45deg); } }
                        @keyframes rockAnim { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-25deg); } 75% { transform: rotate(25deg); } }
                        @keyframes rotateAnim { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(90deg); } }
                    </style>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <div style="position: relative; width: 40px; height: 70px; background: #8b949e; border-radius: 6px; animation: fanAnim 2s infinite ease-in-out; transform-origin: bottom center;">
                            <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #58a6ff; border-radius: 50%;"></div>
                        </div>
                        <div style="margin-top: 10px; font-size: 13px; color: #58a6ff; font-weight: bold;">↔️ FANNING (Tilt Forward/Back)</div>
                    </div>
                    <b>Action:</b> Fan the probe forward and backward through the vessel to identify the bright white clot.`,
                    action: "fan_clot"
                },
                {
                    // THE FIX: Rocking is now Step 2, with Side-to-Side animation!
                    instr: "Transverse Rocking",
                    desc: `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <div style="position: relative; width: 40px; height: 70px; background: #8b949e; border-radius: 6px; animation: rockAnim 2s infinite ease-in-out; transform-origin: bottom center;">
                            <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #58a6ff; border-radius: 50%;"></div>
                        </div>
                        <div style="margin-top: 10px; font-size: 13px; color: #58a6ff; font-weight: bold;">↕️ ROCKING (Tilt Side-to-Side)</div>
                    </div>
                    <b>Action:</b> Rock the probe side-to-side to perfectly center the circular cross-section of the vessel.`,
                    action: "rock_center"
                },
                {
                    instr: "Longitudinal Rotation",
                    desc: `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <div style="position: relative; width: 40px; height: 70px; background: #8b949e; border-radius: 6px; animation: rotateAnim 2.5s infinite ease-in-out; transform-origin: center center;">
                            <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #58a6ff; border-radius: 50%;"></div>
                        </div>
                        <div style="margin-top: 10px; font-size: 13px; color: #58a6ff; font-weight: bold;">🔄 ROTATION (Twist 90°)</div>
                    </div>
                    <b>Action:</b> Rotate the probe to get a long-axis view of the vessel tube.`,
                    action: "rotate_long"
                }
            ]
        }
    },

    syncPhone: function() {
        let modNum = (this.currentModule === 'playground') ? 4 : this.currentModule;
        const payload = { command: 'sync_module', module: modNum };
        if (activeP2PConn && activeP2PConn.open) activeP2PConn.send(payload);
        else if (ablyChannel) ablyChannel.publish('host-command', payload);
    },

    loadModule: function(moduleNum) {
        this.currentModule = moduleNum;
        this.currentStep = 1;
        this.syncPhone();

        if (moduleNum === 'playground') {
            document.getElementById('hud-progress').innerHTML = 'STEP &infin;';
            document.getElementById('hud-title').innerText = 'Playground: Laser Trace';
            document.getElementById('hud-instructions').innerText = 'Level 1: The Circle';
            document.getElementById('edu-details').innerHTML = 'Hold your phone upright.<br><br>Pitch and Roll your wrist to steer the red laser dot over all the checkpoints!';
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            if (window.loadPlayground) window.loadPlayground();
            return;
        }

        if (moduleNum === 1 && window.loadModule1) window.loadModule1();
        if (moduleNum === 2 && window.loadModule2) window.loadModule2();
        if (moduleNum === 3 && window.loadModule3) window.loadModule3();
        if (moduleNum === 4 && window.loadModule4) window.loadModule4();

        this.renderStep();
    },

    renderStep: function() {
        this.stepComplete = false;
        let modData = this.curriculum[this.currentModule];
        let stepData = modData.steps[this.currentStep - 1];

        document.getElementById('hud-progress').innerText = 'STEP ' + this.currentStep + ' OF ' + modData.steps.length;
        document.getElementById('hud-title').innerText = modData.title;
        document.getElementById('hud-instructions').innerText = stepData.instr;
        document.getElementById('edu-details').innerHTML = stepData.desc;

        if (this.currentModule === 3) {
            document.getElementById('console-freq').style.opacity = '1';
            document.getElementById('console-freq').style.pointerEvents = 'auto';
        } else {
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
        }
    },

    evaluateAction: function(actionStr) {
        if (this.currentModule === 'playground' || this.stepComplete) return;

        let expectedAction = this.curriculum[this.currentModule].steps[this.currentStep - 1].action;
        
        if (actionStr === expectedAction) {
            this.stepComplete = true;
            document.getElementById('hud-instructions').innerHTML += ' <span style="color:#44ff44; margin-left:10px;">✓ DONE</span>';
            setTimeout(() => {
                if (this.currentStep < this.curriculum[this.currentModule].steps.length) {
                    this.currentStep++;
                    this.renderStep();
                } else {
                    document.getElementById('edu-details').innerHTML = "<h3 style='color:#44ff44; text-align:center;'>Module Complete!</h3><p style='text-align:center;'>Click <b>Next ➔</b> to continue your training.</p>";
                }
            }, 1500);
        }
    },

    goForward: function() {
        if (this.currentModule === 'playground') return;
        let nextMod = this.currentModule + 1;
        if (nextMod > 4) nextMod = 'playground';
        this.loadModule(nextMod);
    },
    goBack: function() {
        if (this.currentModule === 'playground') return this.loadModule(4);
        if (this.currentModule - 1 >= 1) this.loadModule(this.currentModule - 1);
    },
    setFrequency: function(val) {
        document.getElementById('freq-val').innerText = val;
        if (window.updateMod3Freq) window.updateMod3Freq(val);
    }
};

window.startSimulator = function() {
    document.getElementById('landing-page').style.display = 'none';
    Tutorial.loadModule(1);
};
window.startPlayground = function() {
    document.getElementById('landing-page').style.display = 'none';
    Tutorial.loadModule('playground');
};
window.addEventListener('load', () => { initNetwork(); });