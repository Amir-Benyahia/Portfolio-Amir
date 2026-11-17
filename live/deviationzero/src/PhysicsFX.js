// PhysicsFX : surcouche visuelle Havok (empBurst, toppleSentinel, topplePlayer,
// confetti, laser, debris ambiants). No-op si Havok pas init.

export class PhysicsFX {
    constructor(scene, glowLayer) {
        this.scene     = scene;
        this.glowLayer = glowLayer;
        this._debrisMeshes  = [];
        this._ambientMeshes = [];
        this._aggregates    = [];
        this._cleanupTimers = [];
    }

    _physicsOn() {
        return !!(this.scene.getPhysicsEngine && this.scene.getPhysicsEngine())
            && typeof BABYLON.PhysicsAggregate !== 'undefined';
    }

    empBurst(pos, count = 18, lifetimeMs = 4000) {
        if (!this._physicsOn() || !pos) return;

        const mat = new BABYLON.StandardMaterial('debrisMat', this.scene);
        mat.diffuseColor    = new BABYLON.Color3(0.4, 0.0, 0.6);
        mat.emissiveColor   = new BABYLON.Color3(0.8, 0.0, 1.0);
        mat.disableLighting = true;

        for (let i = 0; i < count; i++) {
            const size = 0.18 + Math.random() * 0.18;
            const cube = BABYLON.MeshBuilder.CreateBox('emp_debris', { size }, this.scene);
            cube.position.set(pos.x, Math.max(0.5, pos.y) + 0.4, pos.z);
            cube.material = mat;
            if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(cube);
            this._debrisMeshes.push(cube);

            try {
                const agg = new BABYLON.PhysicsAggregate(
                    cube, BABYLON.PhysicsShapeType.BOX,
                    { mass: 0.2, restitution: 0.55, friction: 0.4 },
                    this.scene
                );
                this._aggregates.push(agg);

                const a = Math.random() * Math.PI * 2;
                const speed = 2.5 + Math.random() * 2.5;
                const up    = 2.2 + Math.random() * 1.6;
                agg.body.applyImpulse(
                    new BABYLON.Vector3(Math.cos(a) * speed, up, Math.sin(a) * speed),
                    cube.getAbsolutePosition()
                );
                agg.body.applyAngularImpulse(new BABYLON.Vector3(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4
                ));
            } catch (err) {
                console.warn('[PhysicsFX] emp debris fail:', err);
            }
        }

        const t = setTimeout(() => this._disposeDebris(), lifetimeMs);
        this._cleanupTimers.push(t);
    }

    droneLaserStrike(fromPos, targetMesh, color = new BABYLON.Color3(1, 0.05, 0.15)) {
        if (!this._physicsOn() || !fromPos || !targetMesh) return;

        const to  = targetMesh.position.clone();
        const dir = to.subtract(fromPos);
        const len = dir.length();
        if (len < 0.1) return;

        // Cylindre orienté drone → joueur
        const beam = BABYLON.MeshBuilder.CreateCylinder('droneLaser', {
            height: len,
            diameterTop:    0.18,
            diameterBottom: 0.45,
            tessellation: 12
        }, this.scene);
        beam.position.copyFrom(fromPos.add(to).scale(0.5));
        this._orientCylinderAlong(beam, dir);

        const mat = new BABYLON.StandardMaterial('beamMat', this.scene);
        mat.emissiveColor   = color.clone();
        mat.disableLighting = true;
        mat.alpha           = 0.9;
        beam.material       = mat;
        beam.isPickable     = false;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(beam);
        this._debrisMeshes.push(beam);

        const flash = BABYLON.MeshBuilder.CreateSphere('beamFlash', { diameter: 1.2, segments: 10 }, this.scene);
        flash.position.copyFrom(to);
        const flashMat = new BABYLON.StandardMaterial('beamFlashMat', this.scene);
        flashMat.emissiveColor   = color.clone();
        flashMat.disableLighting = true;
        flashMat.alpha           = 0.7;
        flash.material           = flashMat;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(flash);
        this._debrisMeshes.push(flash);

        // Anim beam : rise rapide puis fade
        let elapsed = 0;
        const totalMs = 550;
        const obs = this.scene.onBeforeRenderObservable.add(() => {
            elapsed += this.scene.getEngine().getDeltaTime();
            const p = Math.min(1, elapsed / totalMs);
            const alpha = p < 0.18 ? p / 0.18 : 1 - (p - 0.18) / 0.82;
            mat.alpha       = alpha * 0.95;
            flashMat.alpha  = alpha * 0.85;
            const sc        = 1 + (1 - p) * 0.6;
            beam.scaling.x  = sc;
            beam.scaling.z  = sc;
            flash.scaling.setAll(0.6 + p * 1.4);
            if (elapsed >= totalMs) {
                this.scene.onBeforeRenderObservable.remove(obs);
                try { beam.dispose();  } catch (_) {}
                try { flash.dispose(); } catch (_) {}
            }
        });

        // Joueur explose 220 ms après début (au pic du beam)
        const t = setTimeout(() => this._explodeTarget(targetMesh, color), 220);
        this._cleanupTimers.push(t);
    }

