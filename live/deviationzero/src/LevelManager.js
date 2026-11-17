// LevelManager : pilote le cycle de vie d'un niveau (ambiance, entités, HUD, transitions).

import { Ground }          from './Ground.js';
import { Player }          from './Player.js';
import { MimicManager }    from './MimicManager.js';
import { DetectionEngine } from './DetectionEngine.js';
import { Drone }           from './Drone.js';
import { GroundPatrol }    from './GroundPatrol.js?v=2';
import { ObstacleManager } from './ObstacleManager.js';
import { RhythmSystem }    from './RhythmSystem.js';
import { SafeZoneManager } from './SafeZoneManager.js';
import { PowerUpManager }  from './PowerUpManager.js';
import { AudioSystem }     from './AudioSystem.js';
import { IntroCinematic }  from './IntroCinematic.js?v=12';
import { PhysicsFX }       from './PhysicsFX.js?v=12';

const LEVEL_NAMES = [
    'SILICON SANCTUARY',
    'AMBER GRID',
    'PHANTOM ZONE',
    'NEURAL CORE',
    'CRIMSON FORGE',
    'VOID PROTOCOL',
    'CIPHER VAULT',
    'OBSIDIAN NEXUS',
    'SPECTRAL ARRAY',
    'ABYSS GATEWAY',
    'NULLPOINT',
    'TERMINUS',
];

const LEVEL_INTROS = [
    { title: 'INFILTRATION',         desc: 'Imitez la foule. Atteignez la porte EXIT avant la fin du timer.', icon: 'door' },
    { title: 'PORTE SCELLÉE',        desc: 'Collectez 1 power-up pour déverrouiller la sortie. La suspicion résiduelle se reporte au niveau suivant.', icon: 'door' },
    { title: 'RENFORTS DYNAMIQUES',  desc: 'Porte scellée (2 power-ups). À mi-timer, une sentinelle bonus est déployée. Drones terrestres en patrouille.', icon: 'ground-drone' },
    { title: 'SURCHARGE',            desc: 'Porte scellée (3 power-ups). Foule plus rapide, fenêtre rythmique resserrée.', icon: 'door' },
    { title: 'BOUSSOLE BROUILLÉE',   desc: 'La flèche EXIT est hors-ligne. Repérez la porte à vue, dans le brouillard.', icon: 'door' },
    { title: 'TROISIÈME ŒIL',        desc: 'Un drone aérien renforce les patrouilles au sol. Couverture croisée.', icon: 'ground-drone' },
    { title: 'CIPHER VAULT',         desc: 'Power-ups raréfiés, foule erratique. La porte exige toujours 3 collectes.', icon: 'door' },
    { title: 'OBSIDIAN NEXUS',       desc: 'Quatrième sentinelle déployée. Aucune route sûre.', icon: 'ground-drone' },
    { title: 'SPECTRAL ARRAY',       desc: 'Vitesse foule au maximum. BPM critique. Restez sur le beat ou disparaissez.', icon: 'door' },
    { title: 'ABYSS GATEWAY',        desc: 'Saturation de surveillance. Le décor lui-même semble vous chasser.', icon: 'ground-drone' },
];

const LEVEL_CONFIGS = [
    {
        level: 1, name: 'SILICON SANCTUARY',
        mimicCount: 50, mimicSpeed: 5,
        mimicConfig:   { pauseMin: 0.5, pauseMax: 2.0, moveMin: 3, moveMax: 8 },
        mimicVariants: { normal: 0.90, fast: 0.08, stationary: 0.02 },
        droneConfigs:  [{ type: 'aerial', speed: 3.0 }],
        bpm: 80,
        timerSec: 120,
        clear:   [0.02, 0.02, 0.04],
        fog:     [0.02, 0.02, 0.06],
        ambient: [0.05, 0.05, 0.10],
        hemi:    [0.40, 0.60, 0.90],
        grid:    [0.00, 0.90, 0.90],
        accentRGB: '0, 255, 255',
        exitColor: [0.00, 1.00, 0.20],
    },
    {
        level: 2, name: 'AMBER GRID',
        mimicCount: 65, mimicSpeed: 5.5,
        mimicConfig:   { pauseMin: 0.4, pauseMax: 1.6, moveMin: 3, moveMax: 7 },
        mimicVariants: { normal: 0.72, fast: 0.22, stationary: 0.06 },
        droneConfigs:  [{ type: 'aerial', speed: 3.5 }, { type: 'aerial', speed: 3.5 }],
        bpm: 92,
        timerSec: 110,
        clear:   [0.04, 0.02, 0.01],
        fog:     [0.06, 0.02, 0.00],
        ambient: [0.10, 0.05, 0.00],
        hemi:    [0.90, 0.50, 0.20],
        grid:    [1.00, 0.50, 0.00],
        accentRGB: '255, 136, 0',
        exitColor: [1.00, 0.60, 0.00],
    },
    {
        level: 3, name: 'PHANTOM ZONE',
        mimicCount: 80, mimicSpeed: 6.0,
        mimicConfig:   { pauseMin: 0.3, pauseMax: 1.2, moveMin: 2, moveMax: 6 },
        mimicVariants: { normal: 0.60, fast: 0.30, stationary: 0.10 },
        droneConfigs:  [{ type: 'ground', speed: 3.5 }, { type: 'ground', speed: 3.5 }],
        bpm: 104,
        timerSec: 100,
        clear:   [0.02, 0.01, 0.04],
        fog:     [0.04, 0.00, 0.06],
        ambient: [0.08, 0.00, 0.10],
        hemi:    [0.60, 0.30, 0.90],
        grid:    [0.80, 0.00, 1.00],
        accentRGB: '180, 0, 255',
        exitColor: [0.80, 0.00, 1.00],
    },
];

