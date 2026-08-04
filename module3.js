// ==========================================
// MODULE 3: FREQUENCY VS PENETRATION
// ==========================================
let mod3ProbePlane, mod3UsMaterial, mod3BluePlane;

window.loadModule3 = function() {
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);
    
    const phantomBox = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true }));
    phantomBox.position.y = -0.5;
    scene3D.add(phantomBox);

    const deepTarget3D = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, wireframe: true })
    );
    deepTarget3D.position.set(0, -1.7, 0); 
    scene3D.add(deepTarget3D);

    mod3ProbePlane = new THREE.Group();
    const planeGeo = new THREE.RingGeometry(0.1, 2, 32, 1, -Math.PI/2 - 0.5, 1.0);
    mod3BluePlane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: 0x2196f3, side: THREE.DoubleSide, transparent: true, opacity: 0.25 }));
    mod3ProbePlane.add(mod3BluePlane);
    
    const handleGeo = new THREE.BoxGeometry(0.8, 1.5, 0.2); 
    handleGeo.translate(0, 0.75, 0);
    mod3ProbePlane.add(new THREE.Mesh(handleGeo, new THREE.MeshBasicMaterial({ color: 0x888888 })));

    const markerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0x58a6ff }));
    markerMesh.position.set(-0.4, 0.75, 0.15); 
    mod3ProbePlane.add(markerMesh);
    
    mod3ProbePlane.position.set(0, 1.0, 0); 
    scene3D.add(mod3ProbePlane);

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
                
                if (Math.sqrt(Math.pow(nx, 2) + Math.pow(ny + 0.8, 2) + Math.pow(nz, 2)) < 0.2) density = 255; 
                volumeData[index] = density;
            }
        }
    }

    const texture3D = new THREE.DataTexture3D(volumeData, size, size, size);
    texture3D.format = THREE.RedFormat;
    texture3D.type = THREE.UnsignedByteType;
    texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
    texture3D.needsUpdate = true;

    mod3UsMaterial = new THREE.ShaderMaterial({
        uniforms: { u_volume: { value: texture3D }, u_matrix: { value: new THREE.Matrix4() }, u_frequency: { value: 12.0 } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            precision highp float; precision highp sampler3D;
            uniform sampler3D u_volume; uniform mat4 u_matrix; uniform float u_frequency; varying vec2 vUv;
            
            float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

            void main() {
                vec2 center = vec2(0.5, 1.0); float dist = distance(vUv, center); vec2 dir = vUv - center; float angle = atan(dir.x, -dir.y);
                if (abs(angle) > 0.5 || dist > 0.9 || dist < 0.05) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
                
                vec4 worldPos = u_matrix * vec4((vUv.x * 2.0) - 1.0, (vUv.y * 3.0) - 2.5, 0.0, 1.0);
                vec3 texCoord = worldPos.xyz * 0.5 + 0.5;
                if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0 || texCoord.z < 0.0 || texCoord.z > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
                
                float density = texture(u_volume, texCoord).r;
                
                float maxDepth = 1.0 - (u_frequency / 15.0); 
                float attenuation = smoothstep(maxDepth + 0.2, maxDepth - 0.1, dist);
                float blurAmount = (12.0 - u_frequency) * 0.05;
                float speckle = random(vUv * (100.0 - (blurAmount * 500.0))) * 0.3;
                
                float finalColor = (density + speckle) * attenuation;
                gl_FragColor = vec4(finalColor, finalColor, finalColor, 1.0);
            }
        `
    });
    sceneUS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mod3UsMaterial));
};

window.animateMod3 = function() {
    if (window.Tutorial && window.Tutorial.currentModule === 3 && mod3ProbePlane) {
        mod3ProbePlane.position.set(0, 1.0, 0);

        if (window.probeState.currentQuat && window.probeState.currentQuat.isQuaternion) {
            mod3ProbePlane.quaternion.copy(window.probeState.currentQuat);
        }

        mod3ProbePlane.updateMatrixWorld();
        mod3UsMaterial.uniforms.u_matrix.value.copy(mod3ProbePlane.matrixWorld);

        const currentFreq = mod3UsMaterial.uniforms.u_frequency.value;
        const targetScale = 1.5 - ((currentFreq - 3.0) * (1.1 / 9.0)); 
        if (mod3BluePlane) { mod3BluePlane.scale.y = targetScale; }
    }
};

window.updateMod3Freq = function(freq) {
    if (mod3UsMaterial) mod3UsMaterial.uniforms.u_frequency.value = parseFloat(freq);
    const textTarget = document.querySelector('.top-right');
    if (textTarget) textTarget.innerHTML = `Probe: Curvilinear<br>Freq: ${parseFloat(freq).toFixed(1)} MHz`;
};