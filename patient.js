// ==========================================
// THE PATIENT ENGINE (Loading Real Medical Data)
// ==========================================

const dummyData = new Uint8Array([0]);
let texture3D = new THREE.DataTexture3D(dummyData, 1, 1, 1);
texture3D.format = THREE.RedFormat;
texture3D.type = THREE.UnsignedByteType;
texture3D.needsUpdate = true;

// 1. This uses jsdelivr CDN to bypass all browser security blocks!
const patientDataFile = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/nrrd/stent.nrrd';

const loader = new THREE.NRRDLoader();

loader.load(
    patientDataFile, 
    
    function (volume) {
        document.getElementById('loading-overlay').style.display = 'none';
        
        // Hide the wireframe box from the Graphics Engine now that we have real data!
        if (typeof phantomBox !== 'undefined') {
            phantomBox.visible = false;
        }
        
        const rawData = volume.data;
        const normalizedData = new Uint8Array(rawData.length);
        
        const minCT = -200; 
        const maxCT = 800;  

        for(let i = 0; i < rawData.length; i++) {
            let val = rawData[i];
            let norm = (val - minCT) / (maxCT - minCT);
            if(norm < 0) norm = 0;
            if(norm > 1) norm = 1;
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
        document.getElementById('loading-overlay').innerText = "Error loading data. See Console.";
        document.getElementById('loading-overlay').style.color = "#ff4444";
        console.error(error);
    }
);