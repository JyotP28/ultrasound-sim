// ==========================================
// MODULE 3: FREQUENCY VS PENETRATION
// ==========================================

window.loadModule3 = function() {
    console.log("Loading Module 3...");

    // 1. CLEAR PREVIOUS MODULE
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);
    
    // 2. SETUP DEEP TISSUE WORLD
    const phantomBox = new THREE.Mesh(
        new THREE.BoxGeometry(2, 3, 2), // Taller box for deep tissue
        new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true }) 
    );
    phantomBox.position.y = -0.5;
    scene3D.add(phantomBox);

    const probePlane = new THREE.Group();
    probePlane.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.2), new THREE.MeshBasicMaterial({ color: 0x888888 })));
    probePlane.position.set(0, 1.2, 0); 
    scene3D.add(probePlane);

    // 3. GENERATE TISSUE WITH A DEEP HIDDEN TARGET
    const size = 64; 
    const volumeData = new Uint8Array(size * size * size);
    
    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (z * size * size) + (y * size) + x;
                const nx = (x / size) * 2 - 1;
                const ny = (y / size) * 2 - 1;
                const nz = (z / size) * 2 - 1;
                
                let density = 100; // Normal tissue
                
                // Hidden Deep Target (Hyperechoic mass at the very bottom)
                if (Math.sqrt(Math.pow(nx, 2) + Math.pow(ny + 0.8, 2) + Math.pow(nz, 2)) < 0.2) {
                    density = 255; 
                }
                
                volumeData[index] = density;
            }
        }
    }

    const texture3D = new THREE.DataTexture3D(volumeData, size, size, size);
    texture3D.format = THREE.RedFormat;
    texture3D.type = THREE.UnsignedByteType;
    texture3D.needsUpdate = true;

    // 4. THE PHYSICS SHADER (Dynamic Attenuation & Resolution)
    const usMaterial = new THREE.ShaderMaterial({
        uniforms: { 
            u_volume: { value: texture3D }, 
            u_matrix: { value: new THREE.Matrix4() },
            u_frequency: { value: 12.0 } // Starts at 12 MHz (High detail, bad penetration)
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            precision highp float; 
            precision highp sampler3D;
            uniform sampler3D u_volume; 
            uniform mat4 u_matrix; 
            uniform float u_frequency;
            varying vec2 vUv;
            
            float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

            void main() {
                vec2 center = vec2(0.5, 1.0); 
                float dist = distance(vUv, center);
                if (dist > 0.9 || dist < 0.1 || vUv.y > 0.9) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
                
                vec4 worldPos = u_matrix * vec4((vUv.x * 2.0) - 1.0, (vUv.y * 3.0) - 2.5, 0.0, 1.0);
                vec3 texCoord = worldPos.xyz * 0.5 + 0.5;
                
                if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return;
                }
                
                float density = texture(u_volume, texCoord).r;
                
                // PHYSICS: PENETRATION (Attenuation based on frequency)
                // 12 MHz stops at dist 0.4. 3 MHz reaches dist 0.9.
                float maxDepth = 1.0 - (u_frequency / 15.0); 
                float attenuation = smoothstep(maxDepth + 0.2, maxDepth - 0.1, dist);
                
                // PHYSICS: RESOLUTION (Blur/Noise based on frequency)
                // Low frequency = high blur/grain
                float blurAmount = (12.0 - u_frequency) * 0.05;
                float speckle = random(vUv * (100.0 - (blurAmount * 500.0))) * 0.3;
                
                float finalColor = (density + speckle) * attenuation;
                gl_FragColor = vec4(finalColor, finalColor, finalColor, 1.0);
            }
        `
    });
    sceneUS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), usMaterial));

    // Expose control to the phone
    window.updateMod3Freq = function(freq) {
        usMaterial.uniforms.u_frequency.value = parseFloat(freq);
        document.querySelector('.top-right').innerHTML = `Probe: Curvilinear<br>Freq: ${parseFloat(freq).toFixed(1)} MHz`;
    };
};