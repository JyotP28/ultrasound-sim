// ==========================================
// THE PATIENT ENGINE (Auto-Leveling Human Data)
// ==========================================

const dummyData = new Uint8Array([0]);
let texture3D = new THREE.DataTexture3D(dummyData, 1, 1, 1);
texture3D.format = THREE.RedFormat;
texture3D.type = THREE.UnsignedByteType;
texture3D.needsUpdate = true;

// You can use 'stent.nrrd' here if you are on Live Server, or the CDN link!
const patientDataFile = 'stent.nrrd';

const loader = new THREE.NRRDLoader();

loader.load(
    patientDataFile, 
    
    function (volume) {
        document.getElementById('loading-overlay').style.display = 'none';
        
        if (typeof phantomBox !== 'undefined') {
            phantomBox.visible = false;
        }
        
        const rawData = volume.data;
        const normalizedData = new Uint8Array(rawData.length);
        
        // 1. AUTO-DETECT THE TRUE DENSITY RANGE
        let minCT = Infinity;
        let maxCT = -Infinity;
        for(let i = 0; i < rawData.length; i++) {
            if(rawData[i] < minCT) minCT = rawData[i];
            if(rawData[i] > maxCT) maxCT = rawData[i];
        }

        console.log(`Dataset Loaded. Min Density: ${minCT}, Max Density: ${maxCT}`);

        // 2. PERFECTLY SCALE TO 0-255 FOR ULTRASOUND
        for(let i = 0; i < rawData.length; i++) {
            // Find exactly where this voxel sits between the min and max
            let norm = (rawData[i] - minCT) / (maxCT - minCT);
            
            // 3. CONTRAST BOOST (Gamma Correction)
            // This pulls the darks down and pushes the brights up so it looks like an ultrasound!
            norm = Math.pow(norm, 0.6); 
            
            normalizedData[i] = norm * 255;
        }

        texture3D = new THREE.DataTexture3D(normalizedData, volume.xLength, volume.yLength, volume.zLength);
        texture3D.type = THREE.UnsignedByteType; 
        texture3D.format = THREE.RedFormat;
        texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
        texture3D.unpackAlignment = 1;
        texture3D.needsUpdate = true;

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
        document.getElementById('loading-overlay').innerText = "Error loading data.";
        document.getElementById('loading-overlay').style.color = "#ff4444";
        console.error(error);
    }
);