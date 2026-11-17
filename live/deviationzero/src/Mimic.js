// Mimic : un NPC. FSM 3 états (MOVING → ROTATING → PAUSING) en angles cardinaux.
// Variants : 'normal' (orange), 'fast' (rouge), 'stationary' (gris-teal).

const State = Object.freeze({
    MOVING:   'MOVING',
    ROTATING: 'ROTATING',
    PAUSING:  'PAUSING'
});

const CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export class Mimic {
    constructor(id, x, z, speed = 5, boundSize = 45, timingConfig = {}, variant = 'normal') {
        this.id        = id;
        this.boundSize = boundSize;
        this.variant   = variant;

        let spd = speed;
        let cfg = { ...timingConfig };

        if (variant === 'fast') {
            spd  = speed * 1.55;
            cfg  = {
                pauseMin: (timingConfig.pauseMin ?? 0.5) * 0.4,
                pauseMax: (timingConfig.pauseMax ?? 2.0) * 0.4,
                moveMin:  (timingConfig.moveMin  ?? 3)   * 1.6,
                moveMax:  (timingConfig.moveMax  ?? 8)   * 1.6,
            };
        } else if (variant === 'stationary') {
            spd  = speed * 0.35;
            const pm = timingConfig.pauseMax ?? 2.0;
            cfg  = {
                pauseMin: pm * 2.2,
                pauseMax: pm * 4.5,
                moveMin:  (timingConfig.moveMin ?? 3) * 0.4,
                moveMax:  (timingConfig.moveMin ?? 3) * 0.8,
            };
        }

        this.speed    = spd;
        this.pauseMin = timingConfig.pauseMin ?? 0.5;
        this.pauseMax = timingConfig.pauseMax ?? 2.0;
        this.moveMin  = timingConfig.moveMin  ?? 3;
        this.moveMax  = timingConfig.moveMax  ?? 8;

        this._pauseMin = cfg.pauseMin ?? this.pauseMin;
        this._pauseMax = cfg.pauseMax ?? this.pauseMax;
        this._moveMin  = cfg.moveMin  ?? this.moveMin;
        this._moveMax  = cfg.moveMax  ?? this.moveMax;

        this.position = new BABYLON.Vector3(x, 0.7, z);
        this.rotation = CARDINAL_ANGLES[Math.floor(Math.random() * 4)];
        this.velocity = new BABYLON.Vector3(0, 0, 0);

        this.state           = State.PAUSING;
        this._stateTimer     = this._randomPause();
        this._targetRotation = this.rotation;

        this.matrix = BABYLON.Matrix.Identity();
        this._updateMatrix();
    }

    update(dt) {
        switch (this.state) {
            case State.MOVING:   this._updateMoving(dt);   break;
            case State.ROTATING: this._updateRotating(dt); break;
            case State.PAUSING:  this._updatePausing(dt);  break;
        }

        this.position.x = Math.max(-this.boundSize, Math.min(this.boundSize, this.position.x));
        this.position.z = Math.max(-this.boundSize, Math.min(this.boundSize, this.position.z));
        this._updateMatrix();
    }

    _updateMoving(dt) {
        const step = this.speed * dt;
        // décrément en temps, pas en distance (sinon les "fast" passent plus vite leur timer)
        this._stateTimer -= dt;

        const dx = Math.sin(this.rotation) * step;
        const dz = Math.cos(this.rotation) * step;
        this.position.x += dx;
        this.position.z += dz;

        this.velocity.x = Math.sin(this.rotation) * this.speed;
        this.velocity.z = Math.cos(this.rotation) * this.speed;

        const atBound =
            Math.abs(this.position.x) >= this.boundSize ||
            Math.abs(this.position.z) >= this.boundSize;

        if (atBound || this._stateTimer <= 0) this._enterRotating();
    }

    _updateRotating(_dt) {
        this.rotation   = this._targetRotation;
        this.velocity.x = 0;
        this.velocity.z = 0;
        this._enterPausing();
    }

    _updatePausing(dt) {
        this._stateTimer -= dt;
        this.velocity.x  = 0;
        this.velocity.z  = 0;
        if (this._stateTimer <= 0) this._enterMoving();
    }

    _enterMoving() {
        this.state       = State.MOVING;
        this._stateTimer = this._moveMin + Math.random() * (this._moveMax - this._moveMin);
    }

    _enterRotating() {
        this.state = State.ROTATING;
        let candidates = CARDINAL_ANGLES.filter(a => Math.abs(a - this.rotation) > 0.01);
        // Filtre les angles qui sortiraient des bounds
        if (this.position.x >  this.boundSize - 2) candidates = candidates.filter(a => Math.sin(a) <= 0);
        if (this.position.x < -this.boundSize + 2) candidates = candidates.filter(a => Math.sin(a) >= 0);
        if (this.position.z >  this.boundSize - 2) candidates = candidates.filter(a => Math.cos(a) <= 0);
        if (this.position.z < -this.boundSize + 2) candidates = candidates.filter(a => Math.cos(a) >= 0);
        if (candidates.length === 0) candidates = CARDINAL_ANGLES;
        this._targetRotation = candidates[Math.floor(Math.random() * candidates.length)];
    }

    _enterPausing() {
        this.state       = State.PAUSING;
        this._stateTimer = this._randomPause();
    }

    _randomPause() {
        return this._pauseMin + Math.random() * (this._pauseMax - this._pauseMin);
    }

    _updateMatrix() {
        BABYLON.Matrix.ComposeToRef(
            BABYLON.Vector3.One(),
            BABYLON.Quaternion.RotationYawPitchRoll(this.rotation, 0, 0),
            this.position,
            this.matrix
        );
    }
}
