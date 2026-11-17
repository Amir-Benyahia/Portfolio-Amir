// SafeZoneManager : disques bleus au sol. Dans la zone, la suspicion ne grimpe
// plus et redescend vite (géré par DetectionEngine).

export class SafeZoneManager {
    constructor(scene, glowLayer) {
        this.scene      = scene;
        this.glowLayer  = glowLayer;
        this._zones     = [];
        this._meshes    = [];
        this._observer  = null;
        this._wasInSafe = false;

        this._hudSafe = document.getElementById('hud-safe');
    }

    generate(config, exitPos) {
        this._clear();

        const safeColor = new BABYLON.Color3(0.05, 0.85, 1.0);
        const count = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < count; i++) {
            let x, z, att = 0;
            do {
                x = (Math.random() - 0.5) * 70;
                z = (Math.random() - 0.5) * 70;
                att++;
            } while (att < 25 && (
                (Math.abs(x) < 8 && Math.abs(z) < 8) ||
                (Math.hypot(x - exitPos.x, z - exitPos.z) < 12)
            ));
            this._spawnZone(x, z, safeColor);
        }

        this._observer = this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.scene.getEngine().getDeltaTime() / 1000;
            this._animate(dt);
        });
    }

    isPlayerSafe(playerPos) {
        for (const z of this._zones) {
            const dx = playerPos.x - z.x;
            const dz = playerPos.z - z.z;
            if (dx * dx + dz * dz <= z.r * z.r) return true;
        }
        return false;
    }

    updateHUD(inSafe) {
        if (!this._hudSafe) return;
        if (inSafe && !this._wasInSafe) {
            this._hudSafe.classList.remove('hud-hidden');
        } else if (!inSafe && this._wasInSafe) {
            this._hudSafe.classList.add('hud-hidden');
        }
        this._wasInSafe = inSafe;
    }

    dispose() {
        if (this._observer) {
            this.scene.onBeforeRenderObservable.remove(this._observer);
            this._observer = null;
        }
        this._clear();
        if (this._hudSafe) this._hudSafe.classList.add('hud-hidden');
    }

    _spawnZone(x, z, color) {
        const radius = 3.5 + Math.random() * 2.0;

        const disc = BABYLON.MeshBuilder.CreateDisc('safeDisc', { radius, tessellation: 32 }, this.scene);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(x, 0.015, z);

        const mat = new BABYLON.StandardMaterial('safeDiscMat', this.scene);
        mat.emissiveColor   = color.scale(0.45);
        mat.alpha           = 0.22;
        mat.disableLighting = true;
        mat.backFaceCulling = false;
        disc.material = mat;
        this.glowLayer.addIncludedOnlyMesh(disc);

        const inner = BABYLON.MeshBuilder.CreateDisc('safeInner', { radius: radius * 0.25, tessellation: 16 }, this.scene);
        inner.rotation.x = Math.PI / 2;
        inner.position.set(x, 0.02, z);

        const innerMat = new BABYLON.StandardMaterial('safeInnerMat', this.scene);
        innerMat.emissiveColor   = color;
        innerMat.alpha           = 0.55;
        innerMat.disableLighting = true;
        innerMat.backFaceCulling = false;
        inner.material = innerMat;
        this.glowLayer.addIncludedOnlyMesh(inner);

        const ring = BABYLON.MeshBuilder.CreateTorus('safeRing', {
            diameter: radius * 2,
            thickness: 0.12,
            tessellation: 32
        }, this.scene);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 0.03, z);
        const ringMat = new BABYLON.StandardMaterial('safeRingMat', this.scene);
        ringMat.emissiveColor   = color;
        ringMat.disableLighting = true;
        ring.material = ringMat;
        this.glowLayer.addIncludedOnlyMesh(ring);

        this._zones.push({ x, z, r: radius, mat, innerMat, t: Math.random() * Math.PI * 2 });
        this._meshes.push(disc, inner, ring);
    }

    _animate(dt) {
        for (const zone of this._zones) {
            zone.t += dt * 1.8;
            const pulse = 0.18 + Math.sin(zone.t) * 0.07;
            zone.mat.alpha      = pulse;
            zone.innerMat.alpha = 0.45 + Math.sin(zone.t * 1.4) * 0.12;
        }
    }

    _clear() {
        this._meshes.forEach(m => { try { if (!m.isDisposed()) m.dispose(); } catch (_) {} });
        this._meshes = [];
        this._zones  = [];
    }
}
