// SpatialHash : grille O(1) par cellule pour getMimicsNear.

export class SpatialHash {
    constructor(cellSize = 12) {
        this.cellSize = cellSize;
        this._cells   = new Map();
    }

    rebuild(mimics) {
        this._cells.clear();
        for (let i = 0; i < mimics.length; i++) {
            const m   = mimics[i];
            const key = this._key(m.position.x, m.position.z);
            let cell  = this._cells.get(key);
            if (!cell) { cell = []; this._cells.set(key, cell); }
            cell.push(m);
        }
    }

    query(x, z, radius) {
        const result      = [];
        const rSq         = radius * radius;
        const cellRadius  = Math.ceil(radius / this.cellSize);
        const cx          = Math.floor(x / this.cellSize);
        const cz          = Math.floor(z / this.cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const cell = this._cells.get(`${cx + dx},${cz + dz}`);
                if (!cell) continue;
                for (const m of cell) {
                    const ddx = m.position.x - x;
                    const ddz = m.position.z - z;
                    if (ddx * ddx + ddz * ddz <= rSq) result.push(m);
                }
            }
        }
        return result;
    }

    _key(x, z) {
        return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
    }
}
