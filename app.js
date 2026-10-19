// ==========================================================================
// SONO-ACADEMY: Clinical Ultrasound Master Simulation Engine
// Comprehensive Educational Architecture & Real-Time Visuospatial Core
// ==========================================================================

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

// Telemetry state registers for Inspector
let packetCount = 0;
let measuredHz = 0;
let rawEulerDisplay = { alpha: 0, beta: 0, gamma: 0 };

setInterval(() => {
    measuredHz = packetCount;
    packetCount = 0;
}, 1000);

// ==========================================================================
// 1. NETWORK & IMU TELEMETRY
// ==========================================================================
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
        packetCount++;
        rawEulerDisplay.alpha = data.orientation.alpha || 0;
        rawEulerDisplay.beta = data.orientation.beta || 0;
        rawEulerDisplay.gamma = data.orientation.gamma || 0;

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
    const pinElem = document.getElementById('room-display');
    if (pinElem) pinElem.innerText = roomPIN;

    const probeUrl = new URL('probe.html', window.location.href).href; 

    const qrLanding = document.getElementById('qr-landing');
    if (qrLanding && qrLanding.innerHTML === "") {
        new QRCode(qrLanding, { text: probeUrl, width: 140, height: 140, colorDark: "#070a12", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    }

    const qrSidebar = document.getElementById('qr-sidebar');
    if (qrSidebar && qrSidebar.innerHTML === "") {
        new QRCode(qrSidebar, { text: probeUrl, width: 50, height: 50, colorDark: "#070a12", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    }

    const peer = new Peer('sim-hosp-' + roomPIN);
    peer.on('open', () => {
        const statusElem = document.getElementById('status');
        if (statusElem) statusElem.innerText = 'P2P Ready | Waiting for probe...';
    });
    
    peer.on('connection', (conn) => {
        activeP2PConn = conn;
        const statusElem = document.getElementById('status');
        const statusDot = document.getElementById('status-dot');
        if (statusElem) statusElem.innerText = 'Transducer Active';
        if (statusDot) statusDot.className = 'status-dot connected';
        
        if (window.Tutorial) window.Tutorial.syncPhone();
        if (Tutorial.currentModule === 1 && Tutorial.currentStep === 1) {
            Tutorial.evaluateAction('connect');
        }
        
        conn.on('data', handleIncomingData);
        conn.on('close', () => {
            activeP2PConn = null;
            if (statusDot) statusDot.className = 'status-dot';
            if (statusElem) statusElem.innerText = 'Transducer Disconnected';
        });
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

// ==========================================================================
// 2. COMPREHENSIVE EDUCATIONAL CURRICULUM
// ==========================================================================
window.Tutorial = {
    currentModule: 1,
    currentStep: 1,
    stepComplete: false,

    curriculum: {
        1: {
            title: "Module 1: The Pulse-Echo Principle & Acoustic Formation",
            steps: [
                {
                    heading: "Piezoelectric Transduction",
                    badge: "Acoustic Physics",
                    concept: "Diagnostic medical ultrasound relies on the <b>Piezoelectric Effect</b>. When an alternating electric current is applied across synthetic lead zirconate titanate (PZT) crystals inside the transducer, the crystals rapidly expand and contract, generating high-frequency mechanical pressure waves (sound) that propagate into biological tissue.",
                    formula: "Piezoelectric conversion: Voltage \\rightarrow \\text{Mechanical Wave} (1-15\\text{ MHz})",
                    clinical: "Without acoustic coupling gel, over 99% of sound energy reflects off the microscopic air layer on the skin. Gel matches the acoustic impedance of the transducer face to the patient's skin, permitting wave transmission.",
                    actionText: "Scan the QR code or enter the Room PIN on your smartphone to initialize the transducer array.",
                    action: "connect"
                },
                {
                    heading: "Time-of-Flight & B-Mode Formation",
                    badge: "Range Equation",
                    concept: "A transducer spends roughly <b>1% of its time transmitting</b> sound pulses and <b>99% of its time listening</b> for returning echoes. Because sound travels through soft tissue at a known average velocity (\\(c \\approx 1540\\text{ m/s}\\)), the ultrasound processor calculates the precise depth of a tissue reflector using the round-trip transit time.",
                    formula: "d = \\frac{c \\cdot t}{2} \\quad (c = 1540\\text{ m/s}, \\; t = \\text{Round-trip travel time})",
                    clinical: "Deeper structures produce echoes that take significantly longer to return. This fundamental relationship limits the maximum Frame Rate (temporal resolution) when imaging deep abdominal structures.",
                    actionText: "Tap <b>TRANSMIT PULSE</b> on your transducer phone. Watch the wavefront propagate downward and register two distinct depth echoes on the B-mode monitor.",
                    action: "fire_pulse"
                }
            ]
        },
        2: {
            title: "Module 2: Acoustic Impedance & The Echogenicity Spectrum",
            steps: [
                {
                    heading: "Anechoic Media & Pure Fluid Transmission",
                    badge: "Tissue Mechanics",
                    concept: "<b>Acoustic Impedance</b> (\\(Z = \\rho \\cdot c\\)) is the resistance tissue offers to acoustic waves. Homogeneous fluids like urine, bile, or transudate contain no internal acoustic interfaces. Sound waves traverse fluid unimpeded, generating zero return echoes. The machine displays this absence of echoes as <b>Anechoic (Jet Black)</b>.",
                    formula: "Z = \\rho \\cdot c \\quad (\\text{Density } \\rho \\times \\text{Acoustic Velocity } c)",
                    clinical: "Because fluid does not attenuate sound, structures deep to a fluid-filled pocket (such as a full urinary bladder or gallbladder) receive excessive acoustic energy, creating a classic diagnostic artifact: <b>Posterior Acoustic Enhancement</b> (increased through-transmission).",
                    actionText: "Tilt/Rock the transducer upward to locate the fluid-filled cyst. Toggle between the Clear Practice Dome and Opaque Test Block to correlate the 3D position with the 2D B-mode image.",
                    action: "find_fluid"
                },
                {
                    heading: "Hyperechoic Reflection & Acoustic Shadowing",
                    badge: "Specular Interfaces",
                    concept: "When an acoustic wave encounters a dense boundary with extreme acoustic impedance mismatch—such as mineralized bone cortex, uroliths, or gallstones—up to 100% of the wave is reflected back to the probe. The monitor displays this strong reflection as <b>Hyperechoic (Bright White)</b>.",
                    formula: "\\text{Reflection Coefficient } R = \\left(\\frac{Z_2 - Z_1}{Z_2 + Z_1}\\right)^2 \\approx 1.0",
                    clinical: "Because virtually no sound penetrates beyond the mineralized cortical boundary, the region directly posterior receives zero acoustic data, producing a crisp, black <b>Acoustic Shadow</b>. This acoustic shadow is pathognomonic for calculi and foreign bodies.",
                    actionText: "Rock the transducer downward to interrogate the dense cortical bone surface and observe the dense hyperechoic interface and posterior shadowing.",
                    action: "find_bone"
                }
            ]
        },
        3: {
            title: "Module 3: Transducer Physics & Knobology (Frequency vs. Depth)",
            steps: [
                {
                    heading: "High Frequency & Axial Spatial Resolution",
                    badge: "Knobology & Physics",
                    concept: "Acoustic frequency directly dictates wavelength (\\(\\lambda = c/f\\)). Higher frequencies (e.g. <b>10–12 MHz</b>) produce ultra-short spatial pulse lengths, yielding superior <b>Axial Resolution</b> (the ability to distinguish two separate structures along the beam axis). However, high frequencies undergo rapid exponential energy dissipation (attenuation via scatter and thermal absorption).",
                    formula: "\\text{Attenuation } (\\text{dB}) = \\alpha \\cdot f \\cdot d \\quad (\\alpha \\approx 0.5\\text{ dB}/(\\text{cm}\\cdot\\text{MHz}))",
                    clinical: "High-frequency linear transducers are selected for superficial anatomy: vascular cannulation, tendons, feline eyes, and thyroid glands. They cannot penetrate to visualize deep abdominal organs.",
                    actionText: "Adjust the clinical Frequency slider to <b>12.0 MHz</b> to observe maximum resolution of the superficial phantom layer, noting that deep regions attenuate into darkness.",
                    action: "freq_high"
                },
                {
                    heading: "Low Frequency & Deep Tissue Penetration",
                    badge: "Depth Optimization",
                    concept: "Lower frequencies (e.g. <b>2.5–3.5 MHz</b>) feature long acoustic wavelengths that resist tissue absorption and scatter, permitting deep acoustic penetration through thick muscle, adipose, and hepatic parenchyma. The unavoidable physical tradeoff is reduced spatial and axial resolution.",
                    formula: "\\lambda = \\frac{c}{f} \\quad (\\text{Lower } f \\rightarrow \\text{Longer } \\lambda \\rightarrow \\text{Deeper Penetration})",
                    clinical: "Low-frequency curvilinear and phased-array probes are indispensable for adult canine/equine abdominal exams, deep cardiac windows, and large patients. Adjusting frequency on modern multi-frequency probes is the first step when a target is poorly visualized.",
                    actionText: "Lower the Frequency slider to <b>3.0 MHz</b>. Watch the sound waves penetrate the deep tissue to expose the occult deep lesion that was invisible at 12 MHz.",
                    action: "freq_low"
                }
            ]
        },
        4: {
            title: "Module 4: Transducer Manipulation & Visuospatial Reasoning",
            steps: [
                {
                    heading: "Fanning / Sweeping (Pitch - X Axis)",
                    badge: "Volumetric Slicing",
                    concept: "Ultrasound produces a paper-thin, 2-dimensional planar tomogram. To mentally reconstruct a 3-dimensional organ or detect focal lesions, you must perform <b>Fanning (Sweeping)</b>: keeping the probe footprint anchored in place while tilting the sound plane forward and backward through the full volume of interest.",
                    formula: "\\text{Axis: Pitch (X-tilt)} \\quad \\rightarrow \\quad \\text{Serial 2D Planar Interrogation}",
                    clinical: "Failure to thoroughly fan through an entire organ is the #1 cause of missed focal pathologies (e.g. small tumors, focal foreign bodies, or intraluminal clots).",
                    actionText: "Fan (tilt forward and backward) through the blood vessel volume to identify the bright, hyperechoic intraluminal clot.",
                    action: "fan_clot"
                },
                {
                    heading: "Rocking / Heel-to-Toe (Roll - Z Axis)",
                    badge: "Angle of Incidence",
                    concept: "<b>Rocking (Heel-to-Toe)</b> tilts the probe along its longitudinal axis. This maneuver adjusts the beam's angle of incidence to achieve a <b>90° perpendicular alignment</b> relative to the anatomical target, maximizing specular acoustic reflection and centering structures on the display.",
                    formula: "\\theta_i = 0^\\circ \\; (\\text{Perpendicular}) \\quad \\rightarrow \\quad \\text{Maximum Specular Return}",
                    clinical: "Before attempting ultrasound-guided vascular access or fine needle aspirates, the target vessel or mass must be precisely centered on the screen midline using gentle rocking motions.",
                    actionText: "Rock the probe side-to-side (roll) to position the circular cross-section of the vessel directly in the center of the ultrasound monitor.",
                    action: "rock_center"
                },
                {
                    heading: "Axial Rotation (Yaw - Y Axis): Short vs. Long Axis",
                    badge: "Spatial Orientation",
                    concept: "A cylinder cut transversely appears as a circle on a 2D monitor; cut longitudinally, it appears as a tubular channel. <b>Rotation (Twist)</b> spins the transducer 90° in place without sliding, transitioning between the <b>Short-Axis (Transverse)</b> and <b>Long-Axis (Longitudinal)</b> imaging planes.",
                    formula: "\\Delta \\text{Yaw} = 90^\\circ \\quad [\\text{Transverse} \\rightarrow \\text{Longitudinal}]",
                    clinical: "In vascular sonography, short axis confirms circular lumen diameter and compression, while long axis verifies needle trajectory depth inside the lumen. Oblique angles produce distorted, elliptical views.",
                    actionText: "Twist the transducer 90° clockwise in place. Observe the monitor transition from a round cross-section to the lengthwise tubular lumen of the vessel.",
                    action: "rotate_long"
                }
            ]
        },
        5: {
            title: "Module 5: Orthogonal Imaging & Systematic Interrogation",
            steps: [
                {
                    heading: "Orthogonal Confirmation (The 2-Plane Rule)",
                    badge: "Diagnostic Standards",
                    concept: "In diagnostic medical sonography, <b>no lesion or structure is ever diagnosed in a single plane</b>. What appears round in transverse view might be an elongated vessel or a spherical cyst. Confirming pathology requires systematic interrogation in two mutually perpendicular (orthogonal) anatomical planes.",
                    formula: "\\text{Diagnostic Rule: } \\text{Plane } 1 \\perp \\text{Plane } 2 \\; (90^\\circ \\text{ Orthogonal Validation})",
                    clinical: "Novice sonographers frequently misinterpret transverse tubular vessels as solitary round cysts. Rotating back and forth between orthogonal axes confirms continuous tubular anatomy versus discrete circumscribed masses.",
                    actionText: "Rotate the transducer 90° counter-clockwise back to the Short-Axis transverse view to confirm true cylindrical geometry.",
                    action: "rotate_short"
                },
                {
                    heading: "Systematic Interrogation & Perpendicularity",
                    badge: "Clinical Mastery",
                    concept: "As established in the SHAPES research study, novices frequently hold the probe at an oblique tilt rather than maintaining perpendicularity to the scanning surface. Systematic quadrant interrogation with perpendicular beam orientation ensures complete diagnostic coverage without geometric distortion.",
                    formula: "\\text{Systematic Scan: 4-Quadrant Sweep with } 90^\\circ \\text{ Surface Normal}",
                    clinical: "Mastering perpendicular transducer contact and systematic fanning eliminates operator-induced artifacts, edge shadows, and false positive findings prior to live animal examinations.",
                    actionText: "Center the short-axis vessel profile with perpendicular alignment to complete the clinical interrogation protocol.",
                    action: "verify_orthogonal"
                }
            ]
        },
        6: {
            title: "Module 6: Psychomotor Transducer Motor Training",
            steps: [
                {
                    heading: "Deliberate Motor Coordination (Playground)",
                    badge: "Psychomotor Dexterity",
                    concept: "Translating mental 3D spatial intent into micro-adjustments of the wrist requires deliberate motor practice. This training module challenges you to control probe pitch and roll to navigate precision target trajectories with minimal visual latency.",
                    formula: "\\text{Motor Proprioception: Visual Feedback Loop } \\rightarrow \\text{Fine Wrist Dexterity}",
                    clinical: "Hands-on simulation models dramatically shorten the clinical learning curve, preparing novices to manipulate transducers steadily on breathing, moving clinical patients.",
                    actionText: "Hold your transducer phone upright and steer the precision tracking laser over the target checkpoints on the table to complete all three training levels.",
                    action: "free_pass"
                }
            ]
        }
    },

    syncPhone: function() {
        let modNum = this.currentModule;
        const payload = { command: 'sync_module', module: modNum };
        if (activeP2PConn && activeP2PConn.open) activeP2PConn.send(payload);
        else if (ablyChannel) ablyChannel.publish('host-command', payload);
    },

    loadModule: function(moduleNum) {
        this.currentModule = moduleNum;
        this.currentStep = 1;
        this.syncPhone();

        // Update Top Navigation Pills
        document.querySelectorAll('.mod-pill').forEach((pill, idx) => {
            const pMod = idx + 1;
            pill.classList.remove('active');
            if (pMod === moduleNum) pill.classList.add('active');
            if (pMod < moduleNum) pill.classList.add('completed');
        });

        // Control Visibility of SHAPES Elements
        const toggleBar = document.getElementById('phantom-mode-selector');
        const axisInd = document.getElementById('axis-indicator');
        const banner = document.getElementById('feedback-banner');
        if (banner) banner.style.display = 'none';

        if (toggleBar) {
            toggleBar.style.display = (moduleNum === 2 || moduleNum === 4 || moduleNum === 5) ? 'flex' : 'none';
        }
        if (axisInd) {
            axisInd.style.display = (moduleNum === 4 || moduleNum === 5) ? 'flex' : 'none';
        }

        if (moduleNum === 2 || moduleNum === 4 || moduleNum === 5) {
            window.setPhantomMode('clear', true);
        }

        // Delegate to module graphics loaders
        if (moduleNum === 1 && window.loadModule1) window.loadModule1();
        if (moduleNum === 2 && window.loadModule2) window.loadModule2();
        if (moduleNum === 3 && window.loadModule3) window.loadModule3();
        if (moduleNum === 4 && window.loadModule4) window.loadModule4();
        if (moduleNum === 5 && window.loadModule4) window.loadModule4(); // Uses vessel/clot engine for orthogonal challenge
        if (moduleNum === 6) {
            if (window.loadPlayground) window.loadPlayground();
            const freqConsole = document.getElementById('console-freq');
            if (freqConsole) {
                freqConsole.style.opacity = '0';
                freqConsole.style.pointerEvents = 'none';
            }
            this.renderStep();
            return;
        }

        this.renderStep();
    },

    renderStep: function() {
        this.stepComplete = false;
        let modData = this.curriculum[this.currentModule];
        if (!modData) return;

        let stepData = modData.steps[this.currentStep - 1];
        if (!stepData) return;

        const progressElem = document.getElementById('hud-progress');
        const titleElem = document.getElementById('hud-title');
        const instrElem = document.getElementById('hud-instructions');
        const detailsElem = document.getElementById('edu-details');
        const nextBtn = document.getElementById('btn-next');
        const freqConsole = document.getElementById('console-freq');

        if (progressElem) {
            progressElem.innerHTML = `MODULE ${this.currentModule} &bull; STEP ${this.currentStep} OF ${modData.steps.length} &bull; <span style="color:#94a3b8;">${stepData.badge}</span>`;
        }
        if (titleElem) titleElem.innerText = modData.title;
        if (instrElem) instrElem.innerText = stepData.heading;

        // Structured Educational Card Layout
        if (detailsElem) {
            detailsElem.innerHTML = `
                <div class="edu-card">
                    <div class="edu-card-label">Concept</div>
                    <div class="clinical-text">${stepData.concept}</div>
                </div>

                <div class="formula-callout">
                    \\(${stepData.formula}\\)
                </div>

                <div class="edu-card">
                    <div class="edu-card-label">Clinical Significance</div>
                    <div class="clinical-text">${stepData.clinical}</div>
                </div>

                <div class="action-card">
                    <div class="action-card-header">Action Required</div>
                    <div>${stepData.actionText}</div>
                </div>
            `;
            // Render LaTeX math with KaTeX after DOM is written
            if (window.renderMath) window.renderMath();
        }

        const banner = document.getElementById('feedback-banner');
        if (banner) banner.style.display = 'none';

        if (stepData.action === "free_pass") {
            this.stepComplete = true;
            if (nextBtn) nextBtn.style.display = 'inline-flex';
        } else {
            if (nextBtn) nextBtn.style.display = 'none';
        }

        if (this.currentModule === 3) {
            if (freqConsole) {
                freqConsole.style.opacity = '1';
                freqConsole.style.pointerEvents = 'auto';
            }
        } else {
            if (freqConsole) {
                freqConsole.style.opacity = '0';
                freqConsole.style.pointerEvents = 'none';
            }
        }

        this.syncPhone();
    },

    evaluateAction: function(actionStr) {
        if (this.currentModule === 6 || this.stepComplete) return;

        let expectedAction = this.curriculum[this.currentModule].steps[this.currentStep - 1].action;
        
        if (actionStr === expectedAction) {
            this.stepComplete = true;
            const instrElem = document.getElementById('hud-instructions');
            if (instrElem) {
                instrElem.innerHTML += ' <span style="color:#10b981; margin-left:8px; font-size:14px;">✓ VERIFIED</span>';
            }
            const nextBtn = document.getElementById('btn-next');
            if (nextBtn) nextBtn.style.display = 'inline-flex';
            
            // Rich Clinical Formative Feedback
            if (actionStr === 'connect') {
                window.showFeedback('<b>Transducer Linked:</b> PZT piezoelectric array connected. Baseline coordinates established.', 'success');
            } else if (actionStr === 'fire_pulse') {
                window.showFeedback('<b>B-Mode Echoes Formed:</b> Notice the deeper target registered with a delay corresponding to \\(t = 2d/c\\).', 'success');
            } else if (actionStr === 'find_fluid') {
                window.showFeedback('<b>Anechoic Target Found:</b> Pure fluid pocket confirmed. High through-transmission observed posterior to lumen.', 'success');
            } else if (actionStr === 'find_bone') {
                window.showFeedback('<b>Hyperechoic Interface Found:</b> Dense cortical mismatch causes total specular return and posterior acoustic shadow.', 'success');
            } else if (actionStr === 'freq_high') {
                window.showFeedback('<b>High Frequency (12 MHz):</b> Crisp superficial axial resolution achieved. Deep structures are heavily attenuated.', 'success');
            } else if (actionStr === 'freq_low') {
                window.showFeedback('<b>Low Frequency (3 MHz):</b> Long wavelengths penetrate deep tissue, bringing the occult mass into full view.', 'success');
            } else if (actionStr === 'fan_clot') {
                window.showFeedback('<b>Volumetric Sweep Complete:</b> Fanning through parallel planes exposed the intraluminal thrombus.', 'success');
            } else if (actionStr === 'rock_center') {
                window.showFeedback('<b>Perpendicular Alignment:</b> Rocking adjusted the beam incident angle, centering the vessel along the midline.', 'success');
            } else if (actionStr === 'rotate_long') {
                window.showFeedback('<b>Long-Axis Plane Confirmed:</b> 90° axial twist verified. Lengthwise tubular lumen clearly demonstrated.', 'success');
            } else if (actionStr === 'rotate_short') {
                window.showFeedback('<b>Orthogonal Short-Axis Confirmed:</b> Circular cross-section re-established, ruling out a round cyst.', 'success');
            } else if (actionStr === 'verify_orthogonal') {
                window.showFeedback('<b>SHAPES Protocol Mastered:</b> Complete 2-plane systematic interrogation verified with zero geometric distortion.', 'success');
            }

            if (this.currentStep === this.curriculum[this.currentModule].steps.length) {
                const detailsElem = document.getElementById('edu-details');
                if (detailsElem) {
                    detailsElem.innerHTML += "<br><div style='padding:12px; background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#a7f3d0; text-align:center; border-radius:6px; font-weight:600;'>Module Objectives Satisfied! Click Next to advance &#8594;</div>";
                }
            }
        }
    },

    goForward: function() {
        if (this.currentModule === 6) {
            window.showFeedback('<b>Curriculum Completed!</b> You have mastered fundamental ultrasound mechanics, knobology, and visuospatial manipulation.', 'success');
            return;
        }
        
        let modData = this.curriculum[this.currentModule];
        if (modData && this.currentStep < modData.steps.length) {
            this.currentStep++;
            this.renderStep();
        } else {
            this.loadModule(this.currentModule + 1);
        }
    },

    goBack: function() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderStep();
        } else if (this.currentModule > 1) {
            this.loadModule(this.currentModule - 1);
        }
    },

    setFrequency: function(val) {
        const freqVal = document.getElementById('freq-val');
        const hudFreq = document.getElementById('hud-freq-display');
        if (freqVal) freqVal.innerText = parseFloat(val).toFixed(1);
        if (hudFreq) hudFreq.innerText = `Freq: ${parseFloat(val).toFixed(1)} MHz`;
        if (window.updateMod3Freq) window.updateMod3Freq(val);
    }
};

// ==========================================================================
// 3. SHAPES VISUOSPATIAL SYSTEM & FORMATION LOGIC
// ==========================================================================

// Graduated Learning Mode: Clear Practice Dome vs. Opaque Test Block
window.setPhantomMode = function(mode, silent) {
    const btnClear = document.getElementById('btn-mode-clear');
    const btnOpaque = document.getElementById('btn-mode-opaque');
    const statusTag = document.getElementById('phantom-status-tag');
    
    if (btnClear && btnOpaque) {
        if (mode === 'clear') {
            btnClear.classList.add('active');
            btnOpaque.classList.remove('active');
            if (statusTag) statusTag.innerText = 'Clear Practice Dome (Visible Anatomy)';
            if (!silent) window.showFeedback('<b>Practice Mode:</b> Phantom is clear. Correlate the 3D cut plane directly with the 2D ultrasound monitor.', 'hint');
        } else {
            btnOpaque.classList.add('active');
            btnClear.classList.remove('active');
            if (statusTag) statusTag.innerText = 'Opaque Test Block (Blind Scan)';
            if (!silent) window.showFeedback('<b>Test Mode:</b> Phantom is opaque. Rely strictly on the 2D ultrasound monitor to infer internal geometry.', 'hint');
        }
    }

    if (window.setMod2PhantomMode) window.setMod2PhantomMode(mode);
    if (window.setMod4PhantomMode) window.setMod4PhantomMode(mode);
};

// Formative Feedback Banner
window.showFeedback = function(msg, type) {
    const banner = document.getElementById('feedback-banner');
    if (!banner) return;
    banner.style.display = 'block';
    banner.className = 'feedback-banner ' + (type === 'success' ? 'feedback-success' : 'feedback-hint');
    banner.innerHTML = msg;
};

// Real-Time Visuospatial Axis Orientation Detector
function monitorAxisOrientation() {
    if (!window.probeState || !window.probeState.currentQuat) return;
    
    const euler = new THREE.Euler().setFromQuaternion(window.probeState.currentQuat, 'YXZ');
    const yawDeg = Math.abs(euler.y * (180 / Math.PI));
    const axisBadge = document.getElementById('axis-badge');
    
    if (!axisBadge) return;

    if (yawDeg < 25 || yawDeg > 155) {
        axisBadge.className = 'axis-badge badge-short';
        axisBadge.innerText = 'SHORT AXIS (TRANSVERSE)';
        
        // Evaluate Module 5 Step 1 (return to short axis)
        if (window.Tutorial && window.Tutorial.currentModule === 5 && window.Tutorial.currentStep === 1) {
            window.Tutorial.evaluateAction('rotate_short');
        }
        // Evaluate Module 5 Step 2 (perpendicular centering in short axis)
        if (window.Tutorial && window.Tutorial.currentModule === 5 && window.Tutorial.currentStep === 2 && Math.abs(euler.z) < 0.1) {
            window.Tutorial.evaluateAction('verify_orthogonal');
        }
    } else if (yawDeg >= 65 && yawDeg <= 115) {
        axisBadge.className = 'axis-badge badge-long';
        axisBadge.innerText = 'LONG AXIS (LONGITUDINAL)';
    } else {
        axisBadge.className = 'axis-badge badge-oblique';
        axisBadge.innerText = 'OBLIQUE ANGLE';
    }
}
setInterval(monitorAxisOrientation, 120);

// Desktop Simulation Controls (Sliders)
let desktopEuler = { x: 0, y: 0, z: 0 };
window.simRotateZ = function(deg) { desktopEuler.z = deg * (Math.PI / 180); updateDesktopQuat(); };
window.simRotateX = function(deg) { desktopEuler.x = deg * (Math.PI / 180); updateDesktopQuat(); };
window.simRotateY = function(deg) { desktopEuler.y = deg * (Math.PI / 180); updateDesktopQuat(); };

function updateDesktopQuat() {
    if (!vrQ0 && typeof THREE !== 'undefined') {
        window.probeState.currentQuat = new THREE.Quaternion();
        window.probeState.targetQuat = new THREE.Quaternion();
        window.baseOffset = new THREE.Quaternion();
        vrQ0 = new THREE.Quaternion();
        vrQ1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
        vrZee = new THREE.Vector3(0, 0, 1);
    }
    const euler = new THREE.Euler(desktopEuler.x, desktopEuler.y, desktopEuler.z, 'YXZ');
    if (window.probeState && window.probeState.targetQuat) {
        window.probeState.targetQuat.setFromEuler(euler);
    }
}

// Onboarding & Launch Transitions (kept for backward compat)
window.startSimulator = function() {
    Tutorial.loadModule(1);
};
window.startPlayground = function() {
    Tutorial.loadModule(6);
};

// Desktop recenter trigger (callable from Pairing Drawer button)
window.recenterFromDesktop = function() {
    window.needsRecenter = true;
    if (activeP2PConn && activeP2PConn.open) {
        activeP2PConn.send({ command: 'sync_module', module: window.Tutorial ? window.Tutorial.currentModule : 1 });
    }
};

// ==========================================================================
// LIVE CODE INSPECTOR TELEMETRY FEED (~60 Hz DOM update loop)
// ==========================================================================
function updateInspectorDOM() {
    const q = window.probeState && window.probeState.currentQuat;

    // Raw Euler display (from latest phone packet)
    const ea = rawEulerDisplay.alpha.toFixed(1);
    const eb = rawEulerDisplay.beta.toFixed(1);
    const eg = rawEulerDisplay.gamma.toFixed(1);

    const codeAlpha = document.getElementById('code-alpha');
    const codeBeta  = document.getElementById('code-beta');
    const codeGamma = document.getElementById('code-gamma');
    if (codeAlpha) codeAlpha.textContent = ea + '\u00b0';
    if (codeBeta)  codeBeta.textContent  = eb + '\u00b0';
    if (codeGamma) codeGamma.textContent = eg + '\u00b0';

    // Telemetry card registers
    const pitchCard = document.getElementById('val-pitch-card');
    const rollCard  = document.getElementById('val-roll-card');
    const yawCard   = document.getElementById('val-yaw-card');
    const quatCard  = document.getElementById('val-quat-card');
    const hzCard    = document.getElementById('val-hz-card');

    if (pitchCard) pitchCard.textContent = eb + '\u00b0';
    if (rollCard)  rollCard.textContent  = eg + '\u00b0';
    if (yawCard)   yawCard.textContent   = ea + '\u00b0';

    if (quatCard && q && q.isQuaternion) {
        quatCard.textContent = '[' +
            q._x.toFixed(2) + ', ' +
            q._y.toFixed(2) + ', ' +
            q._z.toFixed(2) + ', ' +
            q._w.toFixed(2) + ']';
    }
    if (hzCard) hzCard.textContent = measuredHz + ' Hz';

    requestAnimationFrame(updateInspectorDOM);
}

window.addEventListener('load', () => {
    initNetwork();
    Tutorial.loadModule(1);
    requestAnimationFrame(updateInspectorDOM);
});