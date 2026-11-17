// ObstacleManager : crates / pillars / blocks de couverture cyberpunk.
// AABB maison pour le joueur, PhysicsAggregate statique pour Havok (debris EMP).

export class ObstacleManager {
    constructor(scene, glowLayer) {
        this.scene       = scene;
        this.glowLayer   = glowLayer;
        this._meshes     = [];
        this._aggregates = [];
        this._accentMats = [];
        this.aabbs       = [];

        // Pulse rythmique : on scale l'emissive des liserés, pas la position
        // (les obstacles sont des corps statiques Havok, déplacer le mesh casse le collider)
        this._pulseTime     = 0;
        this._pulseObserver = this.scene.onBeforeRenderObservable.add(() => this._tickPulse());
    }

    pulse() {
        this._pulseTime = performance.now();
    }

    _tickPulse() {
        if (!this._pulseTime || this._accentMats.length === 0) return;
        const elapsed = (performance.now() - this._pulseTime) / 220;
        if (elapsed >= 1) {
            this._accentMats.forEach(({ mat, base }) => {
                mat.emissiveColor = base.clone();
            });
            this._pulseTime = 0;
            return;
        }
        const boost = 1 + (1 - elapsed) * 0.85;
        this._accentMats.forEach(({ mat, base }) => {
            mat.emissiveColor = base.scale(boost);
        });
    }

    _attachStaticBody(mesh) {
        if (!this.scene.getPhysicsEngine || !this.scene.getPhysicsEngine()) return;
        if (typeof BABYLON.PhysicsAggregate === 'undefined') return;
        try {
            const agg = new BABYLON.PhysicsAggregate(
                mesh, BABYLON.PhysicsShapeType.BOX,
                { mass: 0, restitution: 0.15, friction: 0.6 },
                this.scene
            );
            this._aggregates.push(agg);
        } catch (err) {
            console.warn('[Havok] obstacle body fail:', err);
        }
    }

    generate(config, exitPos) {
        this._clear();

        const [er, eg, eb] = config.exitColor;
        const accent = new BABYLON.Color3(er, eg, eb);

        const count = 14 + Math.floor(Math.random() * 8);
        for (let i = 0; i < count; i++) {
            const r = Math.random();
            if      (r < 0.40) this._spawnCrate(accent, exitPos);
            else if (r < 0.70) this._spawnPillar(accent, exitPos);
            else               this._spawnBlock(accent, exitPos);
        }
    }

    checkCollisionX(newX, curZ, hw = 0.52, hd = 0.52) {
        for (const b of this.aabbs) {
            if (newX + hw > b.minX && newX - hw < b.maxX &&
                curZ + hd > b.minZ && curZ - hd < b.maxZ) return true;
        }
        return false;
    }

    checkCollisionZ(curX, newZ, hw = 0.52, hd = 0.52) {
        for (const b of this.aabbs) {
            if (curX + hw > b.minX && curX - hw < b.maxX &&
                newZ + hd > b.minZ && newZ - hd < b.maxZ) return true;
        }
        return false;
    }

    _randomPos(exitPos, clearRadius = 9) {
        let x, z, att = 0;
        do {
            x = (Math.random() - 0.5) * 82;
            z = (Math.random() - 0.5) * 82;
            att++;
        } while (att < 30 && (
            (Math.abs(x) < 6 && Math.abs(z) < 6) ||
            (Math.hypot(x - exitPos.x, z - exitPos.z) < clearRadius)
        ));
        return { x, z };
    }

    _registerAABB(cx, cz, w, d) {
        this.aabbs.push({
            minX: cx - w / 2, maxX: cx + w / 2,
            minZ: cz - d / 2, maxZ: cz + d / 2,
        });
    }

