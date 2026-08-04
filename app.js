// ==========================================
// APP.JS - MASTER ENGINE & CURRICULUM LOGIC
// ==========================================

// >>> PASTE YOUR ABLY API KEY HERE <<<
const ABLY_API_KEY = 'a2d6Dg.n1367A:B_CKjjgBzmIV1wt743VG95MCHqBpSXKJp4AK3YQCUVo';

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

    if (data.command === 'recenter') { window.needsRecenter = true; return; }
    if (data.command === 'restart' && window.resetGame) return window.resetGame();

    if (data.orientation && typeof THREE !== 'undefined') {
        const alpha = (data.orientation.alpha || 0) * (Math.PI / 180);
        const beta = (data.orientation.beta || 0) * (Math.PI / 180);
        const gamma = (data.orientation.gamma || 0) * (Math.PI / 180);

        const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
        let rawQ = new THREE.Quaternion().setFromEuler(euler);

        if (window.needsRecenter) {
            window.baseOffset.copy(rawQ).invert();
            window.needsRecenter = false;
        }

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
    const probeUrl = new URL('probe.html', window.location.href).href; 

    const qrLanding = document.getElementById('qr-landing');
    if (qrLanding && qrLanding.innerHTML === "") {
        new QRCode(qrLanding, { text: probeUrl, width: 150, height: 150, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
    }

    const qrSidebar = document.getElementById('qr-sidebar');
    if (qrSidebar && qrSidebar.innerHTML === "") {
        new QRCode(qrSidebar, { text: probeUrl, width: 60, height: 60, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
    }

    const peer = new Peer('sim-hosp-' + roomPIN);
    peer.on('open', () => document.getElementById('status').innerText = 'Direct P2P: READY\nCloud Relay: WAITING...');
    
    peer.on('connection', (conn) => {
        activeP2PConn = conn;
        document.getElementById('status').innerText = 'PROBE CONNECTED (Direct P2P)';
        document.getElementById('status').style.color = '#44ff44';
        
        if (window.Tutorial) window.Tutorial.syncPhone();
        
        if (Tutorial.currentModule === 1 && Tutorial.currentStep === 1) Tutorial.evaluateAction('connect');
        
        conn.on('data', handleIncomingData);
        conn.on('close', () => activeP2PConn = null);
    });

    const ablyRealtime = new Ably.Realtime({ key: ABLY_API_KEY, clientId: 'laptop-host' });
    ablyChannel = ablyRealtime.channels.get('sim-hosp-' + roomPIN);
    ablyChannel.presence.enter('laptop-host');
    
    ablyChannel.presence.subscribe('enter', (member) => {
        if (member.clientId === 'phone-probe' && window.Tutorial) {
            window.Tutorial.syncPhone();
        }
    });

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
            title: "Module 1: The Pulse-Echo Principle",
            steps: [
                { instr: "What is Ultrasound?", desc: "Ultrasound probes contain Piezoelectric crystals. When an electrical current is applied, these crystals vibrate, creating high-frequency sound waves that travel into the body. The machine measures the time it takes for those echoes to bounce back to calculate distance.<br><br><b>Action:</b> Enter the Room PIN on your smartphone to establish a connection.", action: "connect" },
                { instr: "Listening for Echoes", desc: "A transducer actually spends 1% of its time generating sound pulses, and 99% of its time \"listening\" for the returning echoes. This continuous pulse-listen cycle is what generates a live image.<br><br><b>Action:</b> Tap the <b style='color:#ff4444'>FIRE PULSE</b> button on your phone to send a sound wave into the tissue and watch it bounce off the targets.", action: "fire_pulse" }
            ]
        },
        2: {
            title: "Module 2: Acoustic Impedance",
            steps: [
                { instr: "Anechoic Structures (Fluid)", desc: "When sound waves travel through uniform fluids like blood, water, or urine, there is no acoustic resistance (impedance). The sound waves pass straight through, sending zero echoes back to the probe. The machine paints this lack of echoes as <b>Black (Anechoic)</b>.<br><br><b>Action:</b> Rock the probe towards the top of the phantom to locate the anechoic fluid pocket.", action: "find_fluid" },
                { instr: "Hyperechoic Structures (Bone)", desc: "When sound waves hit a dense object like bone or gallstones, there is a massive acoustic mismatch. Almost 100% of the sound waves bounce violently back to the probe. The machine paints this strong signal as bright <b>White (Hyperechoic)</b>. Because no sound penetrates past it, a dark acoustic shadow forms underneath.<br><br><b>Action:</b> Rock the probe towards the bottom of the phantom to find the hyperechoic bone.", action: "find_bone" }
            ]
        },
        3: {
            title: "Module 3: Frequency & Attenuation",
            steps: [
                { instr: "High Frequency (Resolution)", desc: "High frequency waves (e.g., 12 MHz) have short wavelengths. They provide beautiful, crisp axial resolution for superficial structures like skin, nerves, and shallow vessels. However, they lose energy quickly (attenuation) and cannot \"see\" deep into the body.<br><br><b>Action:</b> Set the console Frequency slider to <b>12 MHz</b> to get a crisp image of the superficial tissue.", action: "freq_high" },
                { instr: "Low Frequency (Penetration)", desc: "Low frequency waves (e.g., 3 MHz) have long wavelengths. They can penetrate deep through adipose and muscle tissue to visualize deep organs like the liver or kidneys. The trade-off is that the image becomes grainier, sacrificing resolution for depth.<br><br><b>Action:</b> Drop the console Frequency slider to <b>3 MHz</b> to penetrate the tissue and reveal the hidden mass.", action: "freq_low" }
            ]
        },
        4: {
            title: "Module 4: Spatial Manipulations",
            steps: [
                {
                    instr: "Fanning the Anatomy",
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
                    Ultrasound slices are paper-thin. To understand a 3D structure, you must sweep through its entire volume.<br><br><b>Action:</b> Fan the probe forward and backward through the blood vessel to find the bright white internal clot.`,
                    action: "fan_clot"
                },
                {
                    instr: "Transverse Rocking",
                    desc: `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <div style="position: relative; width: 40px; height: 70px; background: #8b949e; border-radius: 6px; animation: rockAnim 2s infinite ease-in-out; transform-origin: bottom center;">
                            <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #58a6ff; border-radius: 50%;"></div>
                        </div>
                        <div style="margin-top: 10px; font-size: 13px; color: #58a6ff; font-weight: bold;">↕️ ROCKING (Tilt Side-to-Side)</div>
                    </div>
                    Rocking changes the angle of incidence. It is heavily used to center a target on the screen before attempting a needle intervention.<br><br><b>Action:</b> Rock the probe side-to-side to perfectly center the circular cross-section of the vessel on your screen.`,
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
                    Rotating transitions your view from a Short-Axis (cross-section) to a Long-Axis (lengthwise). This is crucial for verifying needle depth inside a vein.<br><br><b>Action:</b> Rotate the probe 90 degrees to get a long-axis view of the vessel tube.`,
                    action: "rotate_long"
                }
            ]
        },
        'intermission': {
            title: "A Note on the Future",
            steps: [
                { 
                    instr: "Proof of Concept", 
                    desc: "You have now gone through the ultra basics of ultrasound.<br><br>This simulator was meant to be a proof of concept for the type of interactive demos that medical learners should have access to. It feels incredibly weird for this sort of technology to not be at the fingertips of students as of yet.<br><br>I hope this can inspire others to try to build the things they envision were real.<br><br>The next module will be a short game that I created to get you used to the fine motor movements of your wrist. Try to get a high score!", 
                    action: "free_pass" 
                }
            ]
        }
    },

    syncPhone: function() {
        let modNum = (this.currentModule === 'playground' || this.currentModule === 'intermission') ? 4 : this.currentModule;
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
            document.getElementById('edu-details').innerHTML = 'Hold your phone upright.<br><br>Pitch and Roll your wrist to steer the red laser dot over all the checkpoints on the table to trace the shape!';
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
            document.getElementById('btn-next').style.display = 'none'; 
            if (window.loadPlayground) window.loadPlayground();
            return;
        }

        if (moduleNum === 'intermission') {
            if (typeof scene3D !== 'undefined') { while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]); }
            if (typeof sceneUS !== 'undefined') { while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]); }
        }

        if (moduleNum === 1 && window.loadModule1) window.loadModule1();
        if (moduleNum === 2 && window.loadModule2) window.loadModule2();
        if (moduleNum === 3 && window.loadModule3) window.loadModule3();
        if (moduleNum === 4 && window.loadModule4) window.loadModule4();

        this.renderStep();
    },

    // NEW FUNCTION: Dynamically handles the game UI state!
    updatePlaygroundUI: function(level) {
        if (level === 1) {
            document.getElementById('hud-progress').innerHTML = 'STAGE 1 / 3';
            document.getElementById('hud-title').innerText = 'Playground: Laser Trace';
            document.getElementById('hud-instructions').innerText = 'The Circle';
            document.getElementById('edu-details').innerHTML = 'Hold your phone upright and trace the laser over the orange targets using smooth <b>Fanning</b> and <b>Rocking</b> motions.<br><br>Paint them all green to advance!';
        } else if (level === 2) {
            document.getElementById('hud-progress').innerHTML = 'STAGE 2 / 3';
            document.getElementById('hud-instructions').innerText = 'The Infinity Loop';
            document.getElementById('edu-details').innerHTML = 'Combine your axes! Tracing this figure-8 requires continuous, diagonal, multi-axis probe manipulation.';
        } else if (level === 3) {
            document.getElementById('hud-progress').innerHTML = 'STAGE 3 / 3';
            document.getElementById('hud-instructions').innerText = 'The Constellation';
            document.getElementById('edu-details').innerHTML = 'Hard mode. Use precise, sharp directional changes to hit the scattered targets. If your wrist gets tangled, tap the <b style="color:#1f6feb;">⌖ ZERO PROBE</b> button on your phone to recalibrate.';
        } else if (level === 'win') {
            document.getElementById('hud-progress').innerHTML = 'COMPLETE';
            document.getElementById('hud-instructions').innerHTML = '<span style="color:#44ff44;">Simulation Mastered!</span>';
            document.getElementById('edu-details').innerHTML = '<h3 style="text-align:center;">Incredible Probe Control!</h3><p style="text-align:center; color:#8b949e;">You have successfully completed the entire interactive curriculum and mastered spatial transducer manipulation.</p>';
        }
    },

    renderStep: function() {
        this.stepComplete = false;
        let modData = this.curriculum[this.currentModule];
        let stepData = modData.steps[this.currentStep - 1];

        if (this.currentModule === 'intermission') {
            document.getElementById('hud-progress').innerText = 'INTERMISSION';
        } else {
            document.getElementById('hud-progress').innerText = 'STEP ' + this.currentStep + ' OF ' + modData.steps.length;
        }
        
        document.getElementById('hud-title').innerText = modData.title;
        document.getElementById('hud-instructions').innerText = stepData.instr;
        document.getElementById('edu-details').innerHTML = stepData.desc;

        if (stepData.action === "free_pass") {
            this.stepComplete = true;
            document.getElementById('btn-next').style.display = 'inline-block';
        } else {
            document.getElementById('btn-next').style.display = 'none';
        }

        if (this.currentModule === 3) {
            document.getElementById('console-freq').style.opacity = '1';
            document.getElementById('console-freq').style.pointerEvents = 'auto';
        } else {
            document.getElementById('console-freq').style.opacity = '0';
            document.getElementById('console-freq').style.pointerEvents = 'none';
        }

        this.syncPhone();
    },

    evaluateAction: function(actionStr) {
        if (this.currentModule === 'playground' || this.stepComplete) return;

        let expectedAction = this.curriculum[this.currentModule].steps[this.currentStep - 1].action;
        
        if (actionStr === expectedAction) {
            this.stepComplete = true;
            document.getElementById('hud-instructions').innerHTML += ' <span style="color:#44ff44; margin-left:10px;">✓ DONE</span>';
            document.getElementById('btn-next').style.display = 'inline-block';
            
            if (this.currentStep === this.curriculum[this.currentModule].steps.length) {
                document.getElementById('edu-details').innerHTML += "<br><br><div style='padding:10px; background:#238636; color:white; text-align:center; border-radius:6px; font-weight:bold;'>Module Complete! Click Next &#8594;</div>";
            }
        }
    },

    // THE FIX: Re-routed goForward for 1 -> 2 -> 3 -> 4 -> Intermission -> Playground
    goForward: function() {
        if (this.currentModule === 'playground') {
            document.getElementById('edu-details').innerHTML = "<h3 style='color:#44ff44; text-align:center;'>Course Completed!</h3><p style='text-align:center;'>You have finished the fundamentals of ultrasound mechanics and spatial manipulation.</p>";
            document.getElementById('btn-next').style.display = 'none';
            return;
        }
        
        let modData = this.curriculum[this.currentModule];
        if (modData && this.currentStep < modData.steps.length) {
            this.currentStep++;
            this.renderStep();
        } else {
            if (this.currentModule === 1) this.loadModule(2);
            else if (this.currentModule === 2) this.loadModule(3);
            else if (this.currentModule === 3) this.loadModule(4);
            else if (this.currentModule === 4) this.loadModule('intermission');
            else if (this.currentModule === 'intermission') this.loadModule('playground');
        }
    },

    // THE FIX: Re-routed goBack to follow the same correct path backwards
    goBack: function() {
        if (this.currentModule === 'playground') return this.loadModule('intermission');
        if (this.currentModule === 'intermission') return this.loadModule(4);
        
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderStep();
        } else {
            if (this.currentModule === 2) this.loadModule(1);
            else if (this.currentModule === 3) this.loadModule(2);
            else if (this.currentModule === 4) this.loadModule(3);
        }
    },

    setFrequency: function(val) {
        document.getElementById('freq-val').innerText = val;
        if (window.updateMod3Freq) window.updateMod3Freq(val);
    }
};

window.startSimulator = function() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('calibration-overlay').style.display = 'flex';
    Tutorial.loadModule(1);
};
window.startPlayground = function() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('calibration-overlay').style.display = 'flex';
    Tutorial.loadModule('playground');
};
window.addEventListener('load', () => { initNetwork(); });