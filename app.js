// ==========================================
// THE TUTORIAL ENGINE (LMS Navigation)
// ==========================================

window.startSimulator = function() {
    Tutorial.currentModule = 1;
    Tutorial.currentStep = 1;
    Tutorial.init();
    
    const landing = document.getElementById('landing-page');
    landing.style.opacity = '0';
    setTimeout(() => { landing.style.display = 'none'; }, 500);
};

window.startPlayground = function() {
    Tutorial.currentModule = 'playground'; 
    
    document.getElementById('hud-title').innerText = "Playground: Laser Trace";
    document.getElementById('step-count').innerText = "∞";
    document.getElementById('hud-instructions').innerText = "Level 1: The Circle";
    document.getElementById('edu-details').innerHTML = "Hold your phone completely upright like an ultrasound probe.<br><br>Pitch and Roll your wrist to steer the red laser dot over all the checkpoints on the table to trace the shape!";
    
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').disabled = true;
    document.getElementById('btn-next').innerText = "Game Active";

    const freqConsole = document.getElementById('console-freq');
    if (freqConsole) freqConsole.style.display = 'none';

    const landing = document.getElementById('landing-page');
    landing.style.opacity = '0';
    setTimeout(() => { landing.style.display = 'none'; }, 500);

    if (typeof loadPlayground === 'function') loadPlayground();
    Tutorial.syncPhone();
};