function getConfig(levelNum) {
    if (levelNum <= LEVEL_CONFIGS.length) {
        const cfg = LEVEL_CONFIGS[levelNum - 1];
        return { ...cfg, name: LEVEL_NAMES[levelNum - 1] || cfg.name };
    }

    const extra = levelNum - LEVEL_CONFIGS.length;
    const base  = LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];

    return {
        level:    levelNum,
        name:     LEVEL_NAMES[levelNum - 1] || `SECTOR ${String(levelNum).padStart(2, '0')}`,
        clear:    base.clear, fog: base.fog, ambient: base.ambient,
        hemi:     base.hemi,  grid: base.grid,
        accentRGB: base.accentRGB,
        exitColor: base.exitColor,
        mimicCount:    Math.min(80 + extra * 10, 150),
        mimicSpeed:    Math.min(6.0 + extra * 0.35, 10),
        mimicVariants: {
            normal:     Math.max(0.45, 0.60 - extra * 0.04),
            fast:       Math.min(0.45, 0.30 + extra * 0.03),
            stationary: Math.max(0.05, 0.10 + extra * 0.01),
        },
        mimicConfig: {
            pauseMin: Math.max(0.10, 0.30 - extra * 0.04),
            pauseMax: Math.max(0.50, 1.20 - extra * 0.09),
            moveMin:  Math.max(1.0,  2.00 - extra * 0.15),
            moveMax:  Math.max(2.5,  6.00 - extra * 0.25),
        },
        droneConfigs: [
            { type: 'ground', speed: Math.min(3.5 + extra * 0.3, 8) },
            { type: 'ground', speed: Math.min(3.5 + extra * 0.3, 8) },
            ...(extra >= 2 ? [{ type: 'aerial', speed: Math.min(3.0 + extra * 0.25, 7) }] : []),
            ...(extra >= 4 ? [{ type: 'ground', speed: Math.min(4.0 + extra * 0.25, 8) }] : []),
        ],
        bpm:      Math.min(104 + extra * 4, 148),
        timerSec: Math.max(60, 100 - extra * 4),
    };
}

export class LevelManager {
    constructor(game) {
        this.game            = game;
        this.currentLevel    = 0;
        this.isTransitioning = false;

        this.ground  = null;
        this.player  = null;

        this.mimicManager    = null;
        this.detectionEngine = null;
        this.drones          = [];

        this.obstacleManager = null;
        this.rhythmSystem    = null;
        this.safeZoneManager = null;
        this.powerUpManager  = null;

        this.audioSystem = null;
        this.physicsFX   = null;

        this._exitMeshes         = [];
        this._portalAnimObserver = null;
        this._exitPos            = new BABYLON.Vector3(0, 0, 48);

        this._cameraObserver  = null;
        this._winObserver     = null;
        this._timerObserver   = null;
        this._arrowObserver   = null;
        this._dashHudObserver = null;

        this._gameOverTriggered = false;

        this._levelTimer    = 0;
        this._levelTimerMax = 120;

        this._hudTimer        = document.getElementById('hud-timer-value');
        this._hudArrowIcon    = document.getElementById('hud-exit-arrow-icon');
        this._hudArrowDist    = document.getElementById('hud-exit-dist');
        this._hudPowerup      = document.getElementById('hud-powerup');
        this._hudPowerupName  = document.getElementById('hud-powerup-name');
        this._hudPowerupTimer = document.getElementById('hud-powerup-timer');
        this._powerupActive   = null;

        // Annulés au début de chaque niveau pour éviter les callbacks fantômes
        this._pendingTimeouts = [];

        // Porte verrouillée : N power-ups à ramasser. 0/1/2/3 selon niveau.
        this._powerupsCollected = 0;
        this._exitUnlockReq     = 0;
        this._exitUnlocked      = true;
        this._exitMatRefs       = null;
        this._hudExitLock       = document.getElementById('hud-exit-lock');

        // Reporté du niveau précédent (fraction)
        this._carryoverSuspicion = 0;

        // Sentinelle bonus à mi-timer (niveau >= 3)
        this._waveSpawned  = false;
        this._hudWaveAlert = document.getElementById('hud-wave-alert');

        this._godMode     = false;
        this._timerInfini = false;

        this._introPaused = false;
        // Skip une fois l'overlay d'intro (utile niveau 1 quand la cinématique tourne)
        this._skipNextIntroCard = false;

        this.isPaused   = false;
        this._pauseMenu = document.getElementById('pause-menu');

        this._setupPauseSystem();
    }

