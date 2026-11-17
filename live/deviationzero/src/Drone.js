// Drone : sentinelle aérienne. Patrouille à 12u d'altitude avec un spotlight.
// Quand suspicion >= 100, traque le joueur ; touche fatale au bout de fatalLimit s.

export class Drone {
    constructor(scene, player, detectionEngine, config = {}, onGameOver = null) {
        this.scene = scene;
        this.player = player;
        this.detectionEngine = detectionEngine;
        this.onGameOver = onGameOver;

        this.speed = config.speed ?? 3.0;
        this.altitude = 12;
        this.lightRadius = 8;
        this.boundMin = -40;
        this.boundMax = 40;

        this.targetPosition = new BABYLON.Vector3(0, this.altitude, 0);
        this.isGameOver    = false;
        this.isTracking    = false;
        this._empFrozen    = false;
        this.fatalTimer    = 0;
        this.fatalLimit    = 0.5;
        this.trackingSpeed = 8.0;

        this._createMesh();
        this._createSpotLight();
        this._pickNewTarget();

        this._observer = this.scene.onBeforeRenderObservable.add(() => this._update());
    }

    _createMesh() {
        this.mesh = BABYLON.MeshBuilder.CreateCylinder("droneBody", {
            diameter: 2.5,
            height: 1.0,
            tessellation: 16
        }, this.scene);
        this.mesh.position.y = this.altitude;

        const mat = new BABYLON.StandardMaterial("droneMat", this.scene);
        mat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        mat.specularPower = 32;
        this.mesh.material = mat;

        const eye = BABYLON.MeshBuilder.CreateSphere("droneEye", {
            diameter: 1.2,
            segments: 16
        }, this.scene);
        eye.position.y = -0.5;
        eye.parent = this.mesh;

        this.eyeMat = new BABYLON.StandardMaterial("droneEyeMat", this.scene);
        this.eyeMat.emissiveColor = new BABYLON.Color3(0, 1, 1);
        this.eyeMat.disableLighting = true;
        eye.material = this.eyeMat;
    }

    _createSpotLight() {
        const angle = 2 * Math.atan(this.lightRadius / this.altitude);

        this.spotLight = new BABYLON.SpotLight(
            "droneLight",
            this.mesh.position.clone(),
            new BABYLON.Vector3(0, -1, 0),
            angle,
            1,
            this.scene
        );
        this.spotLight.diffuse  = new BABYLON.Color3(0, 1, 1);
        this.spotLight.specular = new BABYLON.Color3(0, 1, 1);
        this.spotLight.intensity = 1.8;

        this.groundDisc = BABYLON.MeshBuilder.CreateDisc("droneDisc", {
            radius: this.lightRadius,
            tessellation: 32
        }, this.scene);
        this.groundDisc.position.y = 0.05;
        this.groundDisc.rotation.x = Math.PI / 2;

        const discMat = new BABYLON.StandardMaterial("droneDiscMat", this.scene);
        discMat.emissiveColor   = new BABYLON.Color3(0, 0.5, 0.5);
        discMat.alpha           = 0.25;
        discMat.disableLighting = true;
        this.groundDisc.material = discMat;
    }

    _pickNewTarget() {
        this.targetPosition.x = this.boundMin + Math.random() * (this.boundMax - this.boundMin);
        this.targetPosition.z = this.boundMin + Math.random() * (this.boundMax - this.boundMin);
    }

    _update() {
        if (this.isGameOver || this._empFrozen) return;

        const dt = this.scene.getEngine().getDeltaTime() / 1000;

        if (this.isTracking) {
            this.targetPosition.copyFrom(this.player.mesh.position);
            this.targetPosition.y = this.altitude;
        }

        const toTarget = this.targetPosition.subtract(this.mesh.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < 1.0 && !this.isTracking) {
            this._pickNewTarget();
        } else {
            toTarget.normalize();
            const speed = this.isTracking ? this.trackingSpeed : this.speed;
            const step  = Math.min(speed * dt, dist);
            this.mesh.position.x += toTarget.x * step;
            this.mesh.position.z += toTarget.z * step;
        }

        // Oscillation verticale légère
        const time = performance.now() * 0.002;
        this.mesh.position.y = this.altitude + Math.sin(time) * 0.5;

        this.spotLight.position.copyFrom(this.mesh.position);
        this.groundDisc.position.x = this.mesh.position.x;
        this.groundDisc.position.z = this.mesh.position.z;

        this._checkPlayer();
    }

    _checkPlayer() {
        const dx = this.player.mesh.position.x - this.mesh.position.x;
        const dz = this.player.mesh.position.z - this.mesh.position.z;
        const distSq = dx * dx + dz * dz;

        const s = this.detectionEngine.suspicion;

        // Lerp cyan → rouge à partir de 50%
        let r = 0, g = 1, b = 1;
        if (s > 50) {
            const factor = (s - 50) / 50.0;
            r = factor;
            g = 1.0 - factor;
            b = 1.0 - factor;
        }

        const color = new BABYLON.Color3(r, g, b);
        this.eyeMat.emissiveColor              = color;
        this.spotLight.diffuse                 = color;
        this.spotLight.specular                = color;
        this.groundDisc.material.emissiveColor = color.scale(0.8);
        this.groundDisc.material.alpha         = 0.2 + (s / 100.0) * 0.3;

        if (s >= 100 && !this.isTracking && !this.isGameOver) {
            this._startTracking();
        }

        if (this.isTracking && !this.isGameOver) {
            if (s < 80) { this._stopTracking(); return; }

            if (Math.sqrt(distSq) < 2.0) {
                if (this.detectionEngine.deltaS > 0 || s >= 100) {
                    this.fatalTimer += this.scene.getEngine().getDeltaTime() / 1000;
                    if (this.fatalTimer > this.fatalLimit) this._triggerGameOver();
                } else {
                    this.fatalTimer = 0;
                }
            } else {
                this.fatalTimer = 0;
            }
        }
    }

    _startTracking() {
        this.isTracking = true;
        this.fatalTimer = 0;
    }

    _stopTracking() {
        this.isTracking = false;
        this.fatalTimer = 0;
        this._pickNewTarget();
    }

    _triggerGameOver() {
        this.isGameOver = true;
        this.player.velocity.setAll(0);
        this.player.canMove = false;
        this.detectionEngine.isGameOver = true;

        const red = new BABYLON.Color3(1, 0, 0);
        this.eyeMat.emissiveColor              = red;
        this.spotLight.diffuse                 = red;
        this.spotLight.specular                = red;
        this.groundDisc.material.emissiveColor = red;
        this.groundDisc.material.alpha         = 0.8;
        this.spotLight.intensity               = 3.0;

        if (this.onGameOver) {
            this.onGameOver();
        } else {
            const el = document.getElementById('game-over');
            if (el) el.classList.add('visible');
        }
    }

    dispose() {
        if (this._observer) {
            this.scene.onBeforeRenderObservable.remove(this._observer);
            this._observer = null;
        }
        if (this.spotLight)  { this.spotLight.dispose();  this.spotLight  = null; }
        if (this.groundDisc) { this.groundDisc.dispose(); this.groundDisc = null; }
        if (this.mesh)       { this.mesh.dispose();       this.mesh       = null; }
    }
}
