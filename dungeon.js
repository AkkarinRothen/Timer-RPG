// Datos de la mazmorra
const dungeonData = {
    startRoomId: 'room_1',
    rooms: {
        room_1: {
            type: 'start',
            content: 'empty',
            connections: { east: 'corridor_A' },
            coords: [2, 4]
        },
        room_2: {
            type: 'standard',
            content: 'battle',
            connections: { west: 'corridor_A', east: 'corridor_B' },
            coords: [6, 4]
        },
        room_3: {
            type: 'standard',
            content: 'curio',
            connections: { west: 'corridor_B' },
            coords: [10, 4]
        }
    },
    corridors: {
        corridor_A: {
            from: 'room_1',
            to: 'room_2',
            sections: [
                { id: 'A1', content: 'empty', coords: [3, 4] },
                { id: 'A2', content: 'trap', coords: [4, 4] },
                { id: 'A3', content: 'empty', coords: [5, 4] }
            ]
        },
        corridor_B: {
            from: 'room_2',
            to: 'room_3',
            sections: [
                { id: 'B1', content: 'empty', coords: [7, 4] },
                { id: 'B2', content: 'curio', coords: [8, 4] },
                { id: 'B3', content: 'empty', coords: [9, 4] }
            ]
        }
    }
};

// Estado del juego
const gameState = {
    currentLocationId: null,
    currentLocationType: null,
    status: 'IDLE',
    timer: null,
    timeRemaining: 0,
    visited: new Set()
};

// Elementos del DOM
const mapContainer = document.getElementById('dungeon-map');
const timerDisplay = document.getElementById('timer-display');
const statusMessage = document.getElementById('status-message');

function setGridSize() {
    if (!mapContainer) return;
    let maxX = 0;
    let maxY = 0;
    const consider = point => {
        if (!Array.isArray(point) || point.length < 2) return;
        if (point[0] > maxX) maxX = point[0];
        if (point[1] > maxY) maxY = point[1];
    };
    Object.values(dungeonData.rooms).forEach(r => consider(r.coords));
    Object.values(dungeonData.corridors).forEach(c => c.sections.forEach(s => consider(s.coords)));
    // add some minimum to avoid zero
    const cols = Math.max(1, maxX);
    const rows = Math.max(1, maxY);
    mapContainer.style.display = 'grid';
    mapContainer.style.gridTemplateColumns = `repeat(${cols}, 60px)`;
    mapContainer.style.gridTemplateRows = `repeat(${rows}, 60px)`;
}

function drawMap() {
    if (!mapContainer) return;
    // Clear previous
    mapContainer.innerHTML = '';

    for (const roomId in dungeonData.rooms) {
        createTile(roomId, dungeonData.rooms[roomId], 'room');
    }
    for (const corridorId in dungeonData.corridors) {
        dungeonData.corridors[corridorId].sections.forEach(section => {
            createTile(section.id, section, 'corridor');
        });
    }
}

function createTile(id, data, type) {
    if (!mapContainer) return;
    const tile = document.createElement('div');
    tile.id = id;
    tile.className = 'map-tile status-unexplored';
    tile.style.gridColumn = data.coords[0];
    tile.style.gridRow = data.coords[1];
    tile.addEventListener('click', () => onTileClick(id, type));
    mapContainer.appendChild(tile);
}

function onTileClick(id, type) {
    const tileEl = document.getElementById(id);
    if (gameState.status !== 'AWAITING_CHOICE' || !tileEl || !tileEl.classList.contains('selectable')) return;

    document.querySelectorAll('.selectable').forEach(el => el.classList.remove('selectable'));

    gameState.currentLocationId = id;
    gameState.currentLocationType = type;
    updatePlayerPosition();
    startWorkTimer();
}

function startWorkTimer() {
    gameState.status = 'IN_ROOM';
    updateStatusMessage('Concentración... Quedan 30 minutos.');
    startTimer(30 * 60, handleWorkTimerEnd);
}