    start(opts = {}) {
        this._godMode     = !!opts.godMode;
        this._timerInfini = !!opts.timerInfini;
        const firstLevel  = Number.isFinite(opts.startLevel) && opts.startLevel > 0
            ? opts.startLevel
            : 1;

        this.ground = new Ground(this.game.scene);
        this.player = new Player(this.game.scene, this.game.glowLayer);

        this.audioSystem = new AudioSystem();
        this.audioSystem.init();

        this.physicsFX = new PhysicsFX(this.game.scene, this.game.glowLayer);

        this.game.setGameActive(true);

        // BABYLON.Animation absent dans l'env de test → on saute la cinématique
        const canAnimate = typeof BABYLON !== 'undefined' && BABYLON.Animation && BABYLON.CubicEase;
        const willPlayCinematic = !opts.skipIntro && firstLevel === 1 && canAnimate;
        this._skipNextIntroCard = willPlayCinematic;

        this.startLevel(firstLevel);

        if (willPlayCinematic) {
            this._playIntroCinematic();
        }
    }

    async _playIntroCinematic() {
        this._introPaused = true;

        if (this._cameraObserver) {
            this.game.scene.onBeforeRenderObservable.remove(this._cameraObserver);
            this._cameraObserver = null;
        }

        const wasMovable = this.player ? this.player.canMove : true;
        if (this.player) this.player.canMove = false;

        // Gèle la détection pendant l'intro pour pas que l'idlePenalty grimpe
        const savedGodMode = this.detectionEngine ? this.detectionEngine.godMode : false;
        if (this.detectionEngine) {
            this.detectionEngine.godMode = true;
            this.detectionEngine.suspicion = 0;
        }

        const intro = new IntroCinematic(this.game, this.audioSystem);
        await intro.play();

        this._introPaused = false;
        if (this.player) this.player.canMove = wasMovable;
        if (this.detectionEngine) this.detectionEngine.godMode = savedGodMode;

        this._setupCamera();
    }

    startLevel(levelNum) {
        this._gameOverTriggered = false;

        this._clearPendingTimeouts();
        this._hideAllOverlays();

        this._powerupsCollected = 0;
        this._exitUnlockReq     = Math.min(Math.max(0, levelNum - 1), 3);
        this._exitUnlocked      = (this._exitUnlockReq === 0);
        this._waveSpawned       = false;

        this.currentLevel = levelNum;
        const config = getConfig(levelNum);

        this.game.applyAmbiance(config);
        this.ground.updateColors(config);
        this.player.reset();

        this._disposeLevelEntities();

        this._exitPos = this._pickExitPos();

        // Première sentinelle qui touche déclenche, les suivantes sont ignorées
        const gameOverCb = () => {
            if (this._gameOverTriggered || this.isTransitioning) return;
            if (this._godMode) return;
            this._gameOverTriggered = true;
            this.drones.forEach(d => { d.isGameOver = true; });
            if (this.detectionEngine) this.detectionEngine.isGameOver = true;
            if (this.audioSystem) this.audioSystem.playSFX('gameover');

            if (this.physicsFX) {
                if (this.player) this.player.canMove = false;

                const aerials = this.drones.filter(d => d.mesh && !d.rootMesh);
                const grounds = this.drones.filter(d => d.rootMesh);

                aerials.forEach(d => {
                    this.physicsFX.droneLaserStrike(d.mesh.position, this.player.mesh);
                });
                if (aerials.length > 0 && this.audioSystem) {
                    this.audioSystem.playSFX('laser');
                }
                grounds.forEach(d => {
                    this.physicsFX.toppleSentinel(d.rootMesh);
                });

                // Pas de drone aérien : le joueur s'effondre au lieu d'exploser
                if (aerials.length === 0 && this.player && this.player.mesh) {
                    this.physicsFX.topplePlayer(this.player.mesh);
                }
            }

            this._handleGameOver();
        };

        this.mimicManager = new MimicManager(
            this.game.scene, this.game.glowLayer,
            config.mimicCount, config.mimicSpeed,
            config.mimicConfig, config.mimicVariants || {}
        );

        this.detectionEngine = new DetectionEngine(
            this.game.scene, this.player, this.mimicManager
        );
        this.detectionEngine.godMode = this._godMode;

        if (this._carryoverSuspicion > 0) {
            this.detectionEngine.suspicion = this._carryoverSuspicion;
            this._carryoverSuspicion = 0;
        }

        this.drones = config.droneConfigs.map(dc =>
            dc.type === 'aerial'
                ? new Drone(this.game.scene, this.player, this.detectionEngine, dc, gameOverCb)
                : new GroundPatrol(this.game.scene, this.player, this.detectionEngine, dc, gameOverCb)
        );

        this.obstacleManager = new ObstacleManager(this.game.scene, this.game.glowLayer);
        this.obstacleManager.generate(config, this._exitPos);
        this.player.obstacleManager = this.obstacleManager;

        if (this.physicsFX) {
            const [er, eg, eb] = config.exitColor || [0, 1, 1];
            this.physicsFX.spawnAmbientDebris(new BABYLON.Color3(er, eg, eb));
        }

        this.rhythmSystem = new RhythmSystem(config.bpm || 80);
        this.rhythmSystem.attach(this.game.scene);
        this.detectionEngine.rhythmSystem = this.rhythmSystem;

        this.rhythmSystem.onBeat = () => {
            if (this.obstacleManager) this.obstacleManager.pulse();
        };

        this.safeZoneManager = new SafeZoneManager(this.game.scene, this.game.glowLayer);
        this.safeZoneManager.generate(config, this._exitPos);
        this.detectionEngine.safeZoneManager = this.safeZoneManager;

        this.powerUpManager = new PowerUpManager(
            this.game.scene, this.game.glowLayer,
            (type) => this._handlePowerUp(type)
        );
        this.powerUpManager.generate(config, this._exitPos, this.player);

        if (this.audioSystem) {
            this.audioSystem.setTension(0);
            this.audioSystem.setMood(levelNum);
        }

        this._levelTimerMax = config.timerSec || 120;
        this._levelTimer    = this._levelTimerMax;
        this._setupLevelTimer();

        this._createExitDoor(config);

        this._updateHUD(config);
        this._setupCamera();
        this._setupWinCheck();
        this._setupDirectionArrow();

        this.player.onDash = () => {
            if (this.audioSystem) this.audioSystem.playSFX('dash');
        };
        this._setupDashHUD();

        this._updateExitLockHUD();

        if (this._skipNextIntroCard) {
            this._skipNextIntroCard = false;
        } else {
            this._showLevelIntro(levelNum);
        }
    }

