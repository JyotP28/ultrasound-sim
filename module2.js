// ==========================================
// MODULE 2: AMPLITUDE & ECHOGENICITY
// ==========================================
let mod2ProbePlane, mod2UsMaterial;

window.loadModule2 = function() {
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);
    
    const phantomBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true }));
    scene3D.add(phantomBox);

    mod2ProbePlane = new THREE.Group();
    const planeGeo = new THREE.PlaneGeometry(2, 2);
    planeGeo.translate(0, -1, 0); 
    mod2ProbePlane.add(new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: 0x2196f3, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })));
    
    const handleGeo = new THREE.BoxGeometry(0.8, 1.5, 0.2); 
    handleGeo.translate(0, 0.75, 0);
    mod2ProbePlane.add(new THREE.Mesh(handleGeo, new THREE.MeshBasicMaterial({ color: 0x888888 })));

    const markerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0x58a6ff }));
    markerMesh.position.set(-0.4, 0.75, 0.15); 
    mod2ProbePlane.add(markerMesh);
    
    mod2ProbePlane.position.set(0, 1.0, 0); 
    scene3D.add(mod2ProbePlane);

    const size = 64; 
    const volumeData = new Uint8Array(size * size * size);
    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (z * size * size) + (y * size) + x;
                const nx = (x / size) * 2 - 1;
                const ny = (y / size) * 2 - 1;
                const nz = (z / size) * 2 - 1;
                let density = 100; 
                if (Math.sqrt(Math.pow(nx + 0.4, 2) + Math.pow(ny + 0.2, 2) + Math.pow(nz, 2)) < 0.25) density = 0; 
                if (Math.sqrt(Math.pow(nx - 0.4, 2) + Math.pow(ny + 0.2, 2) + Math.pow(nz, 2)) < 0.25) density = 255; 
                volumeData[index] = density;
            }
        }
    }

    const texture3D = new THREE.DataTexture3D(volumeData, size, size, size);
    texture3D.format = THREE.RedFormat;
    texture3D.type = THREE.UnsignedByteType;
    texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
    texture3D.needsUpdate = true;

    mod2UsMaterial = new THREE.ShaderMaterial({
        uniforms: { u_volume: { value: texture3D }, u_matrix: { value: new THREE.Matrix4() } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            precision highp float; precision highp sampler3D;
            uniform sampler3D u_volume; uniform mat4 u_matrix; varying vec2 vUv;
            void main() {
                vec2 center = vec2(0.5, 1.0); float dist = distance(vUv, center); vec2 dir = vUv - center; float angle = atan(dir.x, -dir.y);
                if (abs(angle) > 0.5 || dist > 0.9 || dist < 0.05) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
                vec4 worldPos = u_matrix * vec4((vUv.x * 2.0) - 1.0, (vUv.y * 2.0) - 2.0, 0.0, 1.0);
                vec3 texCoord = worldPos.xyz * 0.5 + 0.5;
                if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0 || texCoord.z < 0.0 || texCoord.z > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
                float density = texture(u_volume, texCoord).r;
                float grain = fract(sin(dot(vUv.xy, vec2(12.9898,78.233))) * 43758.5453123) * 0.2;
                float finalColor = density + grain;
                gl_FragColor = vec4(finalColor, finalColor, finalColor, 1.0);
            }
        `
    });
    sceneUS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mod2UsMaterial));
};

// Render Loop Hook for Module 2
window.animateMod2 = function() {
    if (Tutorial.currentModule === 2 && mod2ProbePlane) {
        // Apply Both Sliding (X) and Fanning (Rot Z) from the Global Engine!
        mod2ProbePlane.position.x = window.probeState.sweepX;
        mod2ProbePlane.rotation.z = window.probeState.fanAngle;
        mod2ProbePlane.updateMatrixWorld();
        mod2UsMaterial.uniforms.u_matrix.value.copy(mod2ProbePlane.matrixWorld);

        // Tell LMS if targets found
        if (window.probeState.sweepX < -0.3 || window.probeState.fanAngle < -0.2) Tutorial.evaluateAction('find_fluid');
        if (window.probeState.sweepX > 0.3 || window.probeState.fanAngle > 0.2) Tutorial.evaluateAction('find_bone');
    }
};