// Game : moteur Babylon (engine, scene, camera, lights, glow layer, physique).

export class Game {
    constructor(canvas) {
        this.canvas = canvas;

        this.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });

        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor   = new BABYLON.Color4(0.02, 0.02, 0.04, 1);
        this.scene.ambientColor = new BABYLON.Color3(0.05, 0.05, 0.1);

        this.scene.fogMode    = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.008;
        this.scene.fogColor   = new BABYLON.Color3(0.02, 0.02, 0.06);

        this._setupCamera();
        this._setupLights();
        this._setupGlow();

        // try/catch dans la render loop : un throw stoppe sinon Babylon en silence
        this._renderLoopFn = () => {
            try {
                this.scene.render();
            } catch (err) {
                console.error('[Deviation Zero] Render loop error:', err);
            }
        };
        this.resume();

        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Si le contexte WebGL crashe, Babylon stoppe le rendu en silence
        canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[Deviation Zero] WebGL context lost — attempting restore…');
        });
        canvas.addEventListener('webglcontextrestored', () => {
            console.log('[Deviation Zero] WebGL context restored ✓');
        });

        // Bloque le reload accidentel pendant une partie (Live Server VS Code spammait)
        this._gameActive = false;
        window.addEventListener('beforeunload', (e) => {
            if (this._gameActive) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        this.physicsReady  = false;
        this.physicsPlugin = null;
    }

    setGameActive(active) {
        this._gameActive = active;
    }

    async initPhysics() {
        if (typeof HavokPhysics === 'undefined') {
            console.warn('[Havok] script CDN absent — physique désactivée');
            return false;
        }
        try {
            const havokInstance = await HavokPhysics();
            this.physicsPlugin = new BABYLON.HavokPlugin(true, havokInstance);
            this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), this.physicsPlugin);
            this.physicsReady = true;
            console.log('[Havok] physique active ✓');
            return true;
        } catch (err) {
            console.warn('[Havok] init impossible, fallback no-physics:', err);
            this.physicsReady = false;
            return false;
        }
    }

    _setupCamera() {
        this.camera = new BABYLON.ArcRotateCamera(
            'mainCamera',
            -Math.PI / 2,
            Math.PI / 3.5,
            35,
            BABYLON.Vector3.Zero(),
            this.scene
        );

        // Camera verrouillée : le joueur ne peut pas tourner la vue
        this.camera.lowerBetaLimit  = this.camera.beta;
        this.camera.upperBetaLimit  = this.camera.beta;
        this.camera.lowerAlphaLimit = this.camera.alpha;
        this.camera.upperAlphaLimit = this.camera.alpha;

        this.camera.lowerRadiusLimit = 25;
        this.camera.upperRadiusLimit = 50;

        this.camera.attachControl(this.canvas, false);
        this.camera.inputs.clear();
    }

    _setupLights() {
        this.hemisphericLight = new BABYLON.HemisphericLight(
            'hemiLight',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        this.hemisphericLight.intensity   = 0.6;
        this.hemisphericLight.diffuse     = new BABYLON.Color3(0.4, 0.6, 0.9);
        this.hemisphericLight.specular    = new BABYLON.Color3(0.1, 0.3, 0.6);
        this.hemisphericLight.groundColor = new BABYLON.Color3(0.02, 0.02, 0.08);

        this.directionalLight = new BABYLON.DirectionalLight(
            'dirLight',
            new BABYLON.Vector3(-1, -2, 1).normalize(),
            this.scene
        );
        this.directionalLight.intensity = 0.3;
        this.directionalLight.diffuse   = new BABYLON.Color3(0.9, 0.7, 1.0);
    }

    _setupGlow() {
        this.glowLayer = new BABYLON.GlowLayer('glowLayer', this.scene, {
            mainTextureFixedSize: 512,
            blurKernelSize: 64
        });
        this.glowLayer.intensity = 0.8;
    }

    applyAmbiance(config) {
        const [cr, cg, cb] = config.clear;
        this.scene.clearColor = new BABYLON.Color4(cr, cg, cb, 1);

        const [ar, ag, ab] = config.ambient;
        this.scene.ambientColor = new BABYLON.Color3(ar, ag, ab);

        const [fr, fg, fb] = config.fog;
        this.scene.fogColor = new BABYLON.Color3(fr, fg, fb);

        const [hr, hg, hb] = config.hemi;
        this.hemisphericLight.diffuse     = new BABYLON.Color3(hr, hg, hb);
        this.hemisphericLight.groundColor = new BABYLON.Color3(cr * 2, cg * 2, cb * 2);
    }

    pause() {
        this.engine.stopRenderLoop(this._renderLoopFn);
    }

    resume() {
        this.engine.stopRenderLoop(this._renderLoopFn); // évite les doublons
        this.engine.runRenderLoop(this._renderLoopFn);
    }
}
