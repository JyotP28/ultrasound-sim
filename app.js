// ==========================================
// THE TUTORIAL ENGINE (Expanded Curriculum)
// ==========================================

let activeConnection = null; // Store the connection so the laptop can talk to the phone

const Tutorial = {
    currentModule: 1,
    currentStep: 1,
    
    syllabus: {
        1: {
            title: "Module 1: The Pulse-Echo Principle",
            steps: {
                1: { text: "What is Ultrasound?", details: "Human hearing operates between 20 and 20,000 Hertz. Ultrasound is simply sound waves that are above the hearing threshold. Diagnostic medical ultrasound typically uses frequencies ranging from one to twenty plus megahertz.\n\nTo begin, look at the Room PIN at the bottom of this panel and enter it into your Smartphone.", action: "connect" },
                2: { text: "The Transducer as a Speaker", details: "The ultrasound machine works similarly to a speaker. It uses electrical energy to produce sound waves inside the transducer. Some of these sound waves reflect off of the patient's tissues and are transmitted back.\n\nPress the 'FIRE PULSE' button on your phone to send a sound wave into the tissue.", action: "fire_pulse" },
                3: { text: "Forming the Image", details: "The transducer converts the returning sound waves back into electrical energy, which is processed to form a visual scan line on the monitor below.\n\nPress 'FIRE PULSE' again to observe the returning echoes drawing the scan lines.", action: "fire_pulse" },
                4: { text: "Understanding Depth", details: "Depth is a function of distance to the ultrasound machine. The longer it takes a wave to return to the machine, the deeper it had to penetrate into the tissues, and the ultrasound machine knows to place those echoes deep in the scan line.\n\nObserve the different depths of the scan dots, then press 'START MODULE 2' on your phone.", action: "start_mod_2" }
            },
            totalSteps: 4
        },
        2: {
            title: "Module 2: Amplitude & Echogenicity",
            steps: {
                1: { text: "Understanding Brightness", details: "Brightness is the volume, or the intensity, of the returning echo. The louder the returning echo, the brighter it will appear. The quieter the returning echo, the less bright it will appear.\n\nUse the slider on your phone to sweep the probe across the tissue.", action: "sweep_start" },
                2: { text: "Anechoic Tissues (Fluid)", details: "Slide your phone LEFT to find the black circular shape. This is an 'Anechoic' structure, like a fluid-filled cyst. Sound passes completely through fluid without reflecting back, resulting in zero amplitude (pitch black).", action: "find_fluid" },
                3: { text: "Hyperechoic Tissues (Bone)", details: "Now slide your phone RIGHT to find the solid white block. This is a 'Hyperechoic' structure, like bone. Dense objects reflect almost all sound waves back immediately, creating a massive amplitude (bright white).", action: "find_bone" }
            },
            totalSteps: 3
        },
        3: {
            title: "Module 3: Frequency & Penetration",
            steps: {
                1: { 
                    text: "The Core Trade-off", 
                    details: "Frequency is inversely proportional to wavelength[cite: 1]. Higher frequencies improve resolution (a prettier picture) but cannot penetrate deeply into tissue[cite: 1].\n\nLook at the monitor. The top of the tissue is beautifully clear, but the bottom is entirely black. Press NEXT on your phone.", 
                    action: "start_mod_3" 
                },
                2: { 
                    text: "Lowering the Frequency", 
                    details: "To see deeper structures, we must decrease the frequency[cite: 1]. This allows sound to penetrate further, but sacrifices detail—much like how only low-frequency bass notes can be heard from a distant stadium concert[cite: 1].\n\nSlide the FREQUENCY on your phone down to 3.0 MHz to find the deep target.", 
                    action: "lower_frequency" 
                }
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
    },

    evaluateAction: function(actionType) {
        const mod = this.syllabus[this.currentModule];
        if (!mod) return;
        
        if (actionType === mod.steps[this.currentStep].action) {
            this.advanceStep();
        }
    },

    advanceStep: function() {
        const mod = this.syllabus[this.currentModule];
        
        if (this.currentStep < mod.totalSteps) {
            this.currentStep++;
            this.updateHUD();
            
            // NEW: If we reached Step 4, tell the phone to reveal the "Start Module 2" button!
            if (this.currentModule === 1 && this.currentStep === 4) {
                if (activeConnection) activeConnection.send({ command: 'unlock_mod2' });
            }
        // Inside advanceStep: function() { ... }
    // Replace the end of the function with this:
        } else {
            this.currentModule++;
            this.currentStep = 1;
            if (this.syllabus[this.currentModule]) {
                this.updateHUD();
                if (this.currentModule === 2 && typeof loadModule2 === 'function') loadModule2(); 
                if (this.currentModule === 3 && typeof loadModule3 === 'function') loadModule3(); 
            }
            // Tell the phone to unlock the next module's UI
            if (activeConnection) activeConnection.send({ command: `unlock_mod${this.currentModule}` });
        }


    // Inside conn.on('data', data => { ... })
    // Add these listeners at the bottom of the data checks:
        if (data.action === 'start_mod_3') Tutorial.evaluateAction('start_mod_3');
        if (data.frequency !== undefined && typeof updateMod3Freq === 'function') {
            updateMod3Freq(data.frequency);
            if (data.frequency <= 4.0) Tutorial.evaluateAction('lower_frequency');
        }
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
    activeConnection = conn; // Save the connection globally
    
    document.getElementById('status').innerText = 'PROBE CONNECTED';
    document.getElementById('status').style.color = '#44ff44';
    document.getElementById('room-display').style.display = 'none'; 
    
    Tutorial.evaluateAction('connect');

    conn.on('data', data => {
        if (data.fire === true) {
            Tutorial.evaluateAction('fire_pulse');
            if (typeof triggerPulseAnimation === 'function') triggerPulseAnimation();
        }
        if (data.action === 'start_mod_2') {
            Tutorial.evaluateAction('start_mod_2');
        }
        if (data.sweep !== undefined) {
            Tutorial.evaluateAction('sweep_start');
            if (typeof updateMod2Probe === 'function') updateMod2Probe(data.sweep);
        }
    });
});