const Tutorial = {
    currentModule: 1,
    currentStep: 1,
    lastLoadedModule: 0, 
    
    syllabus: {
        1: {
            title: "Module 1: The Pulse-Echo",
            steps: {
                1: { text: "What is Ultrasound?", details: "Human hearing operates between 20 and 20,000 Hertz. Ultrasound is simply sound waves that are above the hearing threshold. Diagnostic medical ultrasound typically uses frequencies ranging from one to twenty plus megahertz.\n\nTo begin, enter the Room PIN into your Smartphone to connect.", action: "connect" },
                2: { text: "The Transducer as a Speaker", details: "The ultrasound machine works similarly to a speaker. It uses electrical energy to produce sound waves inside the transducer. Some of these sound waves reflect off of the patient's tissues and are transmitted back.\n\nPress the 'FIRE PULSE' button on your phone.", action: "fire_pulse" },
                3: { text: "Forming the Image", details: "The transducer converts the returning sound waves back into electrical energy, which is processed to form a visual scan line on the monitor below.\n\nPress 'FIRE PULSE' again to observe the returning echoes drawing the scan lines.", action: "fire_pulse" },
                4: { text: "Understanding Depth", details: "Depth is a function of distance to the ultrasound machine. The longer it takes a wave to return to the machine, the deeper it had to penetrate into the tissues, and the ultrasound machine knows to place those echoes deep in the scan line.\n\nClick Next to begin Module 2.", action: null } 
            },
            totalSteps: 4
        },
        2: {
            title: "Module 2: Echogenicity",
            steps: {
                1: { text: "Understanding Brightness", details: "Brightness is the volume, or the intensity, of the returning echo. The louder the returning echo, the brighter it will appear. The quieter the returning echo, the less bright it will appear.\n\nImagine the BOTTOM of your phone is the transducer face making contact with the patient. Enable Motion on your phone.", action: "sweep_start" },
                2: { text: "Anechoic Tissues (Fluid)", details: "Using the bottom of your phone as the pivot point, fan the bottom edge LEFT to angle your beam toward the black circular shape. This is an 'Anechoic' structure, like a fluid-filled cyst. Sound passes completely through fluid without reflecting back.", action: "find_fluid" },
                3: { text: "Hyperechoic Tissues (Bone)", details: "Now fan the bottom of your phone RIGHT to find the solid white block. This is a 'Hyperechoic' structure, like bone. Dense objects reflect almost all sound waves back immediately, creating a massive amplitude (bright white).", action: "find_bone" }
            },
            totalSteps: 3   
        },
        3: {
            title: "Module 3: Frequency vs Penetration",
            steps: {
                1: { text: "The Core Trade-off", details: "Frequency is inversely proportional to wavelength. Higher frequencies improve resolution (a prettier picture) but cannot penetrate deeply into tissue.\n\nLook at the monitor. The top of the tissue is beautifully clear, but the bottom is entirely black. Click Next.", action: null },
                2: { text: "Lowering the Frequency", details: "To see deeper structures, we must decrease the frequency. This allows sound to penetrate further, but sacrifices detail.\n\nSlide the FREQUENCY on this computer down to 3.0 MHz to find the deep target.", action: "lower_frequency" }
            },
            totalSteps: 2
        },
        4: {
            title: "Module 4: Probe Manipulation",
            steps: {
                1: { text: "Rocking (Heel-to-Toe)", details: "Rocking involves angling the transducer along its long axis (tilting side-to-side).\n\nThere is a blood vessel deep in this tissue, but it is currently off-center to the left. Tilt your phone side-to-side (Rocking) to sweep the beam and find the circular vessel.<br><div class='diagram-container'><div class='diagram-phone diagram-rock'></div></div>", action: "rock_center" },
                2: { text: "Rotating (Twisting)", details: "Rotating involves twisting the transducer around its vertical axis. This changes your view from a transverse (cross-section) to a longitudinal (long-axis) view.\n\nTwist your phone 90 degrees to turn the circular vessel into a long, tubular highway.<br><div class='diagram-container'><div class='diagram-phone diagram-rotate'></div></div>", action: "rotate_long" },
                3: { text: "Fanning (Sweeping)", details: "Fanning involves angling the transducer along its short axis (tilting forward or backward).\n\nNow that you have a longitudinal view, tilt the top of the phone forward (Fanning) to angle the beam down the length of the vessel and find the bright white blood clot.<br><div class='diagram-container'><div class='diagram-phone diagram-fan'></div></div>", action: "fan_clot" }
            },
            totalSteps: 3
        }
    },

    init: function() { this.updateHUD(); },

    updateHUD: function() {
        if (this.lastLoadedModule !== this.currentModule) {
            this.loadGraphicsForCurrentModule();
            this.lastLoadedModule = this.currentModule;
        }

        const mod = this.syllabus[this.currentModule];
        if (!mod) return;
        
        document.getElementById('hud-title').innerText = mod.title;
        document.getElementById('step-count').innerText = this.currentStep;
        document.getElementById('hud-instructions').innerText = mod.steps[this.currentStep].text;
        document.getElementById('edu-details').innerHTML = mod.steps[this.currentStep].details.replace(/\n/g, '<br>');

        const freqConsole = document.getElementById('console-freq');
        if (freqConsole) {
            freqConsole.style.opacity = (this.currentModule === 3) ? '1' : '0';
            freqConsole.style.pointerEvents = (this.currentModule === 3) ? 'auto' : 'none';
        }

        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        
        btnPrev.disabled = (this.currentModule === 1 && this.currentStep === 1);
        
        if (this.currentStep === mod.totalSteps && !this.syllabus[this.currentModule + 1]) {
            btnNext.disabled = true;
            btnNext.innerText = "Course Complete";
        } else {
            if (mod.steps[this.currentStep].action) {
                btnNext.disabled = true;
                btnNext.innerText = "Awaiting Action...";
                btnNext.style.backgroundColor = ""; 
                btnNext.style.borderColor = "";
            } else {
                btnNext.disabled = false;
                btnNext.innerText = "Next \u2192";
                btnNext.style.backgroundColor = "";
            }
        }
    },

    evaluateAction: function(actionType) {
        const mod = this.syllabus[this.currentModule];
        if (!mod || !mod.steps || !mod.steps[this.currentStep]) return; 

        if (actionType === mod.steps[this.currentStep].action) {
            const btnNext = document.getElementById('btn-next');
            btnNext.disabled = false;
            btnNext.innerText = "Next \u2192";
            btnNext.style.backgroundColor = "#238636"; 
            btnNext.style.borderColor = "#2ea043";
        }
    },

    goForward: function() {
        const mod = this.syllabus[this.currentModule];
        if (this.currentStep < mod.totalSteps) {
            this.currentStep++;
            this.updateHUD();
        } else {
            if (this.syllabus[this.currentModule + 1]) {
                this.currentModule++;
                this.currentStep = 1;
                this.updateHUD(); 
            }
        }
        this.syncPhone();
    },

    goBack: function() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateHUD();
        } else if (this.currentModule > 1) {
            this.currentModule--;
            this.currentStep = this.syllabus[this.currentModule].totalSteps;
            this.updateHUD(); 
        }
        this.syncPhone();
    },

    loadGraphicsForCurrentModule: function() {
        if (this.currentModule === 1 && typeof loadModule1 === 'function') loadModule1(); 
        if (this.currentModule === 2 && typeof loadModule2 === 'function') loadModule2();
        if (this.currentModule === 3 && typeof loadModule3 === 'function') loadModule3();
        if (this.currentModule === 4 && typeof loadModule4 === 'function') loadModule4(); 
    },

    syncPhone: function() {
        let modNum = (this.currentModule === 'playground') ? 4 : this.currentModule;
        const payload = { command: 'sync_module', module: modNum };

        if (activeP2PConn && activeP2PConn.open) {
            // 1. Send ONLY via Direct P2P (Costs 0 quota)
            activeP2PConn.send(payload);
        } else if (ablyChannel) {
            // 2. ONLY use Cloud Relay if P2P is broken or missing
            ablyChannel.publish('host-command', payload);
        }
    },

    setFrequency: function(val) {
        document.getElementById('freq-val').innerText = parseFloat(val).toFixed(1);
        if (typeof updateMod3Freq === 'function') updateMod3Freq(val);
        if (val <= 4.0) this.evaluateAction('lower_frequency');
    }
};