    _explodeTarget(targetMesh, color) {
        if (!this._physicsOn() || !targetMesh) return;
        const pos = targetMesh.position.clone();
        try { targetMesh.isVisible = false; } catch (_) {}

        const mat = new BABYLON.StandardMaterial('explodeMat', this.scene);
        mat.diffuseColor    = color.scale(0.5);
        mat.emissiveColor   = color.clone();
        mat.disableLighting = true;

        for (let i = 0; i < 22; i++) {
            const size = 0.16 + Math.random() * 0.22;
            const cube = BABYLON.MeshBuilder.CreateBox('explode_debris', { size }, this.scene);
            cube.position.set(pos.x, Math.max(0.5, pos.y) + 0.2, pos.z);
            cube.material = mat;
            if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(cube);
            this._debrisMeshes.push(cube);

            try {
                const agg = new BABYLON.PhysicsAggregate(
                    cube, BABYLON.PhysicsShapeType.BOX,
                    { mass: 0.15, restitution: 0.55, friction: 0.4 },
                    this.scene
                );
                this._aggregates.push(agg);
                const a = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 3.5;
                agg.body.applyImpulse(
                    new BABYLON.Vector3(Math.cos(a) * speed, 3 + Math.random() * 2.2, Math.sin(a) * speed),
                    cube.getAbsolutePosition()
                );
                agg.body.applyAngularImpulse(new BABYLON.Vector3(
                    (Math.random() - 0.5) * 9,
                    (Math.random() - 0.5) * 9,
                    (Math.random() - 0.5) * 9
                ));
            } catch (err) {
                console.warn('[PhysicsFX] explode fail:', err);
            }
        }
    }

