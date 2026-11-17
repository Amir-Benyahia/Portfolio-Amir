// main : entry point. Crée Game + LevelManager après clic JOUER.
// Le flag sessionStorage 'dz_quick_start' permet à REJOUER de bypass le menu.

import { Game }         from './src/Game.js?v=12';
import { LevelManager } from './src/LevelManager.js?v=16';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas');
    const menu   = document.getElementById('main-menu');

    async function startGame(extraOpts = {}) {
        let game;
        try {
            if (!BABYLON.Engine.isSupported()) throw new Error("WebGL not supported.");
            game = new Game(canvas);
            await game.initPhysics(); // Havok WASM, fallback silencieux si KO
        } catch (error) {
            console.error("Initialization error:", error);
            if (menu) menu.style.display = 'none';
            const err = document.createElement('div');
            Object.assign(err.style, {
                position: 'fixed', inset: '0', background: '#0a0a0f',
                color: '#ff0000', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', zIndex: '9999',
                fontFamily: "'Orbitron', sans-serif", textAlign: 'center', padding: '20px'
            });
            err.innerHTML = `
                <h1 style="font-size:32px;margin-bottom:20px;text-shadow:0 0 10px red">SYSTEM FAILURE</h1>
                <p style="font-size:18px;color:#fff">WebGL is not supported or is disabled in your browser.</p>
                <p style="font-size:12px;color:#555;margin-top:20px">[ ${error.message} ]</p>
            `;
            document.body.appendChild(err);
            return;
        }

        const levelManager = new LevelManager(game);

        const juryOpts = window.__DZ_JURY__ || {};
        const bootOpts = { ...juryOpts, ...extraOpts };

        if (bootOpts.startLevel && bootOpts.startLevel > 1) bootOpts.skipIntro = true;

        levelManager.start(bootOpts);

        if (bootOpts.godMode || bootOpts.timerInfini || (bootOpts.startLevel && bootOpts.startLevel > 1)) {
            console.log('[Deviation Zero] Jury mode active —', bootOpts);
        }

        window.__DEV__  = { game, levelManager };
        console.log('[Deviation Zero] Engine ready — LevelManager started ✓');
    }

    window.__DZ_START__ = startGame;

    // REJOUER : flag posé avant location.reload() pour skip le menu
    if (sessionStorage.getItem('dz_quick_start')) {
        sessionStorage.removeItem('dz_quick_start');
        if (menu) menu.style.display = 'none';
        startGame({ skipIntro: true });
    }
});
