// ==========================================
// APP.JS - MASTER ENGINE & NETWORK HOST
// ==========================================

// >>> PASTE YOUR EXACT SAME ABLY API KEY HERE <<<
const ABLY_API_KEY = 'Pa2d6Dg.n1367A:B_CKjjgBzmIV1wt743VG95MCHqBpSXKJp4AK3YQCUVo';

window.probeState = {
    currentQuat: new THREE.Quaternion()
};

let roomPIN = Math.floor(1000 + Math.random() * 9000).toString();
let activeP2PConn = null;
let ablyChannel = null;

// ==========================================
// 1. INCOMING DATA & VR MATHEMATICS
// ==========================================

// Official W3C VR Math Constants to prevent Gimbal Lock
const vrQ0 = new THREE.Quaternion();
const vrQ1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const vrZee = new THREE.Vector3(0, 0, 1);

function handleIncomingData(data) {
    // Intercept optional restart commands (if you ever add the button back)
    if (data.command === 'recenter' && window.recenterPlayground) {
        window.recenterPlayground();
        return;
    }
    if (data.command === 'restart' && window.resetGame) {
        window.resetGame();
        return;
    }

    // Process Gyroscope Orientation
    if (data.orientation) {
        const alpha = THREE.MathUtils.degToRad(data.orientation.alpha || 0);
        const beta = THREE.MathUtils.degToRad(data.orientation.beta || 0);
        const gamma = THREE.MathUtils.degToRad(data.orientation.gamma || 0);

        // Official W3C DeviceOrientation Math (Solves upright vibration!)
        const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
        const q = new THREE.Quaternion().setFromEuler(euler);
        
        q.multiply(vrQ1);
        q.multiply(vrQ0.setFromAxisAngle(vrZee, 0)); 

        window.probeState.currentQuat.copy(q);
    }

    // Process Fire Button
    if (data.fire) {
        if (window.triggerPulse) window.triggerPulse();
    }
}

// ==========================================
// 2. NETWORK INITIALIZATION
// ==========================================

function initNetwork() {
    document.getElementById('room-display').innerText = 'Room PIN: ' + roomPIN;

    // A. Setup Direct P2P (PeerJS)
    const peer = new Peer('sim-hosp-' + roomPIN);

    peer.on('open', (id) => {
        document.getElementById('status').innerText = 'Direct P2P: READY\nCloud Relay: WAITING...';
    });

    peer.on('connection', (conn) => {
        activeP2PConn = conn;
        document.getElementById('status').innerText = 'PROBE CONNECTED (Direct P2P)';
        document.getElementById('status').style.color = '#44ff44';

        conn.on('data', handleIncomingData);
        
        conn.on('close', () => {
            document.getElementById('status').innerText = 'Probe Disconnected (P2P)';
            document.getElementById('status').style.color = '#ff4444';
            activeP2PConn = null;
        });
    });

    // B. Setup Cloud Relay Fallback (Ably)
    const ablyRealtime = new Ably.Realtime({ key: ABLY_API_KEY, clientId: 'laptop-host' });
    ablyChannel = ablyRealtime.channels.get('sim-hosp-' + roomPIN);
    
    ablyChannel.presence.enter('laptop-host');

    ablyChannel.subscribe('sensor-data', (message) => {
        // ONLY use Ably data if P2P is currently broken or missing
        if (!activeP2PConn || !activeP2PConn.open) {
            document.getElementById('status').innerText = 'PROBE CONNECTED (Cloud Relay)';
            document.getElementById('status').style.color = '#ffcc00';
            handleIncomingData(message.data);
        }
    });
}

// ==========================================
// 3. CURRICULUM STATE MACHINE
// ==========================================

