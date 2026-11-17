// DetectionEngine : calcule la déviation du joueur vs la foule locale
// puis fait monter/descendre la jauge de suspicion.

export class DetectionEngine {
    constructor(scene, player, mimicManager) {
        this.scene        = scene;
        this.player       = player;
        this.mimicManager = mimicManager;

        this.scanRadius    = 15;
        this.threshold     = 0.6;
        this.growRate      = 100;
        this.decayRate     = 10;
        this.fastDecayRate = 22.5;

        this.suspicion  = 0;
        this.isCritical = false;
        this.isGameOver = false;
        this.deltaS     = 0;

        this.idleTimer   = 0;
        this.moveTimer   = 0;
        this.maxIdleTime = 3.0;
        this.maxMoveTime = 2.5;

        // Settés par LevelManager après construction
        this.rhythmSystem    = null;
        this.safeZoneManager = null;

        this.godMode = false;

        this.hudContainer = document.getElementById('suspicion-container');
        this.hudFill      = document.getElementById('suspicion-fill');
        this.hudValue     = document.getElementById('suspicion-value');

        this.baseColor = this.player.mesh.material.emissiveColor.clone();

        this._observer = this.scene.onBeforeRenderObservable.add(() => this._update());
    }

    reset() {
        this.suspicion  = 0;
        this.isCritical = false;
        this.isGameOver = false;
        this.deltaS     = 0;
        this.idleTimer  = 0;
        this.moveTimer  = 0;
        if (this.hudContainer) this.hudContainer.classList.remove('suspicion-critical');
        if (this.hudFill)  this.hudFill.style.width = '0%';
        if (this.hudValue) this.hudValue.textContent = '0%';
        this.baseColor = this.player.mesh.material.emissiveColor.clone();
    }

    dispose() {
        if (this._observer) {
            this.scene.onBeforeRenderObservable.remove(this._observer);
            this._observer = null;
        }
    }

    _update() {
        if (this.isGameOver) return;

        if (this.godMode) {
            this.suspicion = 0;
            this.deltaS    = 0;
            this._updateVisuals();
            return;
        }

        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        if (dt > 0.5) return; // saut de temps anormal (pause récente)

        const deviation = this._calculateDeviation(dt);
        this._updateSuspicion(deviation, dt);
        this._updateVisuals();
    }

    _calculateDeviation(dt = 0) {
        const elapsed = Number.isFinite(dt) ? dt : 0;
        const nearby = this.mimicManager.getMimicsNear(
            this.player.mesh.position,
            this.scanRadius
        );

        // Personne autour : on pénalise quand même un peu si le joueur bouge
        if (nearby.length === 0) {
            return this.player.velocity.lengthSquared() > 0.1 ? 0.35 : 0;
        }

        let avgVx = 0, avgVz = 0;
        for (let i = 0; i < nearby.length; i++) {
            avgVx += nearby[i].velocity.x;
            avgVz += nearby[i].velocity.z;
        }
        avgVx /= nearby.length;
        avgVz /= nearby.length;

        const dvx          = this.player.velocity.x - avgVx;
        const dvz          = this.player.velocity.z - avgVz;
        const velocityDelta = Math.sqrt(dvx * dvx + dvz * dvz) / this.player.speed;

        // Mouvement diagonal → bonus déviation (les Mimics bougent en cardinal)
        let rotationVariance = 0;
        const speedSq = this.player.velocity.lengthSquared();
        if (speedSq > 0.1) {
            const nx = Math.abs(this.player.velocity.x / this.player.speed);
            const nz = Math.abs(this.player.velocity.z / this.player.speed);
            if (nx > 0.1 && nx < 0.9 && nz > 0.1 && nz < 0.9) rotationVariance = 0.5;
        }

        let total = velocityDelta + rotationVariance;

        // Pénalité idle/move trop long
        if (speedSq < 0.01) {
            this.idleTimer += elapsed;
            this.moveTimer = 0;
            if (this.idleTimer > this.maxIdleTime)
                total += (this.idleTimer - this.maxIdleTime) * 0.5;
        } else {
            this.moveTimer += elapsed;
            this.idleTimer = 0;
            if (this.moveTimer > this.maxMoveTime)
                total += (this.moveTimer - this.maxMoveTime) * 0.5;
        }

        return total;
    }

    _updateSuspicion(deviation, dt) {
        // Safe zone : on saute tout le calcul, on décroît vite
        if (this.safeZoneManager &&
            this.safeZoneManager.isPlayerSafe(this.player.mesh.position)) {
            const ds = -35 * dt;
            this.deltaS    = ds;
            this.suspicion = Math.max(0, this.suspicion + ds);
            this.safeZoneManager.updateHUD(true);
            return;
        }
        if (this.safeZoneManager) this.safeZoneManager.updateHUD(false);

        const rhythmMult = this.rhythmSystem
            ? this.rhythmSystem.getDeviationMultiplier()
            : 1.0;

        let deltaS = 0;
        if (deviation > this.threshold) {
            const intensity = Math.min((deviation - this.threshold) * 2, 2.0);
            deltaS = this.growRate * intensity * rhythmMult * dt;
        } else {
            const speedSq = this.player.velocity.lengthSquared();
            const decay   = (speedSq < 0.01) ? this.fastDecayRate : this.decayRate;
            deltaS = -decay * dt;
        }

        this.deltaS    = deltaS;
        this.suspicion = Math.max(0, Math.min(100, this.suspicion + deltaS));
    }

    _updateVisuals() {
        const s = Math.round(this.suspicion);
        if (this.hudFill)  this.hudFill.style.width = `${s}%`;
        if (this.hudValue) this.hudValue.textContent = `${s}%`;

        let barColor = '#00ffff';
        if (s > 70)      barColor = '#ff0000';
        else if (s > 30) barColor = '#ff00ff';

        if (this.hudFill) {
            this.hudFill.style.background = `linear-gradient(90deg, #00ffff, ${barColor})`;
            this.hudFill.style.boxShadow  = `0 0 8px ${barColor}99`;
        }

        if (this.hudContainer) {
            if (s > 70 && !this.isCritical) {
                this.hudContainer.classList.add('suspicion-critical');
                this.isCritical = true;
            } else if (s <= 70 && this.isCritical) {
                this.hudContainer.classList.remove('suspicion-critical');
                this.isCritical = false;
            }
        }

        // Couleur joueur : cyan → rouge au fur et à mesure
        const ratio = s / 100.0;
        this.player.mesh.material.emissiveColor = new BABYLON.Color3(
            BABYLON.Scalar.Lerp(this.baseColor.r, 1.0, ratio),
            BABYLON.Scalar.Lerp(this.baseColor.g, 0.0, ratio),
            BABYLON.Scalar.Lerp(this.baseColor.b, 0.0, ratio)
        );
        this.player.mesh.material.diffuseColor = new BABYLON.Color3(
            BABYLON.Scalar.Lerp(0.0, 0.8, ratio),
            this.baseColor.g,
            this.baseColor.b
        );
    }
}