    _showLevelIntro(levelNum) {
        const overlay = document.getElementById('level-intro');
        const title   = document.getElementById('level-intro-title');
        const desc    = document.getElementById('level-intro-desc');
        const icon    = document.getElementById('level-intro-icon');
        const numEl   = document.getElementById('level-intro-num');
        const nameEl  = document.getElementById('level-intro-name');

        if (!overlay || !title || !desc || !icon) return;

        const config = getConfig(levelNum);
        const intro  = LEVEL_INTROS[levelNum - 1] || {
            title: 'SECTEUR INCONNU',
            desc:  'Toutes les unités de sécurité sont actives. Survivez.',
            icon:  'door',
        };

        if (numEl)  numEl.textContent  = `LVL ${String(levelNum).padStart(2, '0')}`;
        if (nameEl) nameEl.textContent = config.name || '';

        title.textContent = intro.title;
        desc.textContent  = intro.desc;
        icon.innerHTML    = intro.icon === 'ground-drone'
            ? '<div class="icon-ground-drone"></div>'
            : '<div class="icon-door"></div>';

        overlay.classList.remove('hidden');
        this.isPaused = true;
        this.game.pause();

        const timeoutId = setTimeout(() => {
            overlay.classList.add('hidden');
            if (this.isPaused) {
                const pauseMenu = document.getElementById('pause-menu');
                if (!pauseMenu || !pauseMenu.classList.contains('visible')) {
                    this.isPaused = false;
                    this.game.resume();
                }
            }
        }, 5000);

        this._pendingTimeouts.push(timeoutId);
    }

    _disposeLevelEntities() {
        const removeObs = (obs) => {
            if (obs) this.game.scene.onBeforeRenderObservable.remove(obs);
            return null;
        };

        this._winObserver        = removeObs(this._winObserver);
        this._portalAnimObserver = removeObs(this._portalAnimObserver);
        this._timerObserver      = removeObs(this._timerObserver);
        this._arrowObserver      = removeObs(this._arrowObserver);
        this._dashHudObserver    = removeObs(this._dashHudObserver);

        // Havok à libérer avant les meshes qui le possèdent
        if (this.physicsFX) this.physicsFX.dispose();

        if (this.detectionEngine) { this.detectionEngine.dispose(); this.detectionEngine = null; }
        if (this.mimicManager)    { this.mimicManager.dispose();    this.mimicManager    = null; }
        this.drones.forEach(d => d.dispose());
        this.drones = [];

        if (this.obstacleManager) { this.obstacleManager.dispose(); this.obstacleManager = null; }
        if (this.rhythmSystem)    { this.rhythmSystem.dispose();    this.rhythmSystem    = null; }
        if (this.safeZoneManager) { this.safeZoneManager.dispose(); this.safeZoneManager = null; }
        if (this.powerUpManager)  { this.powerUpManager.dispose();  this.powerUpManager  = null; }

        this._exitMeshes.forEach(m => { try { m.dispose(); } catch (_) {} });
        this._exitMeshes = [];

        this._clearPowerupHUD();
    }

    _pickExitPos() {
        const edge = (this.currentLevel === 1) ? 0 : Math.floor(Math.random() * 4);
        const t    = (Math.random() - 0.5) * 56;
        switch (edge) {
            case 0: return new BABYLON.Vector3( t,  0,  46);
            case 1: return new BABYLON.Vector3( t,  0, -46);
            case 2: return new BABYLON.Vector3( 46, 0,  t);
            default:return new BABYLON.Vector3(-46, 0,  t);
        }
    }

