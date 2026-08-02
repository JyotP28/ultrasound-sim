// ==========================================
// MODULE 2: AMPLITUDE & ECHOGENICITY
// ==========================================

window.loadModule2 = function() {
    console.log("Loading Module 2...");

    // 1. CLEAR MODULE 1 OUT OF THE ENGINE
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);
    
    // 2. SETUP THE 3D SPATIAL WORLD
    // Add the boundary box
    const phantomBox = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true }) 
    );
    scene3D.add(phantomBox);

    // Create the blue probe plane
    const probePlane = new THREE.Group();
    const planeGeo = new THREE.PlaneGeometry(2, 2);
    planeGeo.translate(0, -1, 0); 
    probePlane.add(new THREE.Mesh(
        planeGeo, 
        new THREE.MeshBasicMaterial({ color: 0x2196f3, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
    ));
    
    // Add the grey handle to the top of the probe
    const handleGeo = new THREE.BoxGeometry(0.8, 1.5, 0.2); 
    handleGeo.translate(0, 0.75, 0);
    probePlane.add(new THREE.Mesh(
        handleGeo, 
        new THREE.MeshBasicMaterial({ color: 0x888888 })
    ));
    
    probePlane.position.set(0, 1.2, 0); 
    scene3D.add(probePlane);

    // 3. GENERATE PROCEDURAL TISSUE (Cyst & Bone)
    const size = 64; 
    const volumeData = new Uint8Array(size * size * size);
    
    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (z * size * size) + (y * size) + x;
                
                // Normalize coordinates from -1 to 1
                const nx = (x / size) * 2 - 1;
                const ny = (y / size) * 2 - 1;
                const nz = (z / size) * 2 - 1;
                
                let density = 100; // Grey background tissue (Hypoechoic)
                
                // Fluid Cyst (Anechoic / Black) on the left
                if (Math.sqrt(Math.pow(nx + 0.4, 2) + Math.pow(ny + 0.2, 2) + Math.pow(nz, 2)) < 0.25) {
                    density = 0; 
                }
                
                // Bone (Hyperechoic / White) on the right
                if (Math.sqrt(Math.pow(nx - 0.4, 2) + Math.pow(ny + 0.2, 2) + Math.pow(nz, 2)) < 0.25) {
                    density = 255; 
                }
                
                volumeData[index] = density;
            }
        }
    }

    const texture3D = new THREE.DataTexture3D(volumeData, size, size, size);
    texture3D.format = THREE.RedFormat;
    texture3D.type = THREE.UnsignedByteType;
    texture3D.minFilter = texture3D.magFilter = THREE.LinearFilter;
    texture3D.unpackAlignment = 1;
    texture3D.needsUpdate = true;

    // 4. THE ULTRASOUND SHADER (Basic mapping for Level 2)
    const usMaterial = new THREE.ShaderMaterial({
        uniforms: { 
            u_volume: { value: texture3D }, 
            u_matrix: { value: new THREE.Matrix4() } 
        },
        vertexShader: `
            varying vec2 vUv; 
            void main() { 
                vUv = uv; 
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
            }
        `,
        fragmentShader: `
            precision highp float; 
            precision highp sampler3D;
            
            uniform sampler3D u_volume; 
            uniform mat4 u_matrix; 
            varying vec2 vUv;
            
            void main() {
                vec2 center = vec2(0.5, 1.0); 
                float dist = distance(vUv, center);
                
                // Fan shape mask
                if (dist > 0.9 || dist < 0.1 || vUv.y > 0.9) { 
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 
                    return; 
                }
                
                // Map 2D UI coordinates to 3D world space
                vec4 worldPos = u_matrix * vec4((vUv.x * 2.0) - 1.0, (vUv.y * 2.0) - 2.0, 0.0, 1.0);
                vec3 texCoord = worldPos.xyz * 0.5 + 0.5;
                
                // Bounds check
                if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0 || texCoord.z < 0.0 || texCoord.z > 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 
                    return;
                }
                
                float density = texture(u_volume, texCoord).r;
                
                // Add simple high-frequency grain to mimic ultrasound speckle
                float grain = fract(sin(dot(vUv.xy, vec2(12.9898,78.233))) * 43758.5453123) * 0.2;
                float finalColor = density + grain;
                
                gl_FragColor = vec4(finalColor, finalColor, finalColor, 1.0);
            }
        `
    });
    sceneUS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), usMaterial));

    // 5. ATTACH TO GLOBAL ENGINE SO PHONE CAN SLIDE PROBE
    window.updateMod2Probe = function(slideAmount) {
        // Map slider (0 to 100) to probe X position (-0.8 to 0.8)
        let newX = ((slideAmount / 100) * 1.6) - 0.8;
        
        probePlane.position.x = newX;
        probePlane.updateMatrixWorld();
        
        // Feed the new position to the shader
        usMaterial.uniforms.u_matrix.value.copy(probePlane.matrixWorld);

        // Tell State Machine if they found the targets!
        if (newX < -0.3) Tutorial.evaluateAction('find_fluid');
        if (newX > 0.3) Tutorial.evaluateAction('find_bone');
    };
    
    // Initial update to center the probe on load
    window.updateMod2Probe(50);
};