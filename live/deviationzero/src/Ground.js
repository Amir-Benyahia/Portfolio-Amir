// Ground : sol grille cyberpunk (GridMaterial) + collider physique invisible.

export class Ground {
    constructor(scene) {
        this.scene = scene;
        this.gridMaterial = null;
        this.mesh = this._createGround();

        // Box invisible sous le sol pour Havok (le plan n'a pas d'épaisseur, inutilisable comme collider)
        this._collider = null;
        this._physicsAggregate = null;
        this._attachPhysicsCollider();
    }

    _attachPhysicsCollider() {
        if (!this.scene.getPhysicsEngine || !this.scene.getPhysicsEngine()) return;
        if (typeof BABYLON.PhysicsAggregate === 'undefined') return;
        try {
            const collider = BABYLON.MeshBuilder.CreateBox('groundCollider', {
                width: 200, height: 0.5, depth: 200
            }, this.scene);
            collider.position.y = -0.25;
            collider.isVisible  = false;
            collider.isPickable = false;
            this._collider = collider;

            this._physicsAggregate = new BABYLON.PhysicsAggregate(
                collider, BABYLON.PhysicsShapeType.BOX,
                { mass: 0, restitution: 0.3, friction: 0.5 },
                this.scene
            );
        } catch (err) {
            console.warn('[Havok] ground collider fail:', err);
        }
    }

    _createGround() {
        const ground = BABYLON.MeshBuilder.CreateGround('ground', {
            width: 100,
            height: 100,
            subdivisions: 1
        }, this.scene);

        const gridMaterial = new BABYLON.GridMaterial('gridMat', this.scene);
        this.gridMaterial = gridMaterial;

        gridMaterial.majorUnitFrequency = 5;
        gridMaterial.gridRatio = 1;
        gridMaterial.mainColor = new BABYLON.Color3(0.0, 0.0, 0.02);
        gridMaterial.lineColor = new BABYLON.Color3(0.0, 0.9, 0.9);
        gridMaterial.opacity = 0.98;
        gridMaterial.backFaceCulling = true;
        gridMaterial.minorUnitVisibility = 0.4;

        ground.material = gridMaterial;
        ground.isPickable = false;
        return ground;
    }

    updateColors(config) {
        if (!this.gridMaterial) return;
        const [r, g, b] = config.grid;
        this.gridMaterial.lineColor = new BABYLON.Color3(r, g, b);
        this.gridMaterial.mainColor = new BABYLON.Color3(r * 0.02, g * 0.02, b * 0.03);
    }

    dispose() {
        if (this._physicsAggregate) { try { this._physicsAggregate.dispose(); } catch (_) {} this._physicsAggregate = null; }
        if (this._collider)         { try { this._collider.dispose(); }         catch (_) {} this._collider = null; }
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
    }
}
