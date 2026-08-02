// ==========================================
// THE PATIENT ENGINE (Loading Real Medical Data)
// ==========================================

let texture3D = null;

// Point this to the file you just downloaded!
const patientDataFile = 'stent.nrrd'; 

const loader = new THREE.NRRDLoader();

loader.load(
    patientDataFile, 
    
    function (volume) {
        document.getElementById('loading-overlay').style.display = 'none';
        
        // 1. EXTRACT THE RAW CT DATA
        const rawData = volume.data;
        const normalizedData = new Uint8Array(rawData.length);
        
        // 2. THE CT NORMALIZER (Windowing)
        // We set a clinical "Window" to focus on tissue and bone.
        // Anything below -200 (air/fat) becomes pitch black (0).
        // Anything above 800 (bone/metal) becomes bright white (255).
        const minCT = -200; 
        const maxCT = 800;  

        for(let i = 0; i < rawData.length; i++) {
            let val = rawData[i];
            let norm = (val - minCT) / (maxCT - minCT);
            
            if(norm < 0) norm = 0;
            if(norm > 1) norm = 1;
            
            normalizedData[i] = norm * 255;
        }

        // 3. CREATE THE 3D TEXTURE
        texture3D = new THREE.DataTexture3D(normalizedData, volume.xLength, volume.yLength, volume.zLength);
        
        // Because we normalized it to 0-255, we can use UnsignedByteType!
        // This means it will work perfectly with our existing ultrasound shader.
        texture3D.type = THREE.UnsignedByteType; 
        texture3D.format = THREE.RedFormat;
        texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
        texture3D.unpackAlignment = 1;
        texture3D.needsUpdate = true;

        // 4. INJECT INTO GRAPHICS ENGINE
        if (typeof usMaterial !== 'undefined') {
            usMaterial.uniforms.u_volume.value = texture3D;
        }
    },
    
    function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading-progress').innerText = percentComplete + '%';
        }
    },
    
    function (error) {
        document.getElementById('loading-overlay').innerText = "Error: Could not locate " + patientDataFile;
        document.getElementById('loading-overlay').style.color = "#ff4444";
        console.error("Error loading patient data:", error);
    }
);