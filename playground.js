// ==========================================
// PLAYGROUND: LASER TRACING GAME
// ==========================================

let pgProbe, pgLaser, pgDot, pgCheckpoints = [], pgTrail = [];
let pgLevel = 1;

window.loadPlayground = function() {
    console.log("Loading Playground Mode...");

    // 1. Clear Scenes
    while(scene3D.children.length > 0) scene3D.remove(scene3D.children[0]);
    while(sceneUS.children.length > 0) sceneUS.remove(sceneUS.children[0]);

    // 2. NEW CAMERA ANGLE: Angled Isometric View
    // This allows you to see the depth between the hovering probe and the table!
    camera3D.position.set(0, 5, 4); 
    camera3D.lookAt(0, 0, 0);

    // 3. Build the Tracing Table
    const table = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 6),
        new THREE.MeshBasicMaterial({ color: 0x161b22, side: THREE.DoubleSide })
    );
    table.rotation.x = -Math.PI / 2;
    scene3D.add(table);

    const gridHelper = new THREE.GridHelper(6, 12, 0x30363d, 0x30363d);
    scene3D.add(gridHelper);

    // 4. NEW PROBE DESIGN: Sleek, Translucent Emitter
    pgProbe = new THREE.Group();
    
    // Wireframe body so it doesn't block the view
    const handleGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.6, 16); 
    const probeMesh = new THREE.Mesh(handleGeo, new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0.3, wireframe: true }));
    pgProbe.add(probeMesh);
    
    // Solid blue cap at the bottom
    const capGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);
    const capMesh = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ color: 0x58a6ff }));
    capMesh.position.y = -0.3;
    pgProbe.add(capMesh);

    // Orientation Marker
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    marker.position.set(-0.15, 0, 0);
    pgProbe.add(marker);
    
    pgProbe.position.set(0, 2.5, 0); // Float it high above the table
    scene3D.add(pgProbe);

    // 5. Build the Laser Beam & Reticle
    pgLaser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1), 
        new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6 })
    );
    scene3D.add(pgLaser);

    pgDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16), 
        new THREE.MeshBasicMaterial({ color: 0xff4444 })
    );
    scene3D.add(pgDot);

    // 6. Start the Game!
    buildLevel(1);
};

function buildLevel(level) {
    pgLevel = level;
    
    // Clean up previous level
    pgCheckpoints.forEach(c => scene3D.remove(c));
    pgTrail.forEach(t => scene3D.remove(t));
    pgCheckpoints = [];
    pgTrail = [];

    let points = [];
    
    if (level === 1) {
        document.getElementById('hud-instructions').innerText = "Level 1: The Circle";
        for(let i=0; i<8; i++) {
            let angle = (i/8) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle)*1.2, 0, Math.sin(angle)*1.2));
        }
    } else if (level === 2) {
        document.getElementById('hud-instructions').innerText = "Level 2: The Square";
        points = [
            new THREE.Vector3(1.2, 0, 1.2), new THREE.Vector3(0, 0, 1.2), new THREE.Vector3(-1.2, 0, 1.2),
            new THREE.Vector3(-1.2, 0, 0), new THREE.Vector3(-1.2, 0, -1.2), new THREE.Vector3(0, 0, -1.2),
            new THREE.Vector3(1.2, 0, -1.2), new THREE.Vector3(1.2, 0, 0)
        ];
    } else {
        document.getElementById('hud-instructions').innerText = "Playground Complete!";
        document.getElementById('edu-details').innerHTML = "You have mastered fine motor transducer control.<br><br>Refresh the page to return to the Main Menu.";
        pgDot.visible = false;
        pgLaser.visible = false;
        return;
    }

    // Spawn Checkpoint Rings
    points.forEach(p => {
        const cp = new THREE.Mesh(
            new THREE.RingGeometry(0.12, 0.18, 16), 
            new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide })
        );
        cp.rotation.x = -Math.PI / 2;
        cp.position.copy(p);
        cp.position.y = 0.01; 
        cp.userData = { hit: false };
        
        scene3D.add(cp);
        pgCheckpoints.push(cp);
    });
}

// 7. THE GAME PHYSICS ENGINE
window.animatePlayground = function() {
    if (Tutorial.currentModule !== 'playground' || !pgProbe) return;

    // Apply hardware rotation to the suspended probe
    pgProbe.quaternion.copy(window.probeState.currentQuat);

    // Raycast: Find where the bottom of the probe is pointing
    let dir = new THREE.Vector3(0, -1, 0).applyQuaternion(pgProbe.quaternion);
    
    // Only shoot laser if the probe is pointing downwards towards the table
    if (dir.y < -0.1) {
        // Calculate intersection with the table (y = 0)
        let t = -pgProbe.position.y / dir.y;
        let intersect = new THREE.Vector3(pgProbe.position.x, pgProbe.position.y, pgProbe.position.z).add(dir.clone().multiplyScalar(t));
        
        pgDot.position.copy(intersect);
        pgDot.visible = true;

        // Stretch and angle the laser line perfectly
        let dist = pgProbe.position.distanceTo(intersect);
        pgLaser.scale.set(1, dist, 1);
        pgLaser.position.copy(pgProbe.position).add(intersect).multiplyScalar(0.5);
        pgLaser.quaternion.copy(pgProbe.quaternion); // Locks the laser perfectly to the probe's angle
        pgLaser.visible = true;

        // Draw the Tracing Trail
        if (pgTrail.length === 0 || pgTrail[pgTrail.length-1].position.distanceTo(intersect) > 0.05) {
            let dot = new THREE.Mesh(
                new THREE.PlaneGeometry(0.04, 0.04), 
                new THREE.MeshBasicMaterial({ color: 0x58a6ff, side: THREE.DoubleSide })
            );
            dot.rotation.x = -Math.PI / 2;
            dot.position.copy(intersect);
            dot.position.y = 0.02; 
            scene3D.add(dot);
            pgTrail.push(dot);
            
            if(pgTrail.length > 150) {
                let old = pgTrail.shift();
                scene3D.remove(old);
            }
        }

        // Collision Detection
        let allHit = true;
        pgCheckpoints.forEach(cp => {
            if (!cp.userData.hit) {
                if (cp.position.distanceTo(intersect) < 0.2) {
                    cp.userData.hit = true;
                    cp.material.color.setHex(0x44ff44); // Turn it Green!
                } else {
                    allHit = false; 
                }
            }
        });

        if (allHit && pgCheckpoints.length > 0) {
            pgCheckpoints = []; 
            setTimeout(() => buildLevel(pgLevel + 1), 1000); 
        }

    } else {
        pgDot.visible = false;
        pgLaser.visible = false;
    }
};