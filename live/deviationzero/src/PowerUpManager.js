// PowerUpManager : collectibles cyan (SYNC), jaune (BURST), violet (EMP).
// Cube rotatif + torus orbital + disque beacon au sol.

const PICKUP_TYPES = ['sync', 'burst', 'emp'];

const PICKUP_COLORS = {
    sync:  new BABYLON.Color3(0.0, 1.0, 1.0),
    burst: new BABYLON.Color3(1.0, 0.8, 0.0),
    emp:   new BABYLON.Color3(0.8, 0.0, 1.0),
};

export class PowerUpManager {
    constructor(scene, glowLayer, onCollect = null) {
        this.scene     = scene;
        this.glowLayer = glowLayer;
        this.onCollect = onCollect;

        this._pickups  = [];
        this._meshes   = [];
        this._observer = null;
        this._player   = null;
    }

    generate(config, exitPos, player) {
        this._clear();
        this._player = player;

        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const type = PICKUP_TYPES[i % PICKUP_TYPES.length];
            let x, z, att = 0;
            do {
                x = (Math.random() - 0.5) * 82;
                z = (Math.random() - 0.5) * 82;
                att++;
            } while (att < 25 && (Math.abs(x) < 6 && Math.abs(z) < 6));

            this._spawn(x, z, type);
        }

        this._observer = this.scene.onBeforeRenderObservable.add(() => this._update());
    }

    dispose() { this._clear(); }

    _spawn(x, z, type) {
        const color = PICKUP_COLORS[type];

        const mesh = BABYLON.MeshBuilder.CreateBox(`pu_${type}`, { width: 0.55, height: 0.55, depth: 0.55 }, this.scene);
        mesh.position.set(x, 1.25, z);
        const mat = new BABYLON.StandardMaterial(`puMat_${type}`, this.scene);
        mat.emissiveColor   = color;
        mat.disableLighting = true;
        mat.alpha = 0.88;
        mesh.material = mat;
        this.glowLayer.addIncludedOnlyMesh(mesh);

        const ring = BABYLON.MeshBuilder.CreateTorus(`puRing_${type}`, {
            diameter: 1.5, thickness: 0.07, tessellation: 20
        }, this.scene);
        ring.position.set(x, 1.25, z);
        const ringMat = new BABYLON.StandardMaterial(`puRingMat_${type}`, this.scene);
        ringMat.emissiveColor   = color.scale(0.6);
        ringMat.disableLighting = true;
        ring.material = ringMat;
        this.glowLayer.addIncludedOnlyMesh(ring);

        const disc = BABYLON.MeshBuilder.CreateDisc(`puDisc_${type}`, { radius: 0.9, tessellation: 20 }, this.scene);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(x, 0.01, z);
        const discMat = new BABYLON.StandardMaterial(`puDiscMat_${type}`, this.scene);
        discMat.emissiveColor   = color.scale(0.35);
        discMat.alpha           = 0.30;
        discMat.disableLighting = true;
        discMat.backFaceCulling = false;
        disc.material = discMat;
        this.glowLayer.addIncludedOnlyMesh(disc);

        const pickup = { mesh, ring, disc, type, collected: false,
            rotT: Math.random() * Math.PI * 2,
            bobT: Math.random() * Math.PI * 2,
            baseY: 1.25 };

        this._pickups.push(pickup);
        this._meshes.push(mesh, ring, disc);
    }

    _update() {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;

        for (const p of this._pickups) {
            if (p.collected) continue;

            p.rotT += dt * 1.8;
            p.bobT += dt * 1.3;
            p.mesh.rotation.y = p.rotT;
            p.mesh.rotation.x = p.rotT * 0.4;
            const newY = p.baseY + Math.sin(p.bobT) * 0.18;
            p.mesh.position.y = newY;
            p.ring.position.y = newY;
            p.ring.rotation.x = p.rotT * 0.6;
            p.ring.rotation.z = p.rotT * 0.3;
        }

        if (this._player && this._player.mesh) {
            const px = this._player.mesh.position.x;
            const pz = this._player.mesh.position.z;
            for (const p of this._pickups) {
                if (p.collected) continue;
                const dx = px - p.mesh.position.x;
                const dz = pz - p.mesh.position.z;
                if (dx * dx + dz * dz < 2.0) {
                    this._collect(p);
                }
            }
        }
    }

    _collect(p) {
        p.collected = true;
        try { if (!p.mesh.isDisposed()) p.mesh.dispose(); } catch (_) {}
        try { if (!p.ring.isDisposed()) p.ring.dispose(); } catch (_) {}
        try { if (!p.disc.isDisposed()) p.disc.dispose(); } catch (_) {}
        if (this.onCollect) this.onCollect(p.type);
    }

    _clear() {
        if (this._observer) {
            this.scene.onBeforeRenderObservable.remove(this._observer);
            this._observer = null;
        }
        this._meshes.forEach(m => { try { if (!m.isDisposed()) m.dispose(); } catch (_) {} });
        this._meshes  = [];
        this._pickups = [];
        this._player  = null;
    }
}