    _createExitDoor(config) {
        const [er, eg, eb] = config.exitColor;
        const exitColor    = new BABYLON.Color3(er, eg, eb);
        const lockedColor  = new BABYLON.Color3(1.0, 0.15, 0.25);
        const startColor   = this._exitUnlocked ? exitColor : lockedColor;
        const pos          = this._exitPos;

        const pillarMat = new BABYLON.StandardMaterial('exitPillarMat', this.game.scene);
        pillarMat.diffuseColor  = new BABYLON.Color3(0.08, 0.08, 0.12);
        pillarMat.emissiveColor = startColor.scale(0.25);
        pillarMat.specularPower = 64;

        const makePillar = (x) => {
            const p = BABYLON.MeshBuilder.CreateBox('exitPillar', {
                width: 0.6, height: 5.0, depth: 0.6
            }, this.game.scene);
            p.position.set(x + pos.x, 2.5, pos.z);
            p.material = pillarMat;
            this.game.glowLayer.addIncludedOnlyMesh(p);
            this._exitMeshes.push(p);
        };
        makePillar(-3.3);
        makePillar( 3.3);

        const lintel = BABYLON.MeshBuilder.CreateBox('exitLintel', {
            width: 7.2, height: 0.5, depth: 0.6
        }, this.game.scene);
        lintel.position.set(pos.x, 5.25, pos.z);
        lintel.material = pillarMat;
        this.game.glowLayer.addIncludedOnlyMesh(lintel);
        this._exitMeshes.push(lintel);

        const portal = BABYLON.MeshBuilder.CreatePlane('exitPortal', {
            width: 6.6, height: 5.0
        }, this.game.scene);
        portal.position.set(pos.x, 2.5, pos.z + 0.05);

        const portalMat = new BABYLON.StandardMaterial('exitPortalMat', this.game.scene);
        portalMat.emissiveColor   = startColor;
        portalMat.alpha           = 0.3;
        portalMat.disableLighting = true;
        portalMat.backFaceCulling = false;
        portal.material = portalMat;
        this.game.glowLayer.addIncludedOnlyMesh(portal);
        this._exitMeshes.push(portal);

        const orbMats = [];
        const makeOrb = (x) => {
            const orb = BABYLON.MeshBuilder.CreateSphere('exitOrb', {
                diameter: 0.7, segments: 8
            }, this.game.scene);
            orb.position.set(x + pos.x, 5.65, pos.z);
            const orbMat = new BABYLON.StandardMaterial('exitOrbMat', this.game.scene);
            orbMat.emissiveColor   = startColor;
            orbMat.disableLighting = true;
            orb.material = orbMat;
            this.game.glowLayer.addIncludedOnlyMesh(orb);
            this._exitMeshes.push(orb);
            orbMats.push(orbMat);
        };
        makeOrb(-3.3);
        makeOrb( 3.3);

        this._exitMatRefs = { pillarMat, portalMat, orbMats, exitColor, lockedColor };

        let t = 0;
        this._portalAnimObserver = this.game.scene.onBeforeRenderObservable.add(() => {
            t += this.game.scene.getEngine().getDeltaTime() / 1000;
            const baseAlpha = this._exitUnlocked ? 0.22 : 0.30;
            const ampAlpha  = this._exitUnlocked ? 0.10 : 0.18;
            const speed     = this._exitUnlocked ? 2.2  : 4.5;
            portalMat.alpha = baseAlpha + Math.sin(t * speed) * ampAlpha;
        });
    }

    _updateExitLock() {
        if (this._exitUnlocked) return;
        if (this._powerupsCollected < this._exitUnlockReq) return;

        this._exitUnlocked = true;

        if (this._exitMatRefs) {
            const { pillarMat, portalMat, orbMats, exitColor } = this._exitMatRefs;
            if (pillarMat) pillarMat.emissiveColor = exitColor.scale(0.25);
            if (portalMat) portalMat.emissiveColor = exitColor;
            orbMats.forEach(m => { m.emissiveColor = exitColor; });
        }

        if (this.audioSystem) this.audioSystem.playSFX('collect');

        this._updateExitLockHUD();
    }

    _updateExitLockHUD() {
        if (!this._hudExitLock) return;
        if (this._exitUnlockReq === 0) {
            this._hudExitLock.classList.add('hud-hidden');
            return;
        }
        this._hudExitLock.classList.remove('hud-hidden');
        if (this._exitUnlocked) {
            this._hudExitLock.textContent = 'PORTE OUVERTE';
            this._hudExitLock.classList.add('unlocked');
        } else {
            this._hudExitLock.textContent =
                `VERROUILLÉE ${this._powerupsCollected}/${this._exitUnlockReq}`;
            this._hudExitLock.classList.remove('unlocked');
        }
    }