window.Tutorial = {
    currentModule: 1,
    
    // The Quota Saver Fix
    syncPhone: function() {
        let modNum = (this.currentModule === 'playground') ? 4 : this.currentModule;
        const payload = { command: 'sync_module', module: modNum };

        if (activeP2PConn && activeP2PConn.open) {
            // Send ONLY via Direct P2P (Costs 0 quota)
            activeP2PConn.send(payload);
        } else if (ablyChannel) {
            // ONLY use Cloud Relay if P2P is unavailable
            ablyChannel.publish('host-command', payload);
        }
    },

    loadModule: function(moduleNum) {
        this.currentModule = moduleNum;
        this.syncPhone();

        // ------------------------------------------
        // PLAYGROUND MODE
        // ------------------------------------------
        if (moduleNum === 'playground') {
            document.getElementById('hud-progress').innerHTML = 'STEP &infin;';
            document.getElementById('hud-title').innerText = 'Playground: Laser Trace';
            document.getElementById('hud-instructions').innerText = 'Level 1: The Circle';
            document.getElementById('edu-details').innerHTML = 'Hold your phone completely upright like an ultrasound probe.<br><br>Pitch and Roll your wrist to steer the red laser dot over all the checkpoints on the table to trace the shape!';
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            if (window.loadPlayground) window.loadPlayground();
            return;
        }

        // ------------------------------------------
        // MODULE ROUTING
        // ------------------------------------------
        document.getElementById('hud-progress').innerText = 'STEP ' + moduleNum;
        
        if (moduleNum === 1) {
            document.getElementById('hud-title').innerText = 'Module 1: The Pulse-Echo';
            document.getElementById('hud-instructions').innerText = 'What is Ultrasound?';
            document.getElementById('edu-details').innerHTML = 'Human hearing operates between 20 and 20,000 Hertz. Ultrasound is simply sound waves that are above the hearing threshold. Diagnostic medical ultrasound typically uses frequencies ranging from one to twenty plus megahertz.<br><br>To begin, enter the Room PIN into your Smartphone to connect.';
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            if (window.loadModule1) window.loadModule1();
        } 
        else if (moduleNum === 2) {
            document.getElementById('hud-title').innerText = 'Module 2: Depth & Frequency';
            document.getElementById('hud-instructions').innerText = 'Adjusting the Beam';
            document.getElementById('edu-details').innerHTML = 'High frequency (e.g., 12 MHz) provides excellent resolution for shallow structures, but cannot penetrate deep into the body. Low frequency (e.g., 3 MHz) sacrifices resolution to see deep tissues.<br><br>Use the console slider to observe this trade-off.';
            document.getElementById('console-freq').style.opacity = '1';
            document.getElementById('console-freq').style.pointerEvents = 'auto';
            if (window.loadModule2) window.loadModule2();
        }
        else if (moduleNum === 3) {
            document.getElementById('hud-title').innerText = 'Module 3: Probe Movements';
            document.getElementById('hud-instructions').innerText = 'Clinical Spatial Awareness';
            document.getElementById('edu-details').innerHTML = 'Sonographers use specific spatial movements to navigate anatomy. Practice sweeping, fanning, and rotating the probe using your smartphone to understand how it affects the ultrasound beam slice.';
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            if (window.loadModule3) window.loadModule3();
        }
    },

    goForward: function() {
        if (this.currentModule === 'playground') return;
        let nextMod = this.currentModule + 1;
        if (nextMod > 3) nextMod = 'playground';
        this.loadModule(nextMod);
    },

    goBack: function() {
        if (this.currentModule === 'playground') {
            this.loadModule(3);
            return;
        }
        let prevMod = this.currentModule - 1;
        if (prevMod >= 1) this.loadModule(prevMod);
    },

    setFrequency: function(val) {
        document.getElementById('freq-val').innerText = val;
        if (window.updateFrequency) window.updateFrequency(val);
    }
};

// ==========================================
// 4. UI EVENT LISTENERS
// ==========================================

window.startSimulator = function() {
    document.getElementById('landing-page').style.display = 'none';
    Tutorial.loadModule(1);
};

window.startPlayground = function() {
    document.getElementById('landing-page').style.display = 'none';
    Tutorial.loadModule('playground');
};

window.addEventListener('load', () => {
    initNetwork();
});