    // Cylindre Babylon a son axe selon Y → on l'aligne sur dir
    _orientCylinderAlong(mesh, dir) {
        const up = new BABYLON.Vector3(0, 1, 0);
        const d  = dir.normalizeToNew();
        const dot = BABYLON.Vector3.Dot(up, d);
        if (Math.abs(dot - 1) < 1e-4) {
            mesh.rotation.set(0, 0, 0);
            return;
        }
        if (Math.abs(dot + 1) < 1e-4) {
            mesh.rotation.set(Math.PI, 0, 0);
            return;
        }
        const axis  = BABYLON.Vector3.Cross(up, d).normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, angle);
    }

    toppleSentinel(rootMesh) {
        if (!this._physicsOn() || !rootMesh) return;
        try {
            const agg = new BABYLON.PhysicsAggregate(
                rootMesh, BABYLON.PhysicsShapeType.BOX,
                { mass: 4, restitution: 0.2, friction: 0.7 },
                this.scene
            );
            this._aggregates.push(agg);

            agg.body.applyAngularImpulse(new BABYLON.Vector3(
                (Math.random() - 0.5) * 14,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 14
            ));
            agg.body.applyImpulse(
                new BABYLON.Vector3((Math.random() - 0.5) * 3, 1.5, (Math.random() - 0.5) * 3),
                rootMesh.getAbsolutePosition()
            );
        } catch (err) {
            console.warn('[PhysicsFX] topple sentinel fail:', err);
        }
    }

    topplePlayer(playerMesh) {
        if (!this._physicsOn() || !playerMesh) return;
        try {
            const agg = new BABYLON.PhysicsAggregate(
                playerMesh, BABYLON.PhysicsShapeType.BOX,
                { mass: 2, restitution: 0.1, friction: 0.8 },
                this.scene
            );
            this._aggregates.push(agg);

            agg.body.applyImpulse(
                new BABYLON.Vector3((Math.random() - 0.5) * 2, 0.4, (Math.random() - 0.5) * 2),
                playerMesh.getAbsolutePosition().add(new BABYLON.Vector3(0, 0.6, 0))
            );
            agg.body.applyAngularImpulse(new BABYLON.Vector3(
                (Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5
            ));
        } catch (err) {
            console.warn('[PhysicsFX] topple player fail:', err);
        }
    }

    collectSpark(pos, colorRGB = [0, 1, 1], count = 9) {
        if (!this._physicsOn() || !pos) return;
        const color = new BABYLON.Color3(colorRGB[0], colorRGB[1], colorRGB[2]);
        const mat = new BABYLON.StandardMaterial('sparkMat', this.scene);
        mat.diffuseColor    = color.scale(0.5);
        mat.emissiveColor   = color.clone();
        mat.disableLighting = true;

        for (let i = 0; i < count; i++) {
            const cube = BABYLON.MeshBuilder.CreateBox('spark', { size: 0.14 + Math.random() * 0.06 }, this.scene);
            cube.position.set(pos.x, Math.max(0.5, pos.y) + 0.4, pos.z);
            cube.material = mat;
            if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(cube);
            this._debrisMeshes.push(cube);

            try {
                const agg = new BABYLON.PhysicsAggregate(
                    cube, BABYLON.PhysicsShapeType.BOX,
                    { mass: 0.08, restitution: 0.65, friction: 0.3 },
                    this.scene
                );
                this._aggregates.push(agg);
                const a = Math.random() * Math.PI * 2;
                agg.body.applyImpulse(
                    new BABYLON.Vector3(Math.cos(a) * 1.6, 1.8 + Math.random() * 0.9, Math.sin(a) * 1.6),
                    cube.getAbsolutePosition()
                );
            } catch (err) {
                console.warn('[PhysicsFX] spark fail:', err);
            }
        }
        this._cleanupTimers.push(setTimeout(() => this._disposeShortLived(), 2500));
    }

    exitConfetti(exitPos, accentColor, count = 30) {
        if (!this._physicsOn() || !exitPos) return;
        const mat = new BABYLON.StandardMaterial('confettiMat', this.scene);
        mat.diffuseColor    = accentColor.scale(0.6);
        mat.emissiveColor   = accentColor.clone();
        mat.disableLighting = true;

        for (let i = 0; i < count; i++) {
            const size = 0.14 + Math.random() * 0.22;
            const cube = BABYLON.MeshBuilder.CreateBox('confetti', { size }, this.scene);
            cube.position.set(
                exitPos.x + (Math.random() - 0.5) * 2.5,
                4 + Math.random() * 1.5,
                exitPos.z + (Math.random() - 0.5) * 2.5
            );
            cube.material = mat;
            if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(cube);
            this._debrisMeshes.push(cube);

            try {
                const agg = new BABYLON.PhysicsAggregate(
                    cube, BABYLON.PhysicsShapeType.BOX,
                    { mass: 0.1, restitution: 0.75, friction: 0.25 },
                    this.scene
                );
                this._aggregates.push(agg);
                const a = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                agg.body.applyImpulse(
                    new BABYLON.Vector3(Math.cos(a) * speed, 4 + Math.random() * 3.5, Math.sin(a) * speed),
                    cube.getAbsolutePosition()
                );
                agg.body.applyAngularImpulse(new BABYLON.Vector3(
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 8
                ));
            } catch (err) {
                console.warn('[PhysicsFX] confetti fail:', err);
            }
        }
        this._cleanupTimers.push(setTimeout(() => this._disposeShortLived(), 5000));
    }

    // Petits cubes ambiants qui tombent et restent au sol toute la partie
    spawnAmbientDebris(accentColor, count = 10) {
        if (!this._physicsOn()) return;
        const mat = new BABYLON.StandardMaterial('ambientMat', this.scene);
        mat.diffuseColor    = accentColor.scale(0.4);
        mat.emissiveColor   = accentColor.scale(0.7);
        mat.disableLighting = true;

        for (let i = 0; i < count; i++) {
            const size = 0.22 + Math.random() * 0.25;
            const cube = BABYLON.MeshBuilder.CreateBox('ambient_debris', { size }, this.scene);
            const x = (Math.random() - 0.5) * 70;
            const z = (Math.random() - 0.5) * 70;
            cube.position.set(x, 7 + Math.random() * 5, z);
            cube.material = mat;
            if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(cube);
            this._ambientMeshes.push(cube);

            try {
                const agg = new BABYLON.PhysicsAggregate(
                    cube, BABYLON.PhysicsShapeType.BOX,
                    { mass: 0.18, restitution: 0.55, friction: 0.5 },
                    this.scene
                );
                this._aggregates.push(agg);
                agg.body.applyAngularImpulse(new BABYLON.Vector3(
                    (Math.random() - 0.5) * 2.5,
                    (Math.random() - 0.5) * 2.5,
                    (Math.random() - 0.5) * 2.5
                ));
            } catch (err) {
                console.warn('[PhysicsFX] ambient fail:', err);
            }
        }
    }

    _disposeShortLived() {
        this._debrisMeshes.forEach(m => { try { if (!m.isDisposed()) m.dispose(); } catch (_) {} });
        this._debrisMeshes = [];
    }

    _disposeAmbient() {
        this._ambientMeshes.forEach(m => { try { if (!m.isDisposed()) m.dispose(); } catch (_) {} });
        this._ambientMeshes = [];
    }

    _disposeDebris() { this._disposeShortLived(); }

    // Dispose AVANT les meshes externes (sentinelles, joueur) qui sont disposés par leur propriétaire
    dispose() {
        this._cleanupTimers.forEach(id => clearTimeout(id));
        this._cleanupTimers = [];

        this._aggregates.forEach(a => { try { a.dispose(); } catch (_) {} });
        this._aggregates = [];

        this._disposeShortLived();
        this._disposeAmbient();
    }
}