    _setupLevelTimer() {
        this._timerObserver = this.game.scene.onBeforeRenderObservable.add(() => {
            if (this._gameOverTriggered || this.isTransitioning || this._introPaused) return;

            if (this._timerInfini) {
                this._renderTimerHUD();
                return;
            }

            const dt = this.game.scene.getEngine().getDeltaTime() / 1000;
            this._levelTimer -= dt;
            if (this._levelTimer < 0) this._levelTimer = 0;

            this._renderTimerHUD();

            if (this.audioSystem) {
                this.audioSystem.setTension(this.detectionEngine.suspicion / 100);
            }

            // Mode jury : pas de game over forcé même quand le timer expire
            if (this._levelTimer <= 0 && this.detectionEngine
                && !this._gameOverTriggered && !this._godMode) {
                this.detectionEngine.suspicion = 100;
            }

            if (!this._waveSpawned && this.currentLevel >= 3
                && this._levelTimer <= this._levelTimerMax / 2) {
                this._spawnReinforcement();
                this._waveSpawned = true;
            }
        });
    }

    _spawnReinforcement() {
        if (!this.detectionEngine) return;

        const gameOverCb = () => {
            if (this._gameOverTriggered || this.isTransitioning) return;
            if (this._godMode) return;
            this._gameOverTriggered = true;
            this.drones.forEach(d => { d.isGameOver = true; });
            if (this.detectionEngine) this.detectionEngine.isGameOver = true;
            if (this.audioSystem) this.audioSystem.playSFX('gameover');

            if (this.physicsFX) {
                if (this.player) this.player.canMove = false;
                const aerials = this.drones.filter(d => d.mesh && !d.rootMesh);
                const grounds = this.drones.filter(d => d.rootMesh);
                aerials.forEach(d => {
                    this.physicsFX.droneLaserStrike(d.mesh.position, this.player.mesh);
                });
                if (aerials.length > 0 && this.audioSystem) {
                    this.audioSystem.playSFX('laser');
                }
                grounds.forEach(d => {
                    this.physicsFX.toppleSentinel(d.rootMesh);
                });
                if (aerials.length === 0 && this.player && this.player.mesh) {
                    this.physicsFX.topplePlayer(this.player.mesh);
                }
            }
            this._handleGameOver();
        };

        const useAerial = (this.currentLevel % 2 === 1);
        const speed     = Math.min(4.0 + this.currentLevel * 0.25, 8);
        const cfg       = { type: useAerial ? 'aerial' : 'ground', speed };

        const extra = useAerial
            ? new Drone(this.game.scene, this.player, this.detectionEngine, cfg, gameOverCb)
            : new GroundPatrol(this.game.scene, this.player, this.detectionEngine, cfg, gameOverCb);

        this.drones.push(extra);

        if (this.audioSystem) this.audioSystem.playSFX('emp');
        this._showWaveAlert();
    }

    _showWaveAlert() {
        if (!this._hudWaveAlert) return;
        this._hudWaveAlert.textContent = 'ALERTE — RENFORTS DÉPLOYÉS';
        this._hudWaveAlert.classList.remove('hud-hidden');
        // Relance l'animation CSS
        this._hudWaveAlert.style.animation = 'none';
        void this._hudWaveAlert.offsetWidth;
        this._hudWaveAlert.style.animation = '';

        const t = setTimeout(() => {
            if (this._hudWaveAlert) this._hudWaveAlert.classList.add('hud-hidden');
        }, 2800);
        this._pendingTimeouts.push(t);
    }

    _renderTimerHUD() {
        if (!this._hudTimer) return;
        if (this._timerInfini) {
            this._hudTimer.textContent = '∞';
            this._hudTimer.style.color = '#ffcc00';
            return;
        }
        const s   = Math.ceil(this._levelTimer);
        const mm  = String(Math.floor(s / 60)).padStart(2, '0');
        const ss  = String(s % 60).padStart(2, '0');
        this._hudTimer.textContent = `${mm}:${ss}`;
        this._hudTimer.style.color = s <= 15 ? '#ff2244' : s <= 30 ? '#ff8800' : '';
    }

    _setupDirectionArrow() {
        const arrowContainer = document.getElementById('hud-exit-arrow');
        if (this.currentLevel >= 5) {
            if (arrowContainer) arrowContainer.classList.add('hud-hidden');
            return;
        }
        if (arrowContainer) arrowContainer.classList.remove('hud-hidden');

        this._arrowObserver = this.game.scene.onBeforeRenderObservable.add(() => {
            if (!this.player || !this.player.mesh) return;
            const px = this.player.mesh.position.x;
            const pz = this.player.mesh.position.z;
            const ex = this._exitPos.x;
            const ez = this._exitPos.z;
            const dx = ex - px;
            const dz = ez - pz;

            // Caméra tournée de -90° (alpha = -π/2)
            const angleDeg = Math.atan2(dx, dz) * (180 / Math.PI);
            const dist     = Math.round(Math.sqrt(dx * dx + dz * dz));

            if (this._hudArrowIcon) this._hudArrowIcon.style.transform = `rotate(${angleDeg}deg)`;
            if (this._hudArrowDist) this._hudArrowDist.textContent = `${dist}u`;
        });
    }

