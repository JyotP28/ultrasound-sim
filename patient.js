// ==========================================
// THE PATIENT ENGINE (Loading Real Medical Data)
// ==========================================

// We MUST initialize a blank 1x1x1 texture. 
// If we set this to null, the graphics engine will crash before the file finishes downloading!
const dummyData = new Uint8Array([0]);
let texture3D = new THREE.DataTexture3D(dummyData, 1, 1, 1);
texture3D.format = THREE.RedFormat;
texture3D.type = THREE.UnsignedByteType;
texture3D.needsUpdate = true;

// Point to the frozen r128 tag on GitHub (NOT master!)
const patientDataFile = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/nrrd/stent.nrrd';

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
        const minCT = -200; 
        const maxCT = 800;  

        for(let i = 0; i < rawData.length; i++) {
            let val = rawData[i];
            let norm = (val - minCT) / (maxCT - minCT);
            
            if(norm < 0) norm = 0;
            if(norm > 1) norm = 1;
            
            normalizedData[i] = norm * 255;
        }

        // 3. OVERWRITE THE DUMMY TEXTURE WITH REAL MEDICAL DATA
        texture3D = new THREE.DataTexture3D(normalizedData, volume.xLength, volume.yLength, volume.zLength);
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
        document.getElementById('loading-overlay').innerText = "Error: Could not load data. Check console.";
        document.getElementById('loading-overlay').style.color = "#ff4444";
        console.error("Error loading patient data:", error);
    }
);