function handleWorkTimerEnd() {
    updateStatusMessage('¡Trabajo completado! Descansa 5 minutos.');
    gameState.status = 'IN_CORRIDOR_REST';
    startTimer(5 * 60, handleRestTimerEnd);
}

function handleRestTimerEnd() {
    gameState.status = 'AWAITING_CHOICE';
    updateStatusMessage('Descanso terminado. Elige la siguiente casilla.');
    highlightSelectableTiles();
}

function startTimer(duration, onEnd) {
    if (gameState.timer) clearInterval(gameState.timer);
    gameState.timeRemaining = duration;
    gameState.timer = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();
        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timer);
            gameState.timer = null;
            onEnd();
        }
    }, 1000);
    updateTimerDisplay();
}

function highlightSelectableTiles() {
    // limpiar previos
    document.querySelectorAll('.selectable').forEach(el => el.classList.remove('selectable'));
    const neighbors = getNeighbors(gameState.currentLocationId);
    neighbors.forEach(id => {
        const el = document.getElementById(id);
        if (el && !gameState.visited.has(id)) {
            el.classList.add('selectable');
        }
    });
}

function updatePlayerPosition() {
    const old = document.querySelector('.player-location');
    if (old) old.classList.remove('player-location');

    const el = document.getElementById(gameState.currentLocationId);
    if (!el) return;
    el.classList.add('player-location');
    if (!gameState.visited.has(gameState.currentLocationId)) {
        gameState.visited.add(gameState.currentLocationId);
        const data = findTileData(gameState.currentLocationId);
        if (data) {
            el.classList.add(`icon-${data.content}`);
        }
        el.classList.remove('status-unexplored');
        el.classList.add('status-visited');
    }
}

function updateTimerDisplay() {
    const m = Math.floor(gameState.timeRemaining / 60);
    const s = gameState.timeRemaining % 60;
    if (timerDisplay) {
        timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
}

function updateStatusMessage(msg) {
    if (statusMessage) statusMessage.textContent = msg;
}

function findTileData(id) {
    if (dungeonData.rooms[id]) return dungeonData.rooms[id];
    for (const cId in dungeonData.corridors) {
        const section = dungeonData.corridors[cId].sections.find(s => s.id === id);
        if (section) return section;
    }
    return null;
}

function getNeighbors(id) {
    const neighbors = new Set();
    const data = findTileData(id);
    if (!data) return [];

    // If it's a room: connect to corridor entry/exit sections depending on orientation
    if (dungeonData.rooms[id]) {
        const connections = data.connections || {};
        for (const dir in connections) {
            const corridorId = connections[dir];
            const corridor = dungeonData.corridors[corridorId];
            if (!corridor) continue;
            if (corridor.from === id) {
                // entrance is first section
                if (corridor.sections[0]) neighbors.add(corridor.sections[0].id);
            } else if (corridor.to === id) {
                // entrance is last section
                const last = corridor.sections[corridor.sections.length - 1];
                if (last) neighbors.add(last.id);
            }
        }
    } else {
        // It's a corridor section: find its corridor and adjacent
        for (const cId in dungeonData.corridors) {
            const corridor = dungeonData.corridors[cId];
            const idx = corridor.sections.findIndex(s => s.id === id);
            if (idx !== -1) {
                // previous section
                if (idx > 0) neighbors.add(corridor.sections[idx - 1].id);
                // next section
                if (idx < corridor.sections.length - 1) neighbors.add(corridor.sections[idx + 1].id);
                // if first section, can go to corridor.from room
                if (idx === 0 && corridor.from) neighbors.add(corridor.from);
                // if last section, can go to corridor.to room
                if (idx === corridor.sections.length - 1 && corridor.to) neighbors.add(corridor.to);
                break;
            }
        }
    }

    return Array.from(neighbors);
}

function init() {
    setGridSize();
    drawMap();
    gameState.currentLocationId = dungeonData.startRoomId;
    gameState.currentLocationType = 'room';
    updatePlayerPosition();
    startWorkTimer();
}

document.addEventListener('DOMContentLoaded', init);