    _setupDashHUD() {
        const container = document.getElementById('hud-dash');
        const ring      = document.getElementById('hud-dash-ring');
        const label     = document.getElementById('hud-dash-label');
        if (!container || !ring || !label) return;

        const circumference = 2 * Math.PI * 18;
        ring.style.strokeDasharray = circumference;

        this._dashHudObserver = this.game.scene.onBeforeRenderObservable.add(() => {
            if (!this.player) return;

            const progress = this.player.getDashCooldownProgress();
            const ready    = this.player.isDashReady();

            ring.style.strokeDashoffset = circumference * (1 - progress);

            if (ready) {
                container.classList.add('dash-ready');
                container.classList.remove('dash-cooldown');
                label.textContent = 'DASH';
            } else {
                container.classList.remove('dash-ready');
                container.classList.add('dash-cooldown');
                const secs = Math.ceil(this.player._dashCooldownLeft);
                label.textContent = `${secs}s`;
            }
        });
    }

    _handlePowerUp(type) {
        if (this.audioSystem) this.audioSystem.playSFX('collect');

        this._powerupsCollected += 1;
        this._updateExitLock();
        this._updateExitLockHUD();

        const sparkColor = type === 'sync'  ? [0, 1, 1]
                        : type === 'burst' ? [1, 0.8, 0]
                        : type === 'emp'   ? [0.8, 0, 1]
                        : [1, 1, 1];
        if (this.physicsFX && this.player && this.player.mesh) {
            this.physicsFX.collectSpark(this.player.mesh.position, sparkColor);
        }

        switch (type) {
            case 'sync':
                if (this.detectionEngine)
                    this.detectionEngine.suspicion = Math.max(0, this.detectionEngine.suspicion - 35);
                this._showPowerupHUD('SYNC', '#00ffff', 0);
                break;

            case 'burst':
                this.player.applySpeedBoost(4);
                this._showPowerupHUD('BURST', '#ffcc00', 4);
                break;

            case 'emp':
                this._applyEMP(5);
                if (this.audioSystem) this.audioSystem.playSFX('emp');
                if (this.physicsFX && this.player && this.player.mesh) {
                    this.physicsFX.empBurst(this.player.mesh.position);
                }
                this._showPowerupHUD('EMP', '#cc00ff', 5);
                break;
        }
    }

    _applyEMP(duration) {
        this.drones.forEach(d => {
            d._empFrozen = true;
            setTimeout(() => { if (d) d._empFrozen = false; }, duration * 1000);
        });
    }

    _showPowerupHUD(name, color, duration) {
        if (!this._hudPowerup) return;
        if (this._hudPowerupName) this._hudPowerupName.textContent = name;
        if (this._hudPowerupName) this._hudPowerupName.style.color = color;
        this._hudPowerup.classList.remove('hud-hidden');

        if (duration > 0) {
            this._powerupActive = { remaining: duration };
            const tick = setInterval(() => {
                if (!this._powerupActive) { clearInterval(tick); return; }
                this._powerupActive.remaining -= 0.1;
                if (this._hudPowerupTimer)
                    this._hudPowerupTimer.textContent = `${Math.ceil(this._powerupActive.remaining)}s`;
                if (this._powerupActive.remaining <= 0) {
                    clearInterval(tick);
                    this._clearPowerupHUD();
                }
            }, 100);
        } else {
            if (this._hudPowerupTimer) this._hudPowerupTimer.textContent = '';
            setTimeout(() => this._clearPowerupHUD(), 1200);
        }
    }

    _clearPowerupHUD() {
        this._powerupActive = null;
        if (this._hudPowerup) this._hudPowerup.classList.add('hud-hidden');
    }

    _setupCamera() {
        if (this._cameraObserver) {
            this.game.scene.onBeforeRenderObservable.remove(this._cameraObserver);
        }
        this._cameraObserver = this.game.scene.onBeforeRenderObservable.add(() => {
            if (this.player && this.player.mesh) {
                this.game.camera.target = this.player.mesh.position.clone();
            }
        });
    }

    _setupWinCheck() {
        const exitRadius = 5;
        let triggered    = false;

        this._winObserver = this.game.scene.onBeforeRenderObservable.add(() => {
            if (triggered || this.isTransitioning) return;
            if (!this.detectionEngine || this.detectionEngine.isGameOver) return;
            if (!this._exitUnlocked) return;

            const distSq = BABYLON.Vector3.DistanceSquared(
                this.player.mesh.position, this._exitPos
            );
            if (distSq < exitRadius * exitRadius) {
                triggered = true;
                this.player.canMove = false;
                this.drones.forEach(d => { d.isGameOver = true; });
                this.detectionEngine.isGameOver = true;
                this.player.mesh.material.emissiveColor = new BABYLON.Color3(0, 1, 0);
                if (this.audioSystem) this.audioSystem.playSFX('levelwin');

                if (this.physicsFX) {
                    const cfg = getConfig(this.currentLevel);
                    const [er, eg, eb] = cfg.exitColor || [0, 1, 0];
                    this.physicsFX.exitConfetti(this._exitPos, new BABYLON.Color3(er, eg, eb));
                }

                this._triggerLevelTransition();
            }
        });
    }

