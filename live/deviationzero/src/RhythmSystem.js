// RhythmSystem : tracker BPM. Fournit une "grace window" autour de chaque beat
// pendant laquelle la suspicion grimpe moins vite si le joueur bouge à temps.

export class RhythmSystem {
    constructor(bpm = 80) {
        this.bpm          = bpm;
        this.beatInterval = 60 / bpm;
        this.beatPhase    = 0;
        this.beatCount    = 0;
        this.graceWindow  = 0.18;

        this.onBeat = null;

        this._timer    = 0;
        this._observer = null;

        this._beatDot   = document.getElementById('hud-beat-dot');
        this._beatLabel = document.getElementById('hud-beat-bpm');
    }

    attach(scene) {
        this._scene = scene;
        this._observer = scene.onBeforeRenderObservable.add(() => {
            const dt = scene.getEngine().getDeltaTime() / 1000;
            this._timer += dt;
            this.beatPhase = (this._timer % this.beatInterval) / this.beatInterval;

            if (this._timer >= this.beatInterval) {
                this._timer -= this.beatInterval;
                this.beatCount++;
                if (this.onBeat) this.onBeat(this.beatCount);
                this._flashBeat();
            }

            this._updateHUD();
        });

        if (this._beatLabel) this._beatLabel.textContent = `${Math.round(this.bpm)} BPM`;
    }

    isInBeatWindow() {
        return this.beatPhase < this.graceWindow || this.beatPhase > (1 - this.graceWindow);
    }

    getDeviationMultiplier() {
        return this.isInBeatWindow() ? 0.55 : 1.0;
    }

    dispose() {
        if (this._observer && this._scene) {
            this._scene.onBeforeRenderObservable.remove(this._observer);
            this._observer = null;
        }
        if (this._beatDot) {
            this._beatDot.classList.remove('beat-active');
        }
    }

    _flashBeat() {
        if (!this._beatDot) return;
        this._beatDot.classList.remove('beat-active');
        void this._beatDot.offsetWidth;
        this._beatDot.classList.add('beat-active');
    }

    _updateHUD() {
        if (!this._beatDot) return;
        const scale = 1 + Math.max(0, (0.3 - this.beatPhase) / 0.3) * 0.5;
        this._beatDot.style.transform = `scale(${scale.toFixed(3)})`;
    }
}
