// ==========================================
// THE TUTORIAL ENGINE (State Machine)
// ==========================================

const Tutorial = {
    currentModule: 1,
    currentStep: 1,
    
    // The Syllabus: Defines every step of the learning process
    syllabus: {
        1: {
            title: "Module 1: The Pulse-Echo",
            steps: {
                1: { text: "Welcome to Ultrasound 101. To begin, look at the Room PIN on your screen and enter it into your Smartphone Probe to connect.", action: "connect" },
                2: { text: "Connection successful! An ultrasound acts like a speaker. Press the 'FIRE' button on your phone to send a single sound wave into the tissue.", action: "fire_pulse" },
                3: { text: "Excellent. Notice how the returning echo creates a bright scan line. Deeper targets take longer to return. Module 1 Complete.", action: "next_module" }
            },
            totalSteps: 3
        }
        // We will add Module 2 (Echogenicity) and Module 3 (Frequency) here as we level up!
    },

    init: function() {
        this.updateHUD();
    },

    updateHUD: function() {
        const mod = this.syllabus[this.currentModule];
        if (!mod) return; // End of curriculum
        
        const stepData = mod.steps[this.currentStep];
        
        document.getElementById('hud-title').innerText = mod.title;
        document.getElementById('hud-instructions').innerText = stepData.text;
        document.getElementById('step-count').innerText = this.currentStep;
        
        // Add a nice visual flash to the HUD to draw the student's attention
        const hud = document.getElementById('instructor-hud');
        hud.style.boxShadow = "0 0 40px rgba(88, 166, 255, 0.8)";
        setTimeout(() => { hud.style.boxShadow = "0 0 20px rgba(88, 166, 255, 0.2)"; }, 500);
    },

    // The Gatekeeper: Checks if the student performed the correct action
    evaluateAction: function(actionType) {
        const mod = this.syllabus[this.currentModule];
        if (!mod) return;
        
        const expectedAction = mod.steps[this.currentStep].action;
        
        if (actionType === expectedAction) {
            console.log(`Step ${this.currentStep} completed!`);
            this.advanceStep();
        }
    },

    advanceStep: function() {
        const mod = this.syllabus[this.currentModule];
        if (this.currentStep < mod.totalSteps) {
            this.currentStep++;
            this.updateHUD();
            
            // If the final step is just a visual summary, auto-advance after 5 seconds
            if (this.syllabus[this.currentModule].steps[this.currentStep].action === "next_module") {
                setTimeout(() => {
                    this.evaluateAction("next_module");
                }, 5000);
            }
        } else {
            console.log("Module Complete! Moving to next module...");
            this.currentModule++;
            this.currentStep = 1;
            
            if (this.syllabus[this.currentModule]) {
                this.updateHUD();
            } else {
                document.getElementById('hud-title').innerText = "End of Demo";
                document.getElementById('hud-instructions').innerText = "More modules coming soon in the next update.";
                document.getElementById('hud-progress').style.display = 'none';
            }
        }
    }
};

// ==========================================
// DYNAMIC NETWORK CONNECTION (PeerJS)
// ==========================================
const roomPIN = Math.floor(1000 + Math.random() * 9000); 
const roomId = 'sim-hosp-' + roomPIN;
const peer = new Peer(roomId);

// Start the tutorial and display the PIN when the page loads
window.onload = () => {
    document.getElementById('room-display').innerText = 'Room PIN: ' + roomPIN;
    Tutorial.init();
};

peer.on('connection', conn => {
    document.getElementById('status').innerText = 'Probe Connected!';
    document.getElementById('status').style.color = '#58a6ff';
    document.getElementById('room-display').innerText = ''; 
    
    // TELL THE STATE MACHINE: The student successfully connected!
    Tutorial.evaluateAction('connect');

    conn.on('data', data => {
        // TELL THE STATE MACHINE: The student pressed the FIRE button!
        if (data.fire === true) {
            Tutorial.evaluateAction('fire_pulse');
            
            // Trigger the visual soundwave animation (we will build this next in graphics.js)
            if (typeof triggerPulseAnimation === 'function') {
                triggerPulseAnimation();
            }
        }
    });
});