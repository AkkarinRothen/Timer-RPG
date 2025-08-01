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

function drawMap() {
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
    if (gameState.status !== 'AWAITING_CHOICE' || !tileEl.classList.contains('selectable')) return;

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
    clearInterval(gameState.timer);
    gameState.timeRemaining = duration;
    gameState.timer = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();
        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timer);
            onEnd();
        }
    }, 1000);
    updateTimerDisplay();
}

function highlightSelectableTiles() {
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
        el.classList.add(`icon-${data.content}`);
        el.classList.remove('status-unexplored');
        el.classList.add('status-visited');
    }
}

function updateTimerDisplay() {
    const m = Math.floor(gameState.timeRemaining / 60);
    const s = gameState.timeRemaining % 60;
    timerDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateStatusMessage(msg) {
    statusMessage.textContent = msg;
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
    const data = findTileData(id);
    if (!data) return [];
    if (data.connections) {
        return Object.values(data.connections).map(c => dungeonData.corridors[c].sections[0].id);
    } else {
        for (const cId in dungeonData.corridors) {
            const corridor = dungeonData.corridors[cId];
            const index = corridor.sections.findIndex(s => s.id === id);
            if (index !== -1) {
                if (index < corridor.sections.length - 1) return [corridor.sections[index + 1].id];
                return [corridor.to];
            }
        }
    }
    return [];
}

function init() {
    drawMap();
    gameState.currentLocationId = dungeonData.startRoomId;
    gameState.currentLocationType = 'room';
    updatePlayerPosition();
    startWorkTimer();
}

document.addEventListener('DOMContentLoaded', init);