    _baseMat(accent) {
        const mat = new BABYLON.StandardMaterial('obsMat', this.scene);
        mat.diffuseColor  = new BABYLON.Color3(0.07, 0.07, 0.10);
        mat.emissiveColor = accent.scale(0.12);
        mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.5);
        mat.specularPower = 64;
        return mat;
    }

    _accentMat(accent, intensity = 1.0) {
        const mat = new BABYLON.StandardMaterial('obsAccentMat', this.scene);
        const base = accent.scale(intensity);
        mat.emissiveColor   = base.clone();
        mat.disableLighting = true;
        // Tracké pour pouvoir scaler depuis la base lors du pulse
        this._accentMats.push({ mat, base });
        return mat;
    }

    _track(mesh) { this._meshes.push(mesh); return mesh; }

    _spawnCrate(accent, exitPos) {
        const { x, z } = this._randomPos(exitPos, 7);
        const w = 1.4 + Math.random() * 0.8;
        const d = 1.4 + Math.random() * 0.8;
        const h = 1.2 + Math.random() * 0.6;

        const body = this._track(BABYLON.MeshBuilder.CreateBox('obs_crate', { width: w, height: h, depth: d }, this.scene));
        body.position.set(x, h / 2, z);
        body.material = this._baseMat(accent);

        const strip = this._track(BABYLON.MeshBuilder.CreateBox('obs_crate_strip', { width: w - 0.05, height: 0.06, depth: d - 0.05 }, this.scene));
        strip.position.set(x, h + 0.03, z);
        const sm = this._accentMat(accent, 0.8);
        strip.material = sm;
        this.glowLayer.addIncludedOnlyMesh(strip);

        this._registerAABB(x, z, w, d);
        this._attachStaticBody(body);
    }

    _spawnPillar(accent, exitPos) {
        const { x, z } = this._randomPos(exitPos, 6);
        const w = 1.1 + Math.random() * 0.4;
        const d = 1.1 + Math.random() * 0.4;
        const h = 4.0 + Math.random() * 2.5;

        const body = this._track(BABYLON.MeshBuilder.CreateBox('obs_pillar', { width: w, height: h, depth: d }, this.scene));
        body.position.set(x, h / 2, z);
        body.material = this._baseMat(accent);

        const cap = this._track(BABYLON.MeshBuilder.CreateBox('obs_cap', { width: w + 0.2, height: 0.18, depth: d + 0.2 }, this.scene));
        cap.position.set(x, h + 0.09, z);
        cap.material = this._accentMat(accent, 1.0);
        this.glowLayer.addIncludedOnlyMesh(cap);

        const band = this._track(BABYLON.MeshBuilder.CreateBox('obs_band', { width: w + 0.12, height: 0.1, depth: d + 0.12 }, this.scene));
        band.position.set(x, h * 0.45, z);
        band.material = this._accentMat(accent, 0.55);
        this.glowLayer.addIncludedOnlyMesh(band);

        this._registerAABB(x, z, w, d);
        this._attachStaticBody(body);
    }

    _spawnBlock(accent, exitPos) {
        const { x, z } = this._randomPos(exitPos, 10);
        const w = 3.0 + Math.random() * 2.0;
        const d = 2.5 + Math.random() * 1.5;
        const h = 1.8 + Math.random() * 0.8;

        const body = this._track(BABYLON.MeshBuilder.CreateBox('obs_block', { width: w, height: h, depth: d }, this.scene));
        body.position.set(x, h / 2, z);
        body.material = this._baseMat(accent);

        const stripe = this._track(BABYLON.MeshBuilder.CreateBox('obs_stripe', { width: w + 0.04, height: 0.09, depth: d + 0.04 }, this.scene));
        stripe.position.set(x, h * 0.35, z);
        stripe.material = this._accentMat(accent, 0.65);
        this.glowLayer.addIncludedOnlyMesh(stripe);

        const corner = this._track(BABYLON.MeshBuilder.CreateBox('obs_corner', { width: 0.3, height: 0.3, depth: 0.3 }, this.scene));
        corner.position.set(x + w / 2 - 0.15, h + 0.15, z + d / 2 - 0.15);
        corner.material = this._accentMat(accent, 1.2);
        this.glowLayer.addIncludedOnlyMesh(corner);

        this._registerAABB(x, z, w, d);
        this._attachStaticBody(body);
    }

    _clear() {
        // Dispose les agrégats avant les meshes (sinon body pointe sur un mesh disposé)
        this._aggregates.forEach(a => { try { a.dispose(); } catch (_) {} });
        this._aggregates = [];

        this._meshes.forEach(m => { try { if (!m.isDisposed()) m.dispose(); } catch (_) {} });
        this._meshes     = [];
        this.aabbs       = [];
        this._accentMats = [];
        this._pulseTime  = 0;
    }

    dispose() {
        if (this._pulseObserver) {
            this.scene.onBeforeRenderObservable.remove(this._pulseObserver);
            this._pulseObserver = null;
        }
        this._clear();
    }
}
