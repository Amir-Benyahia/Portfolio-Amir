// Player : cube cyan piloté au clavier (WASD/ZQSD/flèches). Mouvement raide,
// sans inertie pour matcher le rythme cardinal des Mimics.
// Dash (Espace) : impulsion rapide + trail VFX. Cooldown 5s.

export class Player {
    constructor(scene, glowLayer) {
        this.scene     = scene;
        this.glowLayer = glowLayer;

        this.input    = { forward: false, backward: false, left: false, right: false };
        this.speed    = 5;
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.isMoving = false;
        this.canMove  = true;

        this.obstacleManager = null;

        this._speedBoostTimer = 0;

        this.dashCooldown      = 5.0;
        this.dashDistance      = 8.0;
        this.dashDuration      = 0.12;
        this._dashCooldownLeft = 0;
        this._isDashing        = false;
        this._dashElapsed      = 0;
        this._dashDirX         = 0;
        this._dashDirZ         = 0;
        this._lastDirX         = 0;
        this._lastDirZ         = 1;
        this._ghostTrail       = [];
        this._dashFlashTimer   = 0;

        this.onDash = null;

        this.mesh = this._createMesh();
        if (glowLayer) glowLayer.addIncludedOnlyMesh(this.mesh);

        this._registerInputs();
        this.scene.onBeforeRenderObservable.add(() => this._update());
    }

    reset() {
        this.mesh.position.set(0, 0.7, 0);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.rotationQuaternion = null;
        this.mesh.isVisible = true;
        this.velocity.setAll(0);
        this.isMoving          = false;
        this.canMove           = true;
        this._speedBoostTimer  = 0;
        this.obstacleManager   = null;
        this._dashCooldownLeft = 0;
        this._isDashing        = false;
        this._dashElapsed      = 0;
        this._dashFlashTimer   = 0;
        this._lastDirX         = 0;
        this._lastDirZ         = 1;
        this.input = { forward: false, backward: false, left: false, right: false };
        this.mesh.material.emissiveColor = new BABYLON.Color3(0.0, 0.85, 1.0);
        this.mesh.material.diffuseColor  = new BABYLON.Color3(0.0, 0.7,  1.0);

        this._disposeGhosts();
    }

    applySpeedBoost(duration = 4) {
        this._speedBoostTimer = duration;
    }

    getDashCooldownProgress() {
        if (this._dashCooldownLeft <= 0) return 1;
        return 1 - (this._dashCooldownLeft / this.dashCooldown);
    }

    isDashReady() {
        return this._dashCooldownLeft <= 0 && !this._isDashing;
    }

    _createMesh() {
        const box = BABYLON.MeshBuilder.CreateBox('player', { width: 1, height: 1.4, depth: 1 }, this.scene);
        box.position.y = 0.7;

        const mat = new BABYLON.StandardMaterial('playerMat', this.scene);
        mat.diffuseColor  = new BABYLON.Color3(0.0, 0.7, 1.0);
        mat.emissiveColor = new BABYLON.Color3(0.0, 0.85, 1.0);
        mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        mat.alpha = 0.92;
        box.material = mat;
        return box;
    }