    _triggerLevelTransition() {
        this.isTransitioning = true;
        const nextLevel  = this.currentLevel + 1;
        const nextConfig = getConfig(nextLevel);

        // Snapshot avant disposal pour que la valeur survive
        const finalSusp = (this.detectionEngine && this.detectionEngine.suspicion) || 0;
        this._carryoverSuspicion = Math.min(finalSusp * 0.4, 50);

        const overlay  = document.getElementById('level-transition');
        const numEl    = document.getElementById('transition-level-num');
        const nameEl   = document.getElementById('transition-level-name');
        const accentEl = document.getElementById('transition-accent-line');

        if (numEl)    numEl.textContent  = `LEVEL ${nextLevel}`;
        if (nameEl)   nameEl.textContent = nextConfig.name;
        if (accentEl) accentEl.style.borderColor = `rgb(${nextConfig.accentRGB})`;
        if (overlay)  overlay.classList.add('visible');

        const t1 = setTimeout(() => {
            if (overlay) overlay.classList.remove('visible');
            const t2 = setTimeout(() => {
                this.isTransitioning = false;
                this.startLevel(nextLevel);
            }, 700);
            this._pendingTimeouts.push(t2);
        }, 2600);
        this._pendingTimeouts.push(t1);
    }

    _handleGameOver() {
        this.game.setGameActive(false);

        const gameOverDiv = document.getElementById('game-over');
        if (gameOverDiv) gameOverDiv.classList.add('visible');

        const t = setTimeout(() => {
            if (!this._gameOverTriggered) return;
            this._showScoreEntry();
        }, 3200);
        this._pendingTimeouts.push(t);
    }

    _showScoreEntry() {
        const gameOverDiv   = document.getElementById('game-over');
        const scoreEntryDiv = document.getElementById('score-entry');
        const levelReached  = document.getElementById('score-level-reached');

        if (gameOverDiv)   gameOverDiv.classList.remove('visible');
        if (levelReached)  levelReached.textContent = `NIVEAU ${this.currentLevel} ATTEINT`;
        if (scoreEntryDiv) scoreEntryDiv.classList.add('visible');

        window.__DZ_LEVEL__ = this.currentLevel;
        window.__DZ_LM__    = this;
    }

    async saveScore(name) {
        const trimmed = (name || '').trim().substring(0, 20) || 'ANONYMOUS';
        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed, level: this.currentLevel })
            });
        } catch (error) {
            console.error('Failed to save score:', error);
        }
    }

    async showLeaderboard() {
        const scoreEntry  = document.getElementById('score-entry');
        const leaderboard = document.getElementById('leaderboard');
        const list        = document.getElementById('lb-list');

        if (scoreEntry) scoreEntry.classList.remove('visible');
        if (!leaderboard) return;

        if (list) {
            list.innerHTML = '<li class="lb-empty">Chargement...</li>';
        }
        leaderboard.classList.add('visible');

        try {
            const response = await fetch('/api/scores');
            if (!response.ok) throw new Error('Network response was not ok');
            const scores = await response.json();

            if (list) {
                list.innerHTML = scores.length === 0
                    ? '<li class="lb-empty">Aucun score enregistré</li>'
                    : scores.map((s, i) =>
                        `<li class="lb-row">
                            <span class="lb-rank">#${i + 1}</span>
                            <span class="lb-name">${s.name}</span>
                            <span class="lb-level">LVL ${s.level}</span>
                        </li>`
                    ).join('');
            }
        } catch (error) {
            console.error('Failed to fetch scores:', error);
            if (list) {
                list.innerHTML = '<li class="lb-empty">Erreur de chargement des scores</li>';
            }
        }
    }

    _updateHUD(config) {
        const el = document.getElementById('hud-level');
        if (el) {
            el.textContent      = `LVL ${this.currentLevel}`;
            el.style.color      = `rgb(${config.accentRGB})`;
            el.style.textShadow = `0 0 8px rgba(${config.accentRGB}, 0.6)`;
        }
        document.documentElement.style.setProperty('--accent-rgb', config.accentRGB);

        if (this._hudTimer) this._hudTimer.style.color = '';

        const bpmEl = document.getElementById('hud-beat-bpm');
        if (bpmEl) bpmEl.textContent = `${config.bpm || 80} BPM`;
    }

    _clearPendingTimeouts() {
        for (const id of this._pendingTimeouts) {
            clearTimeout(id);
        }
        this._pendingTimeouts = [];
    }

    _hideAllOverlays() {
        const ids = ['game-over', 'score-entry', 'leaderboard', 'level-transition', 'pause-menu'];
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el) el.classList.remove('visible');
        }
    }

    _setupPauseSystem() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this._introPaused || this.isTransitioning || this._gameOverTriggered) return;
                if (this.currentLevel === 0) return;
                this.togglePause();
            }
        });

        const btnResume  = document.getElementById('btn-resume');
        const btnRestart = document.getElementById('btn-restart');
        const btnQuit    = document.getElementById('btn-quit');

        if (btnResume) {
            btnResume.addEventListener('click', () => {
                if (this.isPaused) this.togglePause();
            });
        }
        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                if (this.isPaused) {
                    this.togglePause();
                    sessionStorage.setItem('dz_quick_start', '1');
                    location.reload();
                }
            });
        }
        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.game.pause();
            if (this._pauseMenu) this._pauseMenu.classList.add('visible');
        } else {
            this.game.resume();
            if (this._pauseMenu) this._pauseMenu.classList.remove('visible');
        }
    }
}
