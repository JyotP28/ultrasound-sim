// ==========================================
// THE TUTORIAL ENGINE (LMS Navigation)
// ==========================================

let activeConnection = null; 

const Tutorial = {
    currentModule: 1,
    currentStep: 1,
    
    syllabus: {
        1: {
            title: "Module 1: The Pulse-Echo",
            steps: {
                1: { text: "What is Ultrasound?", details: "Human hearing operates between 20 and 20,000 Hertz. Ultrasound is simply sound waves that are above the hearing threshold. Diagnostic medical ultrasound typically uses frequencies ranging from one to twenty plus megahertz.\n\nTo begin, enter the Room PIN into your Smartphone to connect.", action: "connect" },
                2: { text: "The Transducer as a Speaker", details: "The ultrasound machine works similarly to a speaker. It uses electrical energy to produce sound waves inside the transducer. Some of these sound waves reflect off of the patient's tissues and are transmitted back.\n\nPress the 'FIRE PULSE' button on your phone.", action: "fire_pulse" },
                3: { text: "Forming the Image", details: "The transducer converts the returning sound waves back into electrical energy, which is processed to form a visual scan line on the monitor below.\n\nPress 'FIRE PULSE' again to observe the returning echoes drawing the scan lines.", action: "fire_pulse" },
                4: { text: "Understanding Depth", details: "Depth is a function of distance to the ultrasound machine. The longer it takes a wave to return to the machine, the deeper it had to penetrate into the tissues, and the ultrasound machine knows to place those echoes deep in the scan line.\n\nClick Next to begin Module 2.", action: null } // No physical action required to proceed here
            },
            totalSteps: 4
        },
        2: {
            title: "Module 2: Echogenicity",
            steps: {
                1: { text: "Understanding Brightness", details: "Brightness is the volume, or the intensity, of the returning echo. The louder the returning echo, the brighter it will appear. The quieter the returning echo, the less bright it will appear.\n\nEnable Motion on your phone, then tilt it to sweep the probe.", action: "sweep_start" },
                2: { text: "Anechoic Tissues (Fluid)", details: "Tilt your phone LEFT to find the black circular shape. This is an 'Anechoic' structure, like a fluid-filled cyst. Sound passes completely through fluid without reflecting back, resulting in zero amplitude (pitch black).", action: "find_fluid" },
                3: { text: "Hyperechoic Tissues (Bone)", details: "Now tilt your phone RIGHT to find the solid white block. This is a 'Hyperechoic' structure, like bone. Dense objects reflect almost all sound waves back immediately, creating a massive amplitude (bright white).", action: "find_bone" }
            },
            totalSteps: 3
        },
        3: {
            title: "Module 3: Frequency vs Penetration",
            steps: {
                1: { text: "The Core Trade-off", details: "Frequency is inversely proportional to wavelength. Higher frequencies improve resolution (a prettier picture) but cannot penetrate deeply into tissue.\n\nLook at the monitor. The top of the tissue is beautifully clear, but the bottom is entirely black. Click Next.", action: null },
                2: { text: "Lowering the Frequency", details: "To see deeper structures, we must decrease the frequency. This allows sound to penetrate further, but sacrifices detail—much like how only low-frequency bass notes can be heard from a distant stadium concert.\n\nSlide the FREQUENCY on this computer down to 3.0 MHz to find the deep target.", action: "lower_frequency" }
            },
            totalSteps: 2
        }
    },

    init: function() { this.updateHUD(); },

    updateHUD: function() {
        const mod = this.syllabus[this.currentModule];
        if (!mod) return;
        
        document.getElementById('hud-title').innerText = mod.title;
        document.getElementById('step-count').innerText = this.currentStep;
        document.getElementById('hud-instructions').innerText = mod.steps[this.currentStep].text;
        document.getElementById('edu-details').innerHTML = mod.steps[this.currentStep].details.replace(/\n/g, '<br>');

        // Toggle Frequency Slider Visibility on Laptop
        const freqConsole = document.getElementById('console-freq');
        if (freqConsole) {
            freqConsole.style.opacity = (this.currentModule === 3) ? '1' : '0';
            freqConsole.style.pointerEvents = (this.currentModule === 3) ? 'auto' : 'none';
        }

        // --- THE NEXT/PREV NAVIGATION LOCK ---
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        
        btnPrev.disabled = (this.currentModule === 1 && this.currentStep === 1);
        
        if (this.currentStep === mod.totalSteps && !this.syllabus[this.currentModule + 1]) {
            btnNext.disabled = true;
            btnNext.innerText = "Course Complete";
        } else {
            // If the step requires an action, disable the Next button until they do it!
            if (mod.steps[this.currentStep].action) {
                btnNext.disabled = true;
                btnNext.innerText = "Awaiting Action...";
                btnNext.style.backgroundColor = ""; // Reset style
                btnNext.style.borderColor = "";
            } else {
                btnNext.disabled = false;
                btnNext.innerText = "Next \u2192";
                btnNext.style.backgroundColor = "";
            }
        }
    },

    evaluateAction: function(actionType) {
        const expected = this.syllabus[this.currentModule].steps[this.currentStep].action;
        if (actionType === expected) {
            // Success! Unlock the Next button.
            const btnNext = document.getElementById('btn-next');
            btnNext.disabled = false;
            btnNext.innerText = "Next \u2192";
            btnNext.style.backgroundColor = "#238636"; // Turn it green!
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
                this.loadGraphicsForCurrentModule();
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
            this.loadGraphicsForCurrentModule();
        }
        this.syncPhone();
    },

    loadGraphicsForCurrentModule: function() {
        if (this.currentModule === 1 && typeof loadModule1 === 'function') loadModule1(); 
        if (this.currentModule === 2 && typeof loadModule2 === 'function') loadModule2();
        if (this.currentModule === 3 && typeof loadModule3 === 'function') loadModule3();
    },

    syncPhone: function() {
        if (activeConnection) {
            activeConnection.send({ command: 'sync_module', module: this.currentModule });
        }
    },

    setFrequency: function(val) {
        document.getElementById('freq-val').innerText = parseFloat(val).toFixed(1);
        if (typeof updateMod3Freq === 'function') updateMod3Freq(val);
        if (val <= 4.0) this.evaluateAction('lower_frequency');
    }
};

// ==========================================
// NETWORK CONNECTION
// ==========================================
const roomPIN = Math.floor(1000 + Math.random() * 9000); 
const peer = new Peer('sim-hosp-' + roomPIN);

window.onload = () => {
    document.getElementById('room-display').innerText = 'Room PIN: ' + roomPIN;
    Tutorial.init();
};

peer.on('connection', conn => {
    activeConnection = conn; 
    document.getElementById('status').innerText = 'PROBE CONNECTED';
    document.getElementById('status').style.color = '#44ff44';
    document.getElementById('room-display').style.display = 'none'; 
    Tutorial.evaluateAction('connect');
    Tutorial.syncPhone();

    conn.on('data', data => {
        if (data.fire === true) {
            Tutorial.evaluateAction('fire_pulse');
            if (typeof triggerPulseAnimation === 'function') triggerPulseAnimation();
        }
        if (data.orientation && data.orientation.gamma !== undefined) {
            if (Tutorial.currentModule === 2 && typeof updateMod2Probe === 'function') {
                Tutorial.evaluateAction('sweep_start'); 
                updateMod2Probe(data.orientation.gamma);
            }
        }
    });
});