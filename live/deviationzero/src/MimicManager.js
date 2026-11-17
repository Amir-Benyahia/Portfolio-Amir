// MimicManager : gère tous les NPCs.
// 3 meshes source (un par variant) + Thin Instances → 3 draw calls quel que soit le count.
// SpatialHash pour accélérer getMimicsNear.

import { Mimic }        from './Mimic.js';
import { SpatialHash }  from './SpatialHash.js';

const DEFAULT_VARIANTS = { normal: 0.70, fast: 0.20, stationary: 0.10 };

export class MimicManager {
    constructor(scene, glowLayer, count = 50, speed = 5, timingConfig = {}, variantRatios = {}) {
        this.scene        = scene;
        this.count        = count;
        this.speed        = speed;
        this.timingConfig = timingConfig;
        this._ratios      = { ...DEFAULT_VARIANTS, ...variantRatios };

        this.mimics  = [];
        this._groups = { normal: [], fast: [], stationary: [] };

        this._sources    = {};
        this.sourceMesh  = null;
        this._buffers    = {};

        this._spatialHash = new SpatialHash(12);
        this._observer    = null;

        this._buildSources(glowLayer);
        this._spawnMimics();

        this._observer = this.scene.onBeforeRenderObservable.add(() => this._update());
    }

    getMimicsNear(position, radius) {
        const nearby = this._spatialHash.query(position.x, position.z, radius);
        if (nearby.length > 0 || this.mimics.length === 0) {
            return nearby;
        }

        // Fallback O(n) au cas où la rebuild du hash a raté
        const radiusSq = radius * radius;
        const fallback = [];
        for (let i = 0; i < this.mimics.length; i++) {
            const mimic = this.mimics[i];
            const dx = mimic.position.x - position.x;
            const dz = mimic.position.z - position.z;
            if (dx * dx + dz * dz <= radiusSq) fallback.push(mimic);
        }
        return fallback;
    }

    dispose() {
        if (this._observer) {
            this.scene.onBeforeRenderObservable.remove(this._observer);
            this._observer = null;
        }
        for (const src of Object.values(this._sources)) {
            if (src) src.dispose();
        }
        this._sources   = {};
        this.sourceMesh = null;
        this.mimics     = [];
        this._groups    = { normal: [], fast: [], stationary: [] };
    }

    _buildSources(glowLayer) {
        const specs = {
            normal:     { diff: [1.0, 0.45, 0.0], emis: [1.0, 0.50, 0.05] },
            fast:       { diff: [1.0, 0.15, 0.0], emis: [1.0, 0.20, 0.0]  },
            stationary: { diff: [0.2, 0.50, 0.5], emis: [0.15, 0.55, 0.6] },
        };

        for (const [name, s] of Object.entries(specs)) {
            const mesh = BABYLON.MeshBuilder.CreateBox(`mimicSrc_${name}`, {
                width: 1, height: 1.4, depth: 1
            }, this.scene);
            mesh.isVisible = false;

            const mat = new BABYLON.StandardMaterial(`mimicMat_${name}`, this.scene);
            mat.diffuseColor  = new BABYLON.Color3(...s.diff);
            mat.emissiveColor = new BABYLON.Color3(...s.emis);
            mat.specularColor = new BABYLON.Color3(0.15, 0.08, 0.0);
            mat.alpha = 0.88;
            mesh.material = mat;

            if (glowLayer) glowLayer.addIncludedOnlyMesh(mesh);
            this._sources[name] = mesh;
        }

        this.sourceMesh = this._sources.normal;
    }

    _spawnMimics() {
        const BOUND = 45;

        const nNormal     = Math.round(this.count * this._ratios.normal);
        const nFast       = Math.round(this.count * this._ratios.fast);
        const nStationary = this.count - nNormal - nFast;

        const spawn = (n, variant) => {
            for (let i = 0; i < n; i++) {
                const x = (Math.random() - 0.5) * 2 * BOUND;
                const z = (Math.random() - 0.5) * 2 * BOUND;
                const m = new Mimic(this.mimics.length, x, z, this.speed, BOUND, this.timingConfig, variant);
                this.mimics.push(m);
                this._groups[variant].push(m);
            }
        };

        spawn(nNormal,     'normal');
        spawn(nFast,       'fast');
        spawn(nStationary, 'stationary');

        // Buffers Float32Array alloués UNE fois, réutilisés à chaque frame (0 GC)
        for (const [name, group] of Object.entries(this._groups)) {
            if (group.length === 0) continue;
            this._buffers[name] = new Float32Array(group.length * 16);
            this._syncGroup(name);
            this._sources[name].thinInstanceSetBuffer('matrix', this._buffers[name], 16, false);
            this._sources[name].isVisible = group.length > 0;
        }
    }

    _update() {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;

        for (let i = 0; i < this.mimics.length; i++) {
            this.mimics[i].update(dt);
        }

        this._spatialHash.rebuild(this.mimics);
        this._syncGroup('normal');
        this._syncGroup('fast');
        this._syncGroup('stationary');
    }

    _syncGroup(name) {
        const group = this._groups[name];
        if (!group || group.length === 0) return;
        const buf = this._buffers[name];
        for (let i = 0; i < group.length; i++) {
            buf.set(group[i].matrix.toArray(), i * 16);
        }
        this._sources[name].thinInstanceSetBuffer('matrix', buf, 16, false);
    }
}
