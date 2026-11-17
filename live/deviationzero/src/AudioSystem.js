// AudioSystem : Web Audio procédural. Pad ambient + séquenceur génératif + SFX.
// Aucun fichier audio externe.

export class AudioSystem {
    constructor() {
        this.ctx              = null;
        this.masterGain       = null;
        this._ambientNodes    = [];
        this._enabled         = false;
        this._padFilter       = null;
        this._padOscillators  = [];
        this._currentScale    = [110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63]; // A Dorian par défaut
        this._seqTimer        = null;
        this._nextNoteTime    = 0;
        this._tension         = 0;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.25;
            this.masterGain.connect(this.ctx.destination);
            this._startAmbient();
            this._startSequencer();
            this._enabled = true;
        } catch (_) {
            console.warn('[Audio] Web Audio API unavailable');
        }
    }

    // Change la gamme + l'accord du pad selon le niveau (lvl % 3)
    setMood(levelNum) {
        if (!this._enabled) return;

        let padChord, scale;
        const type = levelNum % 3;

        if (type === 1) {
            // A Dorian
            padChord = [110, 130.81, 164.81, 246.94];
            scale    = [110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63];
        } else if (type === 2) {
            // C Mineur
            padChord = [130.81, 155.56, 196.00, 293.66];
            scale    = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00];
        } else {
            // E Phrygien (sombre)
            padChord = [82.41, 103.83, 123.47, 174.61];
            scale    = [82.41, 87.31, 103.83, 110.00, 123.47, 164.81, 174.61, 207.65, 220.00];
        }

        this._currentScale = scale;

        const now = this.ctx.currentTime;
        for (let i = 0; i < Math.min(padChord.length, this._padOscillators.length); i++) {
            const osc = this._padOscillators[i];
            const targetFreq = padChord[i] + (Math.random() * 0.5 - 0.25);
            // setValueAtTime obligatoire avant ramp (sinon DOMException)
            osc.frequency.setValueAtTime(osc.frequency.value, now);
            osc.frequency.linearRampToValueAtTime(targetFreq, now + 2.0);
        }
    }

    setTension(amount) {
        if (!this._enabled || !this._padFilter) return;

        this._tension = Math.max(0, Math.min(1, amount));

        // Tension haute = filtre plus ouvert (son plus brillant et inquiétant)
        const minFreq = 300;
        const maxFreq = 2500;
        const targetFreq = minFreq + (maxFreq - minFreq) * this._tension;

        const now = this.ctx.currentTime;
        this._padFilter.frequency.setValueAtTime(this._padFilter.frequency.value, now);
        this._padFilter.frequency.linearRampToValueAtTime(targetFreq, now + 0.5);
    }

    playSFX(type) {
        if (!this._enabled || !this.ctx) return;
        switch (type) {
            case 'collect':    this._playCollect();   break;
            case 'emp':        this._playEMP();       break;
            case 'gameover':   this._playGameOver();  break;
            case 'levelwin':   this._playLevelWin();  break;
            case 'safe_enter': this._playSafeEnter(); break;
            case 'laser':      this._playLaser();     break;
            case 'dash':       this._playDash();      break;
        }
    }

    stop() {
        if (this._seqTimer) {
            clearInterval(this._seqTimer);
            this._seqTimer = null;
        }
        this._ambientNodes.forEach(n => {
            try { n.stop && n.stop(); n.disconnect(); } catch (_) {}
        });
        this._ambientNodes = [];
        if (this.ctx) { this.ctx.close(); this.ctx = null; }
        this._enabled = false;
    }

    _startAmbient() {
        const ctx = this.ctx;

        this._padFilter = ctx.createBiquadFilter();
        this._padFilter.type = 'lowpass';
        this._padFilter.frequency.value = 300;
        this._padFilter.Q.value = 1.0;
        this._padFilter.connect(this.masterGain);

        // LFO lent → effet "respiration" sur le volume du pad
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.2;
        lfo.connect(lfoGain.gain);
        lfo.start();

        // Accord de base : A2, C3, E3, B3
        const freqs = [110, 130.81, 164.81, 246.94];

        freqs.forEach(freq => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            // Léger détune pour un effet "wider"
            osc.frequency.value = freq + (Math.random() * 0.5 - 0.25);

            gain.gain.value = 0.05;
            lfoGain.connect(gain.gain);

            osc.connect(gain);
            gain.connect(this._padFilter);
            osc.start();

            this._ambientNodes.push(osc, gain);
            this._padOscillators.push(osc);
        });

        this._ambientNodes.push(this._padFilter, lfo, lfoGain);
    }

    _startSequencer() {
        const ctx = this.ctx;
        this._nextNoteTime = ctx.currentTime + 1.0;

        this._seqTimer = setInterval(() => {
            if (!this.ctx) return;

            // Lookahead scheduler : on planifie les notes 200ms à l'avance
            while (this._nextNoteTime < this.ctx.currentTime + 0.2) {
                this._playSynthNote(this._nextNoteTime);

                const step = 0.5 + Math.random() * 3.0;
                // Plus de tension → notes plus rapprochées
                const tensionSpeedup = this._tension * 1.5;
                this._nextNoteTime += Math.max(0.2, step - tensionSpeedup);
            }
        }, 100);
    }

    _playSynthNote(time) {
        const ctx = this.ctx;
        const scale = this._currentScale;

        const freq = scale[Math.floor(Math.random() * scale.length)];

        const osc    = ctx.createOscillator();
        const gain   = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        if (Math.random() > 0.5) osc.type = 'triangle';

        osc.frequency.setValueAtTime(freq, time);

        // Filtre qui se ferme = note qui s'assombrit dans le temps
        filter.type = 'lowpass';
        const cutoff = 400 + (this._tension * 2000);
        filter.frequency.setValueAtTime(cutoff + 400, time);
        filter.frequency.exponentialRampToValueAtTime(cutoff, time + 2.0);

        // Attaque douce, release très long
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.1 + (this._tension * 0.05), time + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 4.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 4.5);
    }

    _playCollect() {
        const ctx = this.ctx;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    }

    _playEMP() {
        const ctx = this.ctx;
        const sr = ctx.sampleRate;
        const buf = ctx.createBuffer(1, sr * 0.5, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 1200;
        filt.Q.value = 0.5;
        const gain = ctx.createGain();
        gain.gain.value = 0.35;
        src.connect(filt);
        filt.connect(gain);
        gain.connect(this.masterGain);
        src.start();
    }

    _playGameOver() {
        const ctx = this.ctx;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
    }

    _playLevelWin() {
        const ctx = this.ctx;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.4);
        });
    }

    _playLaser() {
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        // Charge montante puis tir descendant
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.45);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.30, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.55);
    }

    _playSafeEnter() {
        const ctx = this.ctx;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 330;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    }

    _playDash() {
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Zap sawtooth descendant
        const zap = ctx.createOscillator();
        const zapGain = ctx.createGain();
        zap.type = 'sawtooth';
        zap.frequency.setValueAtTime(3200, now);
        zap.frequency.exponentialRampToValueAtTime(800, now + 0.06);
        zap.frequency.exponentialRampToValueAtTime(180, now + 0.15);
        zapGain.gain.setValueAtTime(0.18, now);
        zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        zap.connect(zapGain);
        zapGain.connect(this.masterGain);
        zap.start(now);
        zap.stop(now + 0.2);

        // Ping aigu pour la brillance
        const ping = ctx.createOscillator();
        const pingGain = ctx.createGain();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(4800, now);
        ping.frequency.exponentialRampToValueAtTime(1600, now + 0.04);
        pingGain.gain.setValueAtTime(0.10, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        ping.connect(pingGain);
        pingGain.connect(this.masterGain);
        ping.start(now);
        ping.stop(now + 0.1);

        // Crackle (bruit filtré, gates random → effet électrique)
        const sr = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.floor(sr * 0.08), sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const gate = Math.random() > 0.4 ? 1 : 0;
            data[i] = (Math.random() * 2 - 1) * gate * Math.pow(1 - i / data.length, 2);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 3500;
        filt.Q.value = 3;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.22, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        src.connect(filt);
        filt.connect(nGain);
        nGain.connect(this.masterGain);
        src.start(now);
    }
}
