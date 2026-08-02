// ==========================================
// MODULE 4: PROBE MANIPULATION (Angles & 3D Anatomy)
// ==========================================

let mod4ProbePlane, mod4UsMaterial;

window.loadModule4 = function() {
    console.log("Loading Module 4 (3D Anatomy Engine)...");

    // 1. SAFELY CLEAR PREVIOUS MODULE
    while(scene3D.children.length > 0) { scene3D.remove(scene3D.children[0]); }
    while(sceneUS.children.length > 0) { sceneUS.remove(sceneUS.children[0]); }
    
    const phantomBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true }));
    scene3D.add(phantomBox);

    // 2. 3D PHYSICAL ANATOMY
    // Dark red cylinder lying flat to represent the blood vessel
    const vessel3D = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 2, 32),
        new THREE.MeshBasicMaterial({ color: 0xaa0000, transparent: true, opacity: 0.3 }) 
    );
    vessel3D.rotation.x = Math.PI / 2; 
    vessel3D.position.set(-0.3, -0.3, 0); 
    scene3D.add(vessel3D);

    // Bright white sphere hidden inside the vessel for the clot
    const clot3D = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    clot3D.position.set(-0.3, -0.3, 0.5); 
    scene3D.add(clot3D);

    // 3. CURVILINEAR PROBE ASSEMBLY
    mod4ProbePlane = new THREE.Group();
    
    // Using RingGeometry to create a perfect cone-slice that matches the UI monitor
    const planeGeo = new THREE.RingGeometry(0.1, 2, 32, 1, -Math.PI/2 - 0.5, 1.0);
    mod4ProbePlane.add(new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: 0x2196f3, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })));
    
    const handleGeo = new THREE.BoxGeometry(0.8, 1.5, 0.2); 
    handleGeo.translate(0, 0.75, 0);
    mod4ProbePlane.add(new THREE.Mesh(handleGeo, new THREE.MeshBasicMaterial({ color: 0x888888 })));

    const markerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0x58a6ff }));
    markerMesh.position.set(-0.4, 0.75, 0.15); 
    mod4ProbePlane.add(markerMesh);
    
    mod4ProbePlane.position.set(0, 1.0, 0); 
    scene3D.add(mod4ProbePlane);

    // 4. PROCEDURAL SHADER GENERATION
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
                if (Math.pow(nx + 0.3, 2) + Math.pow(ny + 0.3, 2) < 0.05) {
                    density = 0; // Black fluid (Blood)
                    if (Math.pow(nx + 0.3, 2) + Math.pow(ny + 0.3, 2) + Math.pow(nz - 0.5, 2) < 0.004) {
                        density = 255; // Bright White Clot
                    }
                }
                volumeData[index] = density;
            }
        }
    }

    const texture3D = new THREE.DataTexture3D(volumeData, size, size, size);
    texture3D.format = THREE.RedFormat;
    texture3D.type = THREE.UnsignedByteType;
    texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
    texture3D.needsUpdate = true;

    mod4UsMaterial = new THREE.ShaderMaterial({
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
    sceneUS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mod4UsMaterial));
};

// 5. THE EVALUATION LOOP
window.animateMod4 = function() {
    if (Tutorial.currentModule === 4 && mod4ProbePlane) {
        mod4ProbePlane.position.set(0, 1.0, 0);
        mod4ProbePlane.quaternion.copy(window.probeState.currentQuat);
        mod4ProbePlane.updateMatrixWorld();
        mod4UsMaterial.uniforms.u_matrix.value.copy(mod4ProbePlane.matrixWorld);

        const euler = new THREE.Euler().setFromQuaternion(mod4ProbePlane.quaternion, 'YXZ');
        
        if (Tutorial.currentStep === 1 && Math.abs(euler.z) > 0.15) {
            Tutorial.evaluateAction('rock_center');
        }
        if (Tutorial.currentStep === 2 && Math.abs(euler.y) > 1.0) {
            Tutorial.evaluateAction('rotate_long');
        }
        if (Tutorial.currentStep === 3 && Math.abs(euler.y) > 1.0 && euler.x > 0.15) {
            Tutorial.evaluateAction('fan_clot');
        }
    }
};