    _registerInputs() {
        const handle = (evt, isDown) => {
            switch (evt.code) {
                case 'KeyW': case 'KeyZ': case 'ArrowUp':
                    this.input.forward = isDown; break;
                case 'KeyS': case 'ArrowDown':
                    this.input.backward = isDown; break;
                case 'KeyA': case 'KeyQ': case 'ArrowLeft':
                    this.input.left = isDown; break;
                case 'KeyD': case 'ArrowRight':
                    this.input.right = isDown; break;
            }
        };
        window.addEventListener('keydown', e => handle(e, true));
        window.addEventListener('keyup',   e => handle(e, false));

        window.addEventListener('keydown', e => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                this._triggerDash();
            }
        });
    }

    _triggerDash() {
        if (!this.canMove || this._isDashing || this._dashCooldownLeft > 0) return;

        let dx = 0, dz = 0;
        if (this.input.forward)  dz += 1;
        if (this.input.backward) dz -= 1;
        if (this.input.left)     dx -= 1;
        if (this.input.right)    dx += 1;

        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
            dx /= len; dz /= len;
        } else {
            // Joueur immobile : dash dans la dernière direction connue
            dx = this._lastDirX;
            dz = this._lastDirZ;
        }

        this._dashDirX         = dx;
        this._dashDirZ         = dz;
        this._isDashing        = true;
        this._dashElapsed      = 0;
        this._dashCooldownLeft = this.dashCooldown;
        this._dashBaseColor    = this.mesh.material.emissiveColor.clone();
        this._dashFlashTimer   = 0.25;

        if (this.onDash) this.onDash();

        this._spawnGhost(1.0);
    }

    _updateDash(delta) {
        if (this._dashCooldownLeft > 0) {
            this._dashCooldownLeft -= delta;
            if (this._dashCooldownLeft < 0) this._dashCooldownLeft = 0;
        }

        if (this._dashFlashTimer > 0) {
            this._dashFlashTimer -= delta;
            const t = Math.max(0, this._dashFlashTimer / 0.25);
            const mat = this.mesh.material;
            const base = this._dashBaseColor || new BABYLON.Color3(0.0, 0.85, 1.0);
            mat.emissiveColor = BABYLON.Color3.Lerp(base,
                new BABYLON.Color3(1.0, 1.0, 1.0),
                t * 0.7
            );
        }

        if (!this._isDashing) return;

        this._dashElapsed += delta;

        // Ease-out
        const progress   = Math.min(this._dashElapsed / this.dashDuration, 1.0);
        const easedSpeed = (1 - progress * progress) * (this.dashDistance / this.dashDuration);

        const moveX = this._dashDirX * easedSpeed * delta;
        const moveZ = this._dashDirZ * easedSpeed * delta;

        if (this.obstacleManager && (moveX !== 0 || moveZ !== 0)) {
            const curX = this.mesh.position.x;
            const curZ = this.mesh.position.z;
            if (!this.obstacleManager.checkCollisionX(curX + moveX, curZ))
                this.mesh.position.x += moveX;
            if (!this.obstacleManager.checkCollisionZ(this.mesh.position.x, curZ + moveZ))
                this.mesh.position.z += moveZ;
        } else {
            this.mesh.position.x += moveX;
            this.mesh.position.z += moveZ;
        }

        const bound = 48;
        this.mesh.position.x = Math.max(-bound, Math.min(bound, this.mesh.position.x));
        this.mesh.position.z = Math.max(-bound, Math.min(bound, this.mesh.position.z));

        if (this._dashElapsed < this.dashDuration) {
            this._spawnGhost(1 - progress);
        }

        if (progress >= 1.0) {
            this._isDashing = false;
        }
    }

    _spawnGhost(intensity) {
        const baseColor = this.mesh.material.emissiveColor.clone();

        // Trail "éclair" : segments jagged en arrière du joueur
        const boltLength = 1.5 + Math.random() * 1.5;
        const segments   = 5 + Math.floor(Math.random() * 4);
        const points     = [];

        const startX = this.mesh.position.x;
        const startZ = this.mesh.position.z;
        const baseY  = 0.3 + Math.random() * 1.0;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const mainX = startX - this._dashDirX * boltLength * t;
            const mainZ = startZ - this._dashDirZ * boltLength * t;
            const jitter = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 0.8;
            const perpX = -this._dashDirZ;
            const perpZ = this._dashDirX;
            const yJitter = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 0.5;

            points.push(new BABYLON.Vector3(
                mainX + perpX * jitter,
                baseY + yJitter,
                mainZ + perpZ * jitter
            ));
        }

        const bolt = BABYLON.MeshBuilder.CreateLines('dashBolt', {
            points: points,
            updatable: false,
        }, this.scene);
        bolt.color = new BABYLON.Color3(
            Math.min(1, baseColor.r + 0.3),
            Math.min(1, baseColor.g + 0.3),
            Math.min(1, baseColor.b + 0.3)
        );
        bolt.alpha = 0.8 * intensity;

        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(bolt);

        const spark = BABYLON.MeshBuilder.CreateSphere('dashSpark', {
            diameter: 0.25 + Math.random() * 0.2, segments: 4
        }, this.scene);
        spark.position.set(startX, baseY, startZ);
        const sparkMat = new BABYLON.StandardMaterial('sparkMat_' + Date.now(), this.scene);
        sparkMat.emissiveColor = new BABYLON.Color3(
            Math.min(1, baseColor.r + 0.5),
            Math.min(1, baseColor.g + 0.5),
            Math.min(1, baseColor.b + 0.5)
        );
        sparkMat.diffuseColor    = new BABYLON.Color3(0, 0, 0);
        sparkMat.disableLighting = true;
        sparkMat.alpha           = 0.7 * intensity;
        spark.material = sparkMat;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(spark);

        this._ghostTrail.push({
            bolt: bolt,
            spark: spark,
            baseColor: baseColor,
            life: 0.35,
            maxLife: 0.35
        });
    }

    _updateGhosts(delta) {
        for (let i = this._ghostTrail.length - 1; i >= 0; i--) {
            const g = this._ghostTrail[i];
            g.life -= delta;

            if (g.life <= 0) {
                g.bolt.dispose();
                g.spark.dispose();
                this._ghostTrail.splice(i, 1);
                continue;
            }

            const t = g.life / g.maxLife;

            g.bolt.alpha = 0.7 * t;
            g.bolt.alpha *= 0.7 + Math.random() * 0.3; // flicker

            g.spark.material.alpha = 0.6 * t;
            const s = 0.3 + 0.7 * t;
            g.spark.scaling.set(s, s, s);
            g.spark.position.y += delta * 0.5;
        }
    }

    _disposeGhosts() {
        for (const g of this._ghostTrail) {
            try { g.bolt.dispose(); } catch (_) {}
            try { g.spark.dispose(); } catch (_) {}
        }
        this._ghostTrail = [];
    }

    _update() {
        if (!this.canMove) {
            this.isMoving = false;
            this.velocity.x = 0;
            this.velocity.z = 0;
            return;
        }

        const delta = this.scene.getEngine().getDeltaTime() / 1000;

        this._updateDash(delta);
        this._updateGhosts(delta);

        if (this._speedBoostTimer > 0) {
            this._speedBoostTimer -= delta;
            if (this._speedBoostTimer < 0) this._speedBoostTimer = 0;
        }
        const speedMult = this._speedBoostTimer > 0 ? 1.5 : 1.0;

        let dx = 0, dz = 0;
        if (this.input.forward)  dz += 1;
        if (this.input.backward) dz -= 1;
        if (this.input.left)     dx -= 1;
        if (this.input.right)    dx += 1;

        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) { dx /= len; dz /= len; }

        if (len > 0) {
            this._lastDirX = dx;
            this._lastDirZ = dz;
        }

        this.isMoving   = len > 0;
        this.velocity.x = dx * this.speed;
        this.velocity.z = dz * this.speed;

        // Pendant le dash, son propre update gère le déplacement
        if (this._isDashing) return;

        const moveX = dx * this.speed * speedMult * delta;
        const moveZ = dz * this.speed * speedMult * delta;

        // Collision glissante AABB : essaie X puis Z séparément
        if (this.obstacleManager && (moveX !== 0 || moveZ !== 0)) {
            const curX = this.mesh.position.x;
            const curZ = this.mesh.position.z;
            if (!this.obstacleManager.checkCollisionX(curX + moveX, curZ))
                this.mesh.position.x += moveX;
            if (!this.obstacleManager.checkCollisionZ(this.mesh.position.x, curZ + moveZ))
                this.mesh.position.z += moveZ;
        } else {
            this.mesh.position.x += moveX;
            this.mesh.position.z += moveZ;
        }

        if (len > 0) this.mesh.rotation.y = Math.atan2(dx, dz);

        const bound = 48;
        this.mesh.position.x = Math.max(-bound, Math.min(bound, this.mesh.position.x));
        this.mesh.position.z = Math.max(-bound, Math.min(bound, this.mesh.position.z));
    }
}