// ==========================================
// HYBRID NETWORK ENGINE (P2P + ABLY FALLBACK)
// ==========================================
const roomPIN = Math.floor(1000 + Math.random() * 9000); 
const ABLY_API_KEY = 'a2d6Dg.n1367A:B_CKjjgBzmIV1wt743VG95MCHqBpSXKJp4AK3YQCUVo'; 

let peerHost = null;
let activeP2PConn = null;
let ablyRealtime = null;
let ablyChannel = null;

function handleIncomingData(data) {
    if (data.fire === true) {
        Tutorial.evaluateAction('fire_pulse');
        if (typeof triggerPulseAnimation === 'function') triggerPulseAnimation();
    }
    if (data.orientation) {
        if (Tutorial.currentModule === 2) Tutorial.evaluateAction('sweep_start'); 
        if (typeof window.updateGlobalIMU === 'function') {
            window.updateGlobalIMU(data.orientation);
        }
    }
}

function onProbeConnected(transportMode) {
    document.getElementById('status').innerText = 'PROBE CONNECTED (' + transportMode + ')';
    document.getElementById('status').style.color = '#44ff44';
    document.getElementById('room-display').style.display = 'none'; 
    
    Tutorial.evaluateAction('connect');
    Tutorial.syncPhone();
}

// THE FIX: Use addEventListener so we don't accidentally overwrite graphics.js!
window.addEventListener('load', () => {
    document.getElementById('room-display').innerText = 'Room PIN: ' + roomPIN;
    Tutorial.init();

    let p2pStatus = "Connecting...";
    let cloudStatus = "Connecting...";

    const updateStatusUI = () => {
        // Don't update the dashboard if the probe has already connected
        const statusEl = document.getElementById('status');
        if (!statusEl || statusEl.innerText.includes('PROBE CONNECTED')) return;

        statusEl.innerHTML = `
            <div style="font-size: 16px; margin-top: 10px; font-weight: normal;">
                Direct P2P: <span style="font-weight: bold; color:${p2pStatus === 'READY' ? '#44ff44' : (p2pStatus === 'Connecting...' ? '#888' : '#ff4444')}">${p2pStatus}</span>
                <br>
                Cloud Relay: <span style="font-weight: bold; color:${cloudStatus === 'READY' ? '#58a6ff' : (cloudStatus === 'Connecting...' ? '#888' : '#ff4444')}">${cloudStatus}</span>
            </div>
        `;
    };

    updateStatusUI();

    // 1. Primary: PeerJS (Direct P2P)
    try {
        peerHost = new Peer('sim-hosp-' + roomPIN);
        
        // Wait for the laptop to successfully register its ID
        peerHost.on('open', (id) => {
            p2pStatus = "READY";
            updateStatusUI();
        });

        peerHost.on('connection', (conn) => {
            conn.on('open', () => {
                activeP2PConn = conn;
                onProbeConnected('Direct P2P');
                conn.on('data', handleIncomingData);
            });
        });
        
        // If the laptop's P2P gets blocked, capture the exact reason!
        peerHost.on('error', (err) => {
            p2pStatus = "BLOCKED (" + err.type + ")";
            updateStatusUI();
        });
    } catch(e) {
        p2pStatus = "CRASHED (" + e.message + ")";
        updateStatusUI();
    }

    // 2. Fallback: Ably Cloud Relay
    try {
        ablyRealtime = new Ably.Realtime({ key: ABLY_API_KEY, clientId: 'laptop-host' });
        
        ablyRealtime.connection.on('connected', () => {
            ablyChannel = ablyRealtime.channels.get('sim-hosp-' + roomPIN);
            
            ablyChannel.attach((err) => {
                if (err) {
                    cloudStatus = "BLOCKED";
                    updateStatusUI();
                    return;
                }
                
                ablyChannel.presence.enter('laptop-host', (pErr) => {
                    if (!pErr) {
                        cloudStatus = "READY";
                        updateStatusUI();
                    }
                });
                
                ablyChannel.presence.subscribe('enter', (member) => {
                    if (member.clientId === 'phone-probe' && !activeP2PConn) {
                        onProbeConnected('Cloud Relay');
                    }
                });

                ablyChannel.subscribe('sensor-data', (message) => {
                    handleIncomingData(message.data);
                });
            });
        });

        ablyRealtime.connection.on('failed', () => {
            cloudStatus = "BLOCKED";
            updateStatusUI();
        });
        
    } catch (err) {
        cloudStatus = "CRASHED (" + err.message + ")";
        updateStatusUI();
    }
});