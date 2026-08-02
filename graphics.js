// The Graphics Engine: Handles all Three.js scenes and shaders
const viewportWidth = window.innerWidth / 2;
const viewportHeight = window.innerHeight * 0.85;

// --- Left Viewport (3D) ---
const scene3D = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(50, viewportWidth / viewportHeight, 0.1, 100);
camera3D.position.set(0, 1.5, 4.5); 
camera3D.lookAt(0, 0, 0);

const renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer3D.setSize(viewportWidth, viewportHeight);
document.getElementById('canvas-container-3d').appendChild(renderer3D.domElement);

const phantomBox = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    // Softer wireframe box
    new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true }) 
);
scene3D.add(phantomBox);

const probePlane = new THREE.Group();
const planeGeo = new THREE.PlaneGeometry(2, 2);
planeGeo.translate(0, -1, 0); 
probePlane.add(new THREE.Mesh(planeGeo, 
    // Soft medical blue plane instead of Matrix Green
    new THREE.MeshBasicMaterial({ color: 0x2196f3, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
));

const handleGeo = new THREE.BoxGeometry(0.8, 1.5, 0.2); 
handleGeo.translate(0, 0.75, 0);
probePlane.add(new THREE.Mesh(handleGeo, new THREE.MeshBasicMaterial({ color: 0x888888 })));

// Blue marker dot instead of neon yellow
const marker3D = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0x58a6ff }));
marker3D.position.set(-0.45, 0.1, 0); 
probePlane.add(marker3D);

probePlane.position.set(0, 1.2, 0); 
scene3D.add(probePlane);

// --- Right Viewport (2D Ultrasound) ---
const sceneUS = new THREE.Scene();
const cameraUS = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
cameraUS.position.z = 1;

const rendererUS = new THREE.WebGLRenderer({ antialias: true });
rendererUS.setSize(viewportWidth, viewportHeight);
document.getElementById('canvas-container-us').appendChild(rendererUS.domElement);

const usMaterial = new THREE.ShaderMaterial({
    uniforms: {
        u_volume: { value: texture3D }, 
        u_matrix: { value: new THREE.Matrix4() }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
        precision highp float;
        precision highp sampler3D;
        uniform sampler3D u_volume;
        uniform mat4 u_matrix;
        varying vec2 vUv;

        // High-frequency noise generator for Ultrasound Speckle
        float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

        void main() {
            vec2 center = vec2(0.5, 1.0); // The probe head (top center)
            float dist = distance(vUv, center);
            
            // Mask out the UI to create the fan shape
            if (dist > 0.9 || dist < 0.1 || vUv.y > 0.9) { 
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 
                return; 
            }

            // Map 2D screen coordinate to 3D plane in the patient
            float localX = (vUv.x * 2.0) - 1.0;
            float localY = (vUv.y * 2.0) - 2.0; 
            vec4 localPos = vec4(localX, localY, 0.0, 1.0);
            vec4 worldPos = u_matrix * localPos;
            vec3 texCoord = worldPos.xyz * 0.5 + 0.5;

            // Bounds check
            if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0 || texCoord.z < 0.0 || texCoord.z > 1.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 
                return;
            }

            // 1. READ CT DENSITY
            float density = texture(u_volume, texCoord).r;
            
            // 2. ECHOGENICITY (Tissue Boundaries)
            vec3 stepUp = texCoord + vec3(0.0, 0.01, 0.0);
            float densityAbove = texture(u_volume, stepUp).r;
            // Slightly soften the reflection so it doesn't overpower the tissue
            float reflection = abs(density - densityAbove) * 1.5; 
            
            // Boost the base density multiplier from 0.4 to 0.8 so tissue stays gray!
            float baseUS = (density * 0.8) + reflection;

            // 3. ACOUSTIC SHADOWING
            float shadow = 1.0;
            vec2 rayDir = center - vUv; 
            vec2 stepSize = rayDir / 25.0; 
            vec2 checkUv = vUv;
            
            for(int i = 1; i <= 25; i++) {
                checkUv += stepSize;
                float sX = (checkUv.x * 2.0) - 1.0;
                float sY = (checkUv.y * 2.0) - 2.0;
                vec4 sLocal = vec4(sX, sY, 0.0, 1.0);
                vec4 sWorld = u_matrix * sLocal;
                vec3 sTexCoord = sWorld.xyz * 0.5 + 0.5;
                
                if (sTexCoord.x >= 0.0 && sTexCoord.x <= 1.0 && sTexCoord.y >= 0.0 && sTexCoord.y <= 1.0 && sTexCoord.z >= 0.0 && sTexCoord.z <= 1.0) {
                    float shadowDensity = texture(u_volume, sTexCoord).r;
                    if (shadowDensity > 0.6) { 
                        shadow -= 0.25; 
                    }
                }
            }
            shadow = clamp(shadow, 0.0, 1.0);

            // 4. DEPTH ATTENUATION 
            // Decrease the fade-out speed so the bottom of the screen isn't completely black
            float attenuation = 1.0 - ((dist - 0.1) / 1.5); 
            
            // 5. SPECKLE NOISE
            float speckle = 0.6 + (0.4 * random(vUv * 100.0)); 
            
            // Combine all physics
            float finalOutput = baseUS * shadow * attenuation * speckle;
            
            // THE FIX: Instead of crushing the blacks with smoothstep, we just apply a 1.8x Gain (Brightness) boost!
            finalOutput = clamp(finalOutput * 1.8, 0.0, 1.0);

            gl_FragColor = vec4(finalOutput, finalOutput, finalOutput, 1.0);
        }
    `
});
sceneUS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), usMaterial));

// Utility function for app.js to use
function setProbeRotation(quaternion) {
    probePlane.setRotationFromQuaternion(quaternion);
    probePlane.updateMatrixWorld();
    usMaterial.uniforms.u_matrix.value.copy(probePlane.matrixWorld);
}

// Function to handle the Zoom/Depth slider
function setDepth(cm) {
    // Standard depth is 10cm (zoom = 1). If they slider down to 5cm, zoom = 2.
    cameraUS.zoom = 10 / cm; 
    cameraUS.updateProjectionMatrix();
}

// Window resizing & Animation Loop
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth / 2;
    const newHeight = window.innerHeight * 0.85;
    renderer3D.setSize(newWidth, newHeight);
    camera3D.aspect = newWidth / newHeight;
    camera3D.updateProjectionMatrix();
    rendererUS.setSize(newWidth, newHeight);
});

function animate() {
    requestAnimationFrame(animate);
    renderer3D.render(scene3D, camera3D);
    rendererUS.render(sceneUS, cameraUS);
}
animate();