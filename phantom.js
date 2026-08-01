// The Data Engine: Generates the 3D Volume
const size = 64;
const volumeData = new Uint8Array(size * size * size);
const texture3D = new THREE.DataTexture3D(volumeData, size, size, size);
texture3D.format = THREE.RedFormat;
texture3D.type = THREE.UnsignedByteType;
texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
texture3D.unpackAlignment = 1;

let currentDiagnosis = '';

function generateNewTest() {
    const rx = (Math.random() - 0.5) * 1.2; 
    const ry = (Math.random() - 0.5) * 1.2;
    const rz = (Math.random() - 0.5) * 1.2;

    const pathologies = [
        { name: 'Cyst', density: 5, radius: 0.25 },
        { name: 'Mass', density: 160, radius: 0.3 },
        { name: 'Bone', density: 250, radius: 0.15 }
    ];
    
    const target = pathologies[Math.floor(Math.random() * pathologies.length)];
    currentDiagnosis = target.name;

    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (z * size * size) + (y * size) + x;
                const nx = (x / size) * 2 - 1;
                const ny = (y / size) * 2 - 1;
                const nz = (z / size) * 2 - 1;
                
                let density = 100 + Math.random() * 30; 
                
                if (Math.sqrt(Math.pow(nx-rx, 2) + Math.pow(ny-ry, 2) + Math.pow(nz-rz, 2)) < target.radius) {
                    density = target.density;
                }
                volumeData[index] = density;
            }
        }
    }
    texture3D.needsUpdate = true;
}