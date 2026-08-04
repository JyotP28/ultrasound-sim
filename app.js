// ==========================================
// APP.JS - MASTER ENGINE & NETWORK HOST
// ==========================================

// >>> PASTE YOUR ABLY API KEY INSIDE THE QUOTES <<<
const ABLY_API_KEY = 'PASTE_YOUR_ABLY_API_KEY_HERE';

// THE FIX: Re-introduced targetQuat so the graphics engine can smooth the movement!
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

let vrQ0 = null;
let vrQ1 = null;
let vrZee = null;

let roomPIN = Math.floor(1000 + Math.random() * 9000).toString();
let activeP2PConn = null;
let ablyChannel = null;

function handleIncomingData(data) {
    if (!vrQ0 && typeof THREE !== 'undefined') {
        window.probeState.currentQuat = new THREE.Quaternion();
        window.probeState.targetQuat = new THREE.Quaternion();
        vrQ0 = new THREE.Quaternion();
        vrQ1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
        vrZee = new THREE.Vector3(0, 0, 1);
    }

    if (data.command === 'recenter' && window.recenterPlayground) {
        window.recenterPlayground();
        return;
    }
    if (data.command === 'restart' && window.resetGame) {
        window.resetGame();
        return;
    }

    if (data.orientation && typeof THREE !== 'undefined') {
        const alpha = (data.orientation.alpha || 0) * (Math.PI / 180);
        const beta = (data.orientation.beta || 0) * (Math.PI / 180);
        const gamma = (data.orientation.gamma || 0) * (Math.PI / 180);

        const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
        const q = new THREE.Quaternion().setFromEuler(euler);
        
        q.multiply(vrQ1);
        q.multiply(vrQ0.setFromAxisAngle(vrZee, 0)); 

        // THE FIX: We save the incoming data to the TARGET, not the current position
        if (window.probeState.targetQuat) {
            window.probeState.targetQuat.copy(q);
        }
    }

    if (data.fire) {
        if (window.triggerPulse) window.triggerPulse();
    }
}

function initNetwork() {
    document.getElementById('room-display').innerText = 'Room PIN: ' + roomPIN;

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

    const ablyRealtime = new Ably.Realtime({ key: ABLY_API_KEY, clientId: 'laptop-host' });
    ablyChannel = ablyRealtime.channels.get('sim-hosp-' + roomPIN);
    ablyChannel.presence.enter('laptop-host');

    ablyChannel.subscribe('sensor-data', (message) => {
        if (!activeP2PConn || !activeP2PConn.open) {
            document.getElementById('status').innerText = 'PROBE CONNECTED (Cloud Relay)';
            document.getElementById('status').style.color = '#ffcc00';
            handleIncomingData(message.data);
        }
    });
}

window.Tutorial = {
    currentModule: 1,
    
    syncPhone: function() {
        let modNum = (this.currentModule === 'playground') ? 4 : this.currentModule;
        const payload = { command: 'sync_module', module: modNum };

        if (activeP2PConn && activeP2PConn.open) {
            activeP2PConn.send(payload);
        } else if (ablyChannel) {
            ablyChannel.publish('host-command', payload);
        }
    },

    loadModule: function(moduleNum) {
        this.currentModule = moduleNum;
        this.syncPhone();

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

        document.getElementById('hud-progress').innerText = 'STEP ' + moduleNum;
        
        if (moduleNum === 1) {
            document.getElementById('hud-title').innerText = 'Module 1: The Pulse-Echo';
            document.getElementById('hud-instructions').innerText = 'What is Ultrasound?';
            document.getElementById('edu-details').innerHTML = 'Human hearing operates between 20 and 20,000 Hertz. Ultrasound is simply sound waves that are above the hearing threshold.';
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            if (window.loadModule1) window.loadModule1();
        } 
        else if (moduleNum === 2) {
            document.getElementById('hud-title').innerText = 'Module 2: Amplitude & Echogenicity';
            document.getElementById('hud-instructions').innerText = 'Fluid vs Tissue';
            document.getElementById('edu-details').innerHTML = 'Sound waves pass easily through fluid (appearing black/anechoic) but bounce strongly off dense tissue or bone (appearing white/hyperechoic).';
            // THE FIX: Hidden in Module 2!
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            if (window.loadModule2) window.loadModule2();
        }
        else if (moduleNum === 3) {
            document.getElementById('hud-title').innerText = 'Module 3: Depth & Frequency';
            document.getElementById('hud-instructions').innerText = 'Adjusting the Beam';
            document.getElementById('edu-details').innerHTML = 'High frequency (e.g., 12 MHz) provides excellent resolution for shallow structures, but cannot penetrate deep into the body. Low frequency sacrifices resolution to see deep tissues.<br><br>Use the console slider to observe this trade-off.';
            // THE FIX: Active in Module 3!
            document.getElementById('console-freq').style.opacity = '1';
            document.getElementById('console-freq').style.pointerEvents = 'auto';
            if (window.loadModule3) window.loadModule3();
        }
        else if (moduleNum === 4) {
            document.getElementById('hud-title').innerText = 'Module 4: Probe Movements';
            document.getElementById('hud-instructions').innerText = 'Clinical Spatial Awareness';
            document.getElementById('edu-details').innerHTML = 'Sonographers use specific spatial movements to navigate anatomy. Practice sweeping, fanning, and rotating the probe using your smartphone.';
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            if (window.loadModule4) window.loadModule4();
        }
    },

    goForward: function() {
        if (this.currentModule === 'playground') return;
        let nextMod = this.currentModule + 1;
        if (nextMod > 4) nextMod = 'playground';
        this.loadModule(nextMod);
    },

    goBack: function() {
        if (this.currentModule === 'playground') {
            this.loadModule(4);
            return;
        }
        let prevMod = this.currentModule - 1;
        if (prevMod >= 1) this.loadModule(prevMod);
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