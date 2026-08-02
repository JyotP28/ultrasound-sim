// ==========================================
// THE PATIENT ENGINE (Procedural Canine Anatomy)
// ==========================================

// 1. Immediately hide the loading text and the dummy box
document.getElementById('loading-overlay').style.display = 'none';
if (typeof phantomBox !== 'undefined') {
    phantomBox.visible = false;
}

// 2. Generate a high-resolution 3D block of tissue
const size = 128; 
const volumeData = new Uint8Array(size * size * size);

for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = (z * size * size) + (y * size) + x;
            
            // Normalize 3D coordinates from -1 to 1
            const nx = (x / size) * 2 - 1;
            const ny = (y / size) * 2 - 1;
            const nz = (z / size) * 2 - 1;
            
            // --- ANATOMY GENERATOR ---
            
            // A. Base Tissue: Liver Parenchyma (Mid-grey, slightly speckled)
            let density = 70 + Math.random() * 20;
            
            // B. Gallbladder: Anechoic (Black) fluid with a hyperechoic wall
            const distGB = Math.sqrt(Math.pow(nx - 0.2, 2) + Math.pow(ny + 0.1, 2) + Math.pow(nz, 2));
            if (distGB < 0.3) {
                density = 5; // Internal fluid
                if (distGB > 0.26) density = 180; // Bright wall
            }
            
            // C. Portal Vein: Tube passing through the liver
            const distVein = Math.sqrt(Math.pow(nx + 0.3, 2) + Math.pow(nz - 0.2, 2));
            if (distVein < 0.1) {
                density = 10; // Blood is dark/anechoic
            }
            
            // D. Spine: Bone (Bright white) at the bottom to cast shadows
            const distSpine = Math.sqrt(Math.pow(nx, 2) + Math.pow(ny - 0.7, 2));
            if (distSpine < 0.15) {
                density = 255; 
            }
            
            volumeData[index] = density;
        }
    }
}

// 3. Package the anatomy into a WebGL Texture
const texture3D = new THREE.DataTexture3D(volumeData, size, size, size);
texture3D.format = THREE.RedFormat;
texture3D.type = THREE.UnsignedByteType;
texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
texture3D.unpackAlignment = 1;
texture3D.needsUpdate = true;

// 4. Inject it into the Ultrasound Shader!
if (typeof usMaterial !== 'undefined') {
    usMaterial.uniforms.u_volume.value = texture3D;
}