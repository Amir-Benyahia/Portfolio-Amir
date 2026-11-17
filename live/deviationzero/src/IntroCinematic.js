// IntroCinematic : joue une fois au démarrage du niveau 1.
// Caméra balaie depuis vue overhead vers gameplay + overlay 3 phases + sweep audio.
// Skippable via ESPACE / ENTRÉE / ESC / clic.

export class IntroCinematic {
    constructor(game, audioSystem) {
        this.game = game;
        this.audioSystem = audioSystem;

        this._overlay      = null;
        this._skipHandler  = null;
        this._clickHandler = null;
        this._timeouts     = [];
        this._finished     = false;
        this._resolve      = null;
        this._sweepOsc     = null;
    }

    play() {
        return new Promise((resolve) => {
            this._resolve = resolve;
            this._buildOverlay();
            this._unlockCamera();
            this._setIntroCameraStart();
            this._animateCamera();
            this._scheduleTexts();
            this._bindSkip();
            this._playAudioSweep();
        });
    }

    _buildOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'intro-overlay';
        overlay.innerHTML = `
            <div class="intro-scanlines"></div>
            <div class="intro-vignette"></div>
            <div class="intro-corner tl"></div>
            <div class="intro-corner tr"></div>
            <div class="intro-corner bl"></div>
            <div class="intro-corner br"></div>
            <div class="intro-frame">
                <div class="intro-boot">
                    <span class="intro-boot-dot"></span>
                    <span class="intro-boot-label" id="intro-boot-label">INITIALISATION PROTOCOLE</span>
                </div>
                <div class="intro-text-stack">
                    <div class="intro-line intro-line-small" id="intro-line-1">2089</div>
                    <div class="intro-line intro-line-big" id="intro-line-2" data-text="SILICON SANCTUARY">SILICON SANCTUARY</div>
                    <div class="intro-line intro-line-sub" id="intro-line-3">CONNEXION AU RÉSEAU LOCAL...</div>
                </div>
                <div class="intro-meta">
                    <span class="intro-meta-cell">CIBLE :: HUMAN_001</span>
                    <span class="intro-meta-sep">//</span>
                    <span class="intro-meta-cell">STATUT :: INFILTRÉ</span>
                </div>
            </div>
            <div class="intro-skip">[ ESPACE / CLIC POUR PASSER ]</div>
        `;
        document.body.appendChild(overlay);
        this._overlay = overlay;
        requestAnimationFrame(() => overlay.classList.add('visible'));
    }

    _unlockCamera() {
        const cam = this.game.camera;
        this._savedLimits = {
            lowerBeta: cam.lowerBetaLimit, upperBeta: cam.upperBetaLimit,
            lowerAlpha: cam.lowerAlphaLimit, upperAlpha: cam.upperAlphaLimit,
            lowerRadius: cam.lowerRadiusLimit, upperRadius: cam.upperRadiusLimit,
        };
        cam.lowerBetaLimit   = null;
        cam.upperBetaLimit   = null;
        cam.lowerAlphaLimit  = null;
        cam.upperAlphaLimit  = null;
        cam.lowerRadiusLimit = null;
        cam.upperRadiusLimit = null;
    }

    _setIntroCameraStart() {
        const cam = this.game.camera;
        cam.alpha  = -Math.PI / 2 - Math.PI * 1.2;
        cam.beta   = 0.18;
        cam.radius = 90;
        cam.target = new BABYLON.Vector3(0, 5, 0);
    }

    _animateCamera() {
        const cam = this.game.camera;
        const fps = 60;
        const totalFrames = fps * 6.2;

        const ease = new BABYLON.CubicEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

        const fromAlpha  = cam.alpha;
        const fromBeta   = cam.beta;
        const fromRadius = cam.radius;
        const toAlpha    = -Math.PI / 2;
        const toBeta     = Math.PI / 3.5;
        const toRadius   = 35;

        const animations = [
            this._makeAnim('intro_alpha',  'alpha',  fromAlpha,  toAlpha,  totalFrames, fps, ease),
            this._makeAnim('intro_beta',   'beta',   fromBeta,   toBeta,   totalFrames, fps, ease),
            this._makeAnim('intro_radius', 'radius', fromRadius, toRadius, totalFrames, fps, ease),
        ];

        cam.animations = animations;
        this.game.scene.beginAnimation(cam, 0, totalFrames, false, 1, () => {
            this._finish();
        });
    }

    _makeAnim(name, prop, from, to, totalFrames, fps, ease) {
        const anim = new BABYLON.Animation(
            name, prop, fps,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        anim.setKeys([
            { frame: 0, value: from },
            { frame: totalFrames, value: to },
        ]);
        anim.setEasingFunction(ease);
        return anim;
    }

    _scheduleTexts() {
        const line1 = this._overlay.querySelector('#intro-line-1');
        const line2 = this._overlay.querySelector('#intro-line-2');
        const line3 = this._overlay.querySelector('#intro-line-3');
        const boot  = this._overlay.querySelector('#intro-boot-label');

        // Phase 1 — boot
        this._glitch(line2);

        // Phase 2 (t = 2.3s) — menace
        this._timeouts.push(setTimeout(() => {
            if (boot) boot.textContent = 'SCAN BIOMÉTRIQUE';
            this._swap(line1, 'ROUTINES ANTIVIRUS ACTIVES');
            this._swap(line2, 'IMITER OU DISPARAÎTRE');
            this._swap(line3, 'DÉVIATION DÉTECTÉE = LIQUIDATION');
            this._glitch(line2);
        }, 2300));

        // Phase 3 (t = 4.4s) — mission
        this._timeouts.push(setTimeout(() => {
            if (boot) boot.textContent = 'DÉMARRAGE INFILTRATION';
            this._swap(line1, 'PROTOCOLE');
            this._swap(line2, 'DEVIATION ZERO');
            this._swap(line3, 'BONNE CHANCE, HUMAIN.');
            this._glitch(line2);
        }, 4400));
    }

    _swap(el, text) {
        if (!el) return;
        el.classList.add('intro-fade-out');
        const t = setTimeout(() => {
            el.textContent = text;
            el.setAttribute('data-text', text);
            el.classList.remove('intro-fade-out');
            el.classList.add('intro-fade-in');
            const t2 = setTimeout(() => el.classList.remove('intro-fade-in'), 350);
            this._timeouts.push(t2);
        }, 180);
        this._timeouts.push(t);
    }

    _glitch(el) {
        if (!el) return;
        el.classList.remove('intro-glitch');
        void el.offsetWidth; // relance l'anim CSS
        el.classList.add('intro-glitch');
        const t = setTimeout(() => {
            if (el) el.classList.remove('intro-glitch');
        }, 700);
        this._timeouts.push(t);
    }

    _playAudioSweep() {
        if (!this.audioSystem || !this.audioSystem.ctx || !this.audioSystem.masterGain) return;
        const ctx = this.audioSystem.ctx;
        const now = ctx.currentTime;

        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 5.8);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.9);

        osc.connect(gain);
        gain.connect(this.audioSystem.masterGain);
        osc.start(now);
        osc.stop(now + 6.0);
        this._sweepOsc = osc;
    }

    _bindSkip() {
        this._skipHandler = (e) => {
            if (e.code !== 'Space' && e.code !== 'Escape' && e.code !== 'Enter') return;
            e.preventDefault();
            this._finish();
        };
        this._clickHandler = () => this._finish();
        window.addEventListener('keydown', this._skipHandler);
        if (this._overlay) this._overlay.addEventListener('click', this._clickHandler);
    }

    _unbindSkip() {
        if (this._skipHandler) {
            window.removeEventListener('keydown', this._skipHandler);
            this._skipHandler = null;
        }
        if (this._overlay && this._clickHandler) {
            this._overlay.removeEventListener('click', this._clickHandler);
        }
        this._clickHandler = null;
    }

    _finish() {
        if (this._finished) return;
        this._finished = true;

        this._timeouts.forEach(id => clearTimeout(id));
        this._timeouts = [];

        if (this.game.scene && this.game.camera) {
            this.game.scene.stopAnimation(this.game.camera);
            const cam = this.game.camera;
            cam.alpha  = -Math.PI / 2;
            cam.beta   = Math.PI / 3.5;
            cam.radius = 35;
            cam.animations = [];

            // Re-lock sur les valeurs gameplay
            cam.lowerBetaLimit   = cam.beta;
            cam.upperBetaLimit   = cam.beta;
            cam.lowerAlphaLimit  = cam.alpha;
            cam.upperAlphaLimit  = cam.alpha;
            cam.lowerRadiusLimit = 25;
            cam.upperRadiusLimit = 50;
        }

        if (this._sweepOsc) {
            try { this._sweepOsc.stop(); } catch (_) {}
            this._sweepOsc = null;
        }

        this._unbindSkip();

        if (this._overlay) {
            this._overlay.classList.remove('visible');
            this._overlay.classList.add('fading');
            const node = this._overlay;
            this._overlay = null;
            setTimeout(() => {
                if (node && node.parentNode) node.parentNode.removeChild(node);
            }, 700);
        }

        if (this._resolve) {
            const r = this._resolve;
            this._resolve = null;
            r();
        }
    }
}
