// GroundPatrol : sentinelle terrestre. Suit des waypoints + cône de vision frontal.
// Apparaît à partir du niveau 3.

export class GroundPatrol {
    constructor(scene, player, detectionEngine, config = {}, onGameOver = null) {
        this.scene           = scene;
        this.player          = player;
        this.detectionEngine = detectionEngine;
        this.onGameOver      = onGameOver;

        this.speed              = config.speed ?? 3.5;
        this.trackingSpeed      = 7.0;
        this.detectionRange     = 12;
        this.detectionHalfAngle = Math.PI / 2.5;

        this.isGameOver = false;
        this.isTracking = false;
        this._empFrozen = false;
        this.fatalTimer = 0;
        this.fatalLimit = 0.6;

        // Position random, loin du spawn joueur
        const startX = (Math.random() - 0.5) * 60;
        const startZ = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 20);
        this._startX = startX;
        this._startZ = startZ;

        this.waypoints     = this._generateWaypoints(startX, startZ);
        this.waypointIndex = 0;
        this.targetPos     = this.waypoints[0].clone();

        this._meshes = [];

        this._buildMeshes();
        this._buildVisionDisc();

        this._observer = this.scene.onBeforeRenderObservable.add(() => this._update());
    }

    _buildMeshes() {
        const sx = this._startX, sz = this._startZ;

        // Box invisible utilisée comme racine de hiérarchie → un seul dispose
        this.rootMesh = BABYLON.MeshBuilder.CreateBox('gp_root', {
            width: 0.8, height: 2.2, depth: 0.5
        }, this.scene);
        this.rootMesh.position.set(sx, 1.1, sz);
        this.rootMesh.isPickable = false;

        const invisMat = new BABYLON.StandardMaterial('gp_rootMat', this.scene);
        invisMat.alpha = 0;
        this.rootMesh.material = invisMat;
        this._meshes.push(this.rootMesh);

        const body = BABYLON.MeshBuilder.CreateBox('gp_body', {
            width: 0.8, height: 1.4, depth: 0.5
        }, this.scene);
        body.parent = this.rootMesh;
        body.position.set(0, -0.1, 0);

        const bodyMat = new BABYLON.StandardMaterial('gp_bodyMat', this.scene);
        bodyMat.diffuseColor  = new BABYLON.Color3(0.15, 0.0, 0.25);
        bodyMat.emissiveColor = new BABYLON.Color3(0.25, 0.0, 0.45);
        bodyMat.specularPower = 64;
        body.material = bodyMat;

        const head = BABYLON.MeshBuilder.CreateBox('gp_head', {
            width: 0.55, height: 0.5, depth: 0.55
        }, this.scene);
        head.parent = this.rootMesh;
        head.position.set(0, 0.75, 0);

        this.eyeMat = new BABYLON.StandardMaterial('gp_eyeMat', this.scene);
        this.eyeMat.emissiveColor   = new BABYLON.Color3(0.7, 0.0, 1.0);
        this.eyeMat.disableLighting = true;
        head.material = this.eyeMat;

        const visor = BABYLON.MeshBuilder.CreateBox('gp_visor', {
            width: 0.42, height: 0.12, depth: 0.08
        }, this.scene);
        visor.parent = this.rootMesh;
        visor.position.set(0, 0.75, 0.295);
        visor.material = this.eyeMat;

        // Chaque jambe a son propre material (sinon crash partagé au dispose)
        const makeLeg = (ox) => {
            const leg = BABYLON.MeshBuilder.CreateBox('gp_leg', {
                width: 0.28, height: 0.7, depth: 0.28
            }, this.scene);
            leg.parent = this.rootMesh;
            leg.position.set(ox, -0.85, 0);

            const legMat = new BABYLON.StandardMaterial('gp_legMat', this.scene);
            legMat.diffuseColor  = new BABYLON.Color3(0.1, 0.0, 0.2);
            legMat.emissiveColor = new BABYLON.Color3(0.12, 0.0, 0.22);
            leg.material = legMat;
        };
        makeLeg(-0.22);
        makeLeg( 0.22);
    }

    _buildVisionDisc() {
        this.visionDisc = BABYLON.MeshBuilder.CreateDisc('gp_vision', {
            radius: this.detectionRange * 0.8,
            tessellation: 20,
        }, this.scene);
        this.visionDisc.rotation.x = Math.PI / 2;
        this.visionDisc.position.y = 0.04;

        this.discMat = new BABYLON.StandardMaterial('gp_discMat', this.scene);
        this.discMat.emissiveColor   = new BABYLON.Color3(0.5, 0.0, 0.8);
        this.discMat.alpha           = 0.10;
        this.discMat.disableLighting = true;
        this.discMat.backFaceCulling = false;
        this.visionDisc.material = this.discMat;
    }

    _generateWaypoints(cx, cz) {
        const count  = 5 + Math.floor(Math.random() * 4);
        const radius = 12 + Math.random() * 18;
        const pts    = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            pts.push(new BABYLON.Vector3(
                Math.max(-44, Math.min(44, cx + Math.cos(angle) * radius)),
                0,
                Math.max(-44, Math.min(44, cz + Math.sin(angle) * radius))
            ));
        }
        return pts;
    }

    _update() {
        if (this.isGameOver || this._empFrozen) return;
        const dt = this.scene.getEngine().getDeltaTime() / 1000;

        this._move(dt);
        this._syncVisionDisc();
        this._checkDetection();
        this._updateColors();
    }

    _move(dt) {
        if (this.isTracking) {
            this.targetPos.set(
                this.player.mesh.position.x,
                0,
                this.player.mesh.position.z
            );
        }

        const dx   = this.targetPos.x - this.rootMesh.position.x;
        const dz   = this.targetPos.z - this.rootMesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.3) {
            const nx    = dx / dist;
            const nz    = dz / dist;
            const speed = this.isTracking ? this.trackingSpeed : this.speed;
            const step  = Math.min(speed * dt, dist);

            this.rootMesh.position.x += nx * step;
            this.rootMesh.position.z += nz * step;

            this.rootMesh.rotation.y = Math.atan2(nx, nz);
        } else if (!this.isTracking) {
            this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
            this.targetPos.copyFrom(this.waypoints[this.waypointIndex]);
        }
    }

    _syncVisionDisc() {
        this.visionDisc.position.x = this.rootMesh.position.x;
        this.visionDisc.position.z = this.rootMesh.position.z;
        this.visionDisc.rotation.y = this.rootMesh.rotation.y - Math.PI / 2;
    }

    _checkDetection() {
        const dx     = this.player.mesh.position.x - this.rootMesh.position.x;
        const dz     = this.player.mesh.position.z - this.rootMesh.position.z;
        const distSq = dx * dx + dz * dz;
        const dist   = Math.sqrt(distSq);

        const s = this.detectionEngine.suspicion;

        // Alerte globale : à 100% de suspicion, toutes les sentinelles passent
        // en chasse peu importe leur orientation ou distance. Sinon on a des
        // ground patrols qui errent au hasard alors que l'alarme est au max.
        if (s >= 100 && !this.isTracking && !this.isGameOver) {
            this.isTracking = true;
            this.fatalTimer = 0;
        }

        if (this.isTracking && !this.isGameOver) {
            if (s < 80) {
                this.isTracking = false;
                this.fatalTimer = 0;
                this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
                this.targetPos.copyFrom(this.waypoints[this.waypointIndex]);
                return;
            }

            if (dist < 1.5) {
                this.fatalTimer += this.scene.getEngine().getDeltaTime() / 1000;
                if (this.fatalTimer > this.fatalLimit) this._triggerGameOver();
            } else {
                this.fatalTimer = 0;
            }
        }
    }

    _updateColors() {
        const s = this.detectionEngine.suspicion;
        let r = 0.7, g = 0.0, b = 1.0;
        if (s > 50) {
            const f = (s - 50) / 50.0;
            r = 0.7 + f * 0.3;
            b = 1.0 - f;
        }
        const c = new BABYLON.Color3(r, g, b);
        this.eyeMat.emissiveColor  = c;
        this.discMat.emissiveColor = new BABYLON.Color3(r * 0.7, 0, b * 0.9);
        this.discMat.alpha         = 0.08 + (s / 100.0) * 0.22;
    }

    _triggerGameOver() {
        this.isGameOver = true;
        this.player.velocity.setAll(0);
        this.player.canMove = false;

        const red = new BABYLON.Color3(1, 0, 0);
        this.eyeMat.emissiveColor  = red;
        this.discMat.emissiveColor = red;
        this.discMat.alpha         = 0.5;

        if (this.onGameOver) this.onGameOver();
    }

    dispose() {
        if (this._observer) {
            this.scene.onBeforeRenderObservable.remove(this._observer);
            this._observer = null;
        }
        if (this.rootMesh && !this.rootMesh.isDisposed()) {
            this.rootMesh.dispose();
            this.rootMesh = null;
        }
        if (this.visionDisc && !this.visionDisc.isDisposed()) {
            this.visionDisc.dispose();
            this.visionDisc = null;
        }
    }
}
