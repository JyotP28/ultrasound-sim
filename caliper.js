// ==========================================
// THE CALIPER ENGINE (Clinical Measurement)
// ==========================================
const caliperCanvas = document.getElementById('caliper-layer');
const ctx = caliperCanvas.getContext('2d');

let points = [];
let mousePos = null;

// Ensure the canvas resolution exactly matches the CSS display size
function resizeCaliperCanvas() {
    caliperCanvas.width = caliperCanvas.clientWidth;
    caliperCanvas.height = caliperCanvas.clientHeight;
}
window.addEventListener('resize', resizeCaliperCanvas);
setTimeout(resizeCaliperCanvas, 100);

// Track the mouse while hovering over the ultrasound monitor
caliperCanvas.addEventListener('mousemove', (e) => {
    if (!window.isUSFrozen) return; // Only allow tracking when image is frozen
    
    const rect = caliperCanvas.getBoundingClientRect();
    mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
});

// Drop markers on click
caliperCanvas.addEventListener('mousedown', (e) => {
    if (!window.isUSFrozen) {
        console.log("Image must be frozen to use calipers.");
        return; 
    }
    
    // If we already have 2 points, clear them to start a new measurement
    if (points.length >= 2) {
        points = []; 
    }
    
    const rect = caliperCanvas.getBoundingClientRect();
    points.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    });
});

// ==========================================
// RENDER LOOP & MATH
// ==========================================
function drawCalipers() {
    requestAnimationFrame(drawCalipers);
    ctx.clearRect(0, 0, caliperCanvas.width, caliperCanvas.height);
    
    // Auto-clear measurements if the user unfreezes the screen
    if (!window.isUSFrozen) {
        points = [];
        return; 
    }

// Styling to look like a real machine overlay
    ctx.strokeStyle = '#58a6ff'; // Changed to modern blue
    ctx.fillStyle = '#58a6ff';   // Changed to modern blue
    ctx.lineWidth = 1.5;
    
    // Change to a standard sans-serif font
    ctx.font = 'bold 16px -apple-system, sans-serif';

    // Draw the green 'X' markers
    points.forEach(p => drawMarker(p.x, p.y));

    // Draw lines and calculate distance
    if (points.length === 1 && mousePos) {
        // Tracing: Drawing line to the live mouse position
        drawDottedLine(points[0], mousePos);
        drawDistanceText(points[0], mousePos);
    } else if (points.length === 2) {
        // Locked: Drawing line between the two clicked points
        drawDottedLine(points[0], points[1]);
        drawDistanceText(points[0], points[1]);
    }
}

// Draw a clinical + or X marker
function drawMarker(x, y) {
    const size = 6;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
}

// Draw a dashed connecting line
function drawDottedLine(p1, p2) {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
}

// The Pixel-to-Centimeter Math Engine
function drawDistanceText(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const pixelDist = Math.sqrt(dx*dx + dy*dy); // Pythagorean theorem
    
    // Canvas height perfectly represents the current Depth Slider value in cm.
    // If Canvas = 800px, and Depth = 10cm... 1cm = 80px.
    const pxPerCm = caliperCanvas.height / window.currentUSDepth;
    const cmDist = pixelDist / pxPerCm;

    const text = cmDist.toFixed(2) + ' cm';
    
    // Draw the text slightly offset from the second point
    ctx.fillText(text, p2.x + 15, p2.y + 15);
}

// Start the loop
drawCalipers();