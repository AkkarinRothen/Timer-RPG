const defaultTemplate = {
    name: "Default",
    stages: [
        { id: 'brainstorming', label: 'Brainstorming', duration: 10 },
        { id: 'outlining', label: 'Outlining', duration: 15 },
        { id: 'writing-intro', label: 'Writing Introduction', duration: 10 },
        { id: 'writing-body', label: 'Writing Body Paragraphs', duration: 45 },
        { id: 'writing-conclusion', label: 'Writing Conclusion', duration: 10 },
        { id: 'proofreading', label: 'Proofreading', duration: 15 },
        { id: 'extra', label: 'Extra Time', duration: 0, isExtra: true },
    ]
};

const pomodoro30Template = {
    name: 'Pomodoro 30/5',
    stages: [
        { id: 'pomodoro-1', label: 'Pomodoro 1', duration: 30, isPomodoro: true },
        { id: 'break-1', label: 'Descanso', duration: 5 },
        { id: 'pomodoro-2', label: 'Pomodoro 2', duration: 30, isPomodoro: true },
        { id: 'break-2', label: 'Descanso', duration: 5 },
        { id: 'pomodoro-3', label: 'Pomodoro 3', duration: 30, isPomodoro: true },
        { id: 'break-3', label: 'Descanso', duration: 5 },
        { id: 'pomodoro-4', label: 'Pomodoro 4', duration: 30, isPomodoro: true },
        { id: 'long-break', label: 'Descanso Largo', duration: 15 },
        { id: 'extra', label: 'Extra Time', duration: 0, isExtra: true }
    ]
};

const defaultMonsters = [
    {
        name: 'Slime',
        maxHP: 20,
        img: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1F9EA.svg'
    },
    {
        name: 'Goblin',
        maxHP: 30,
        img: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1F47E.svg'
    },
    {
        name: 'Orc',
        maxHP: 40,
        img: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1F479.svg'
    },
    {
        name: 'Troll',
        maxHP: 60,
        img: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1F47A.svg'
    },
    {
        name: 'Dragon',
        maxHP: 80,
        img: 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1F409.svg'
    }
];

const defaultMissions = {
    tutorial: {
        name: 'Bosque Inicial',
        difficulty: 'Fácil',
        description: 'Explora el bosque y derrota al Slime.',
        rooms: [
            { type: 'empty' },
            { type: 'monster', monsterIndex: 0 },
            { type: 'item', item: 'Poción Curativa' }
        ]
    }
};

const DAMAGE_PER_STAGE = 5;

let db;

class EssayTimer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentEssayName = null;
        this.saveTimeout = null;
        this.isEditMode = false;
        this.stagesBackup = null;

        // DOM Elements
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        this.settingsToggleBtn = document.getElementById('settings-toggle-btn');
        this.themeSettings = document.getElementById('theme-settings');
        this.themeSelect = document.getElementById('theme-select');
        this.backgroundInput = document.getElementById('background-input');
        this.clearBgBtn = document.getElementById('clear-bg-btn');
        this.sessionTimeEl = document.getElementById('session-time');
        this.totalTimeEl = document.getElementById('total-time');
        this.pomodoroCountEl = document.getElementById('pomodoro-count');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.essayNameInput = document.getElementById('essay-name-input');
        this.newEssayBtn = document.getElementById('new-essay-btn');
        this.savedEssaysSelect = document.getElementById('saved-essays-select');
        this.deleteEssayBtn = document.getElementById('delete-essay-btn');
        this.templateSelect = document.getElementById('template-select');
        this.editTemplateBtn = document.getElementById('edit-template-btn');
        this.saveTemplateBtn = document.getElementById('save-template-btn');
        this.cancelEditBtn = document.getElementById('cancel-edit-btn');
        this.addStageBtn = document.getElementById('add-stage-btn');
        this.essayNotes = document.getElementById('essay-notes');
        this.notificationSound = document.getElementById('notification-sound');
        this.startSound = document.getElementById('start-sound');
        this.monsterNameEl = document.getElementById('monster-name');
        this.monsterHpEl = document.getElementById('monster-hp'); // fallback textual
        this.monsterHealthBarEl = document.getElementById('monster-health-bar'); // visual bar
        this.monsterImgEl = document.getElementById('monster-img'); // optional image
        this.missionSelect = document.getElementById('mission-select');
        this.newMissionBtn = document.getElementById('new-mission-btn');
        this.missionDescEl = document.getElementById('mission-desc');

        // State
        this.stages = [];
        this.stageElements = {};
        this.previousStageId = null;
        this.currentStageIndex = 0;
        this.isPaused = true;
        this.isRunning = false;
        this.intervalId = null;
        this.timeLeftInStage = 0;
        this.extraTime = 0;
        this.dailySessionSeconds = 0;
        this.pomodorosCompleted = 0;

        // RPG monster
        this.currentMonsterIndex = 0;
        this.currentMonster = null;

        // Missions
        this.currentMissionKey = null;
        this.currentMission = null;
        this.currentRoomIndex = 0;

        this.init();
    }

    init() {
        this.loadTemplates();
        this.loadTemplate(this.templateSelect?.value);
        this.attachEventListeners();
        this.populateSavedEssays();
        this.loadAndCheckDailySession();
        this.reset();
        this.updatePomodoroDisplay();
        this.loadTheme();
        this.loadBackgroundImage();
        this.loadCurrentMonster();
        this.loadMissions();
        this.loadMission(this.missionSelect?.value);
        this.updateMonsterHUD();
        this.setupVisibilityHandler();
    }

    // Daily session
    loadAndCheckDailySession() {
        const today = new Date().toISOString().slice(0, 10);
        const sessionData = db.get('dailySession');
        if (sessionData && sessionData.date === today) {
            this.dailySessionSeconds = sessionData.totalSeconds;
        } else {
            this.dailySessionSeconds = 0;
            this.saveDailySession();
        }
        this.updateSessionDisplay();
    }

    saveDailySession() {
        const today = new Date().toISOString().slice(0, 10);
        db.set('dailySession', { date: today, totalSeconds: this.dailySessionSeconds });
    }

    updateSessionDisplay() {
        const hours = Math.floor(this.dailySessionSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((this.dailySessionSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (this.dailySessionSeconds % 60).toString().padStart(2, '0');
        if (this.sessionTimeEl) this.sessionTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updatePomodoroDisplay() {
        if (this.pomodoroCountEl) this.pomodoroCountEl.textContent = this.pomodorosCompleted;
    }

    // Monster logic
    loadCurrentMonster() {
        const savedMonster = db.get('currentMonster');
        const savedIndex = db.get('currentMonsterIndex');
        if (typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < defaultMonsters.length) {
            this.currentMonsterIndex = savedIndex;
        } else {
            this.currentMonsterIndex = 0;
        }

        if (savedMonster && savedMonster.name && typeof savedMonster.hp === 'number' && typeof savedMonster.maxHP === 'number') {
            if (!savedMonster.img && defaultMonsters[this.currentMonsterIndex]?.img) {
                savedMonster.img = defaultMonsters[this.currentMonsterIndex].img;
            }
            this.currentMonster = savedMonster;
        } else {
            this.loadMonster(this.currentMonsterIndex);
        }
    }

    saveCurrentMonster() {
        if (this.currentMonster) {
            db.set('currentMonster', this.currentMonster);
            db.set('currentMonsterIndex', this.currentMonsterIndex);
        }
    }

    // Missions
    loadMissions() {
        let missions = db.get('missions') || {};
        if (Object.keys(missions).length === 0) {
            missions = defaultMissions;
            db.set('missions', missions);
        }
        if (this.missionSelect) {
            this.missionSelect.innerHTML = '<option value="">Seleccionar Misi\u00f3n</option>';
            for (const key in missions) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = missions[key].name;
                this.missionSelect.appendChild(option);
            }
        }
    }

    loadMission(key) {
        if (!key) {
            this.currentMissionKey = null;
            this.currentMission = null;
            this.currentRoomIndex = 0;
            if (this.missionDescEl) this.missionDescEl.textContent = '';
            return;
        }
        const missions = db.get('missions');
        if (!missions || !missions[key]) return;
        this.currentMissionKey = key;
        this.currentMission = missions[key];
        this.currentRoomIndex = 0;
        if (this.missionDescEl) this.missionDescEl.textContent = this.currentMission.description || '';
        this.advanceRoom();
    }

    createNewMission() {
        const name = prompt('Nombre de la misi\u00f3n:', 'Nueva Misi\u00f3n');
        if (!name) return;
        const roomsCount = parseInt(prompt('N\u00famero de salas:', '3'), 10) || 3;
        const difficulty = prompt('Dificultad (F\u00e1cil/Normal/Dif\u00edcil):', 'F\u00e1cil');
        const rooms = [];
        for (let i = 0; i < roomsCount - 1; i++) {
            const r = Math.random();
            if (r < 0.5) {
                rooms.push({ type: 'monster', monsterIndex: Math.floor(Math.random() * defaultMonsters.length) });
            } else if (r < 0.8) {
                rooms.push({ type: 'item', item: 'Tesoro' });
            } else {
                rooms.push({ type: 'empty' });
            }
        }
        const bossIndex = Math.floor(Math.random() * defaultMonsters.length);
        rooms.push({ type: 'monster', monsterIndex: bossIndex });
        const missionKey = name.toLowerCase().replace(/\s+/g, '-');
        const mission = { name, difficulty, description: `Derrota al ${defaultMonsters[bossIndex].name} para completar la misi\u00f3n.`, rooms };
        let missions = db.get('missions') || {};
        missions[missionKey] = mission;
        db.set('missions', missions);
        this.loadMissions();
        if (this.missionSelect) this.missionSelect.value = missionKey;
        this.loadMission(missionKey);
    }

    advanceRoom() {
        if (!this.currentMission) return;
        if (this.currentRoomIndex >= this.currentMission.rooms.length) {
            alert(`\u00a1Has completado la misi\u00f3n ${this.currentMission.name}!`);
            this.loadMission('');
            return;
        }
        const room = this.currentMission.rooms[this.currentRoomIndex];
        if (room.type === 'monster') {
            this.loadMonster(room.monsterIndex);
            this.updateMonsterHUD();
        } else if (room.type === 'item') {
            alert(`Encontraste: ${room.item}`);
            this.currentRoomIndex++;
            this.advanceRoom();
        } else {
            alert('La sala est\u00e1 vac\u00eda.');
            this.currentRoomIndex++;
            this.advanceRoom();
        }
    }

    loadMonster(index) {
        if (index >= defaultMonsters.length) {
            this.currentMonster = null;
            this.currentMonsterIndex = index;
            if (this.monsterNameEl) this.monsterNameEl.textContent = 'Sin monstruo';
            if (this.monsterHpEl) this.monsterHpEl.textContent = '0/0';
            if (this.monsterHealthBarEl) this.monsterHealthBarEl.style.width = '0%';
            if (this.monsterImgEl) this.monsterImgEl.src = '';
            db.set('currentMonsterIndex', index);
            db.remove('currentMonster');
            return;
        }
        this.currentMonsterIndex = index;
        const base = defaultMonsters[index];
        this.currentMonster = { name: base.name, hp: base.maxHP, maxHP: base.maxHP, img: base.img };
        this.saveCurrentMonster();
    }

    loadNextMonster() {
        if (this.currentMission) {
            this.currentRoomIndex++;
            this.advanceRoom();
        } else {
            this.loadMonster(this.currentMonsterIndex + 1);
            this.updateMonsterHUD();
        }
    }

    changeMonsterHP(delta) {
        if (!this.currentMonster) return;
        this.currentMonster.hp = Math.max(0, this.currentMonster.hp + delta);
        this.saveCurrentMonster();
        this.updateMonsterHUD();
        if (this.currentMonster.hp <= 0) {
            alert(`¡Has vencido a ${this.currentMonster.name}!`);
            this.loadNextMonster();
        }
    }

    updateMonsterHUD() {
        if (!this.currentMonster) {
            if (this.monsterNameEl) this.monsterNameEl.textContent = '';
            if (this.monsterHpEl) this.monsterHpEl.textContent = '';
            if (this.monsterHealthBarEl) this.monsterHealthBarEl.style.width = '0%';
            if (this.monsterImgEl) this.monsterImgEl.src = '';
            return;
        }
        if (this.monsterNameEl) this.monsterNameEl.textContent = this.currentMonster.name;
        if (this.monsterHpEl) this.monsterHpEl.textContent = `${this.currentMonster.hp}/${this.currentMonster.maxHP}`;
        if (this.monsterHealthBarEl) {
            const percent = (this.currentMonster.hp / this.currentMonster.maxHP) * 100;
            this.monsterHealthBarEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        }
        if (this.monsterImgEl && this.currentMonster.img) {
            this.monsterImgEl.src = this.currentMonster.img;
        }
    }

    // General timer logic
    updatePageTitle() {
        if (!this.isRunning) {
            document.title = 'Advanced Essay Timer';
            return;
        }
        const stage = this.stages[this.currentStageIndex];
        if (!stage) return;
        document.title = `${this.formatTime(this.timeLeftInStage)} - ${stage.label}`;
    }

    startNewCycle() {
        this.currentStageIndex = 0;
        this.setCurrentStage();
        this.updateAllDisplays();
        this.updatePageTitle();
    }

    tick() {
        if (this.isPaused) return;

        this.dailySessionSeconds++;
        this.updateSessionDisplay();
        if (this.dailySessionSeconds % 5 === 0) this.saveDailySession();

        const stage = this.stages[this.currentStageIndex];
        if (!stage) return;

        if (!stage.isExtra) {
            this.timeLeftInStage--;
            if (this.timeLeftInStage < 0) {
                if (stage.isPomodoro) {
                    this.pomodorosCompleted++;
                    this.updatePomodoroDisplay();
                }
                if (!stage.label.toLowerCase().includes('descanso') && this.currentMonster) {
                    this.changeMonsterHP(-DAMAGE_PER_STAGE);
                }
                this.playNotification();
                this.currentStageIndex++;
                this.setCurrentStage();
            }
        } else {
            this.extraTime++;
        }

        this.updateAllDisplays();
        this.updatePageTitle();
        this.debouncedSave();
    }

    setCurrentStage() {
        const nextStageIndex = this.stages.findIndex(s => s.isExtra);
        if (this.currentStageIndex === nextStageIndex) {
            if (confirm("¡Has completado un ciclo! ¿Deseas empezar de nuevo?")) {
                this.startNewCycle();
                return;
            }
        }
        if (this.currentStageIndex >= this.stages.length) {
            this.currentStageIndex = nextStageIndex;
        }
        const stage = this.stages[this.currentStageIndex];
        if (stage && !stage.isExtra) {
            this.timeLeftInStage = stage.duration * 60;
        }
        this.highlightCurrentStage();
        this.playStartSound();
        this.updatePageTitle();
    }

    toggleEditMode(forceOff = false) {
        this.isEditMode = forceOff ? false : !this.isEditMode;
        document.body.classList.toggle('edit-mode-active', this.isEditMode);
        const mainControls = [this.startBtn, this.pauseBtn, this.resetBtn, this.newEssayBtn, this.essayNameInput, this.savedEssaysSelect, this.deleteEssayBtn, this.templateSelect];
        mainControls.forEach(c => { if (c) c.disabled = this.isEditMode; });
        if (this.isEditMode) this.stagesBackup = JSON.parse(JSON.stringify(this.stages));
    }

    addStage() {
        const label = prompt("Nombre de la nueva etapa:", "Nueva Etapa");
        if (!label) return;
        const duration = parseInt(prompt(`Duración para "${label}" en minutos:`, "10"), 10) || 10;
        const id = `${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        this.stages.splice(-1, 0, { id, label, duration });
        this.renderStages();
    }

    deleteStage(stageIdToDelete) {
        this.stages = this.stages.filter(stage => stage.id !== stageIdToDelete);
        this.renderStages();
    }

    saveTemplate() {
        const templateName = prompt("Guardar plantilla como:", "Mi Plantilla Personalizada");
        if (templateName) {
            let templates = db.get('templates') || {};
            const templateKey = templateName.toLowerCase().replace(/\s+/g, '-');
            templates[templateKey] = { name: templateName, stages: this.stages };
            db.set('templates', templates);
            this.loadTemplates();
            if (this.templateSelect) this.templateSelect.value = templateKey;
        }
        this.toggleEditMode(true);
    }

    cancelEdit() {
        this.stages = this.stagesBackup;
        this.stagesBackup = null;
        this.renderStages();
        this.toggleEditMode(true);
    }

    renderStages() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.stages.forEach(stage => {
            const timerContainer = document.createElement('div');
            timerContainer.className = 'timer-container';
            timerContainer.innerHTML = `
                <button class="delete-stage-btn" data-id="${stage.id}">×</button>
                <h2>${stage.label}</h2>
                ${!stage.isExtra ? `<input type="number" data-id="${stage.id}" value="${stage.duration}" min="0"> minutos` : ''}
                <div class="timer-display green" data-id="${stage.id}-display">00:00</div>
                ${!stage.isExtra ? `<div class="progress-bar"><div class="progress" data-id="${stage.id}-progress"></div></div>` : ''}
            `;
            this.container.appendChild(timerContainer);
            this.stageElements[stage.id] = {
                container: timerContainer,
                input: timerContainer.querySelector(`input[data-id="${stage.id}"]`),
                display: timerContainer.querySelector(`div[data-id="${stage.id}-display"]`),
                progress: timerContainer.querySelector(`div[data-id="${stage.id}-progress"]`),
                deleteBtn: timerContainer.querySelector(`button[data-id="${stage.id}"]`),
            };
        });
        this.stages.forEach(stage => {
            if (this.stageElements[stage.id]?.input) {
                this.stageElements[stage.id].input.addEventListener('input', () => {
                    const newDuration = parseInt(this.stageElements[stage.id].input.value, 10) || 0;
                    const stageToUpdate = this.stages.find(s => s.id === stage.id);
                    if (stageToUpdate) {
                        const oldDuration = stageToUpdate.duration;
                        stageToUpdate.duration = newDuration;
                        if (this.isRunning && stage.id === this.stages[this.currentStageIndex].id && !stage.isExtra) {
                            this.timeLeftInStage = Math.max(0, this.timeLeftInStage + (newDuration - oldDuration) * 60);
                        }
                    }
                    this.updateAllDisplays();
                });
            }
            if (this.stageElements[stage.id]?.deleteBtn) {
                this.stageElements[stage.id].deleteBtn.addEventListener('click', () => this.deleteStage(stage.id));
            }
        });
        this.updateAllDisplays();
        this.highlightCurrentStage();
    }

    attachEventListeners() {
        if (this.themeToggleBtn) this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        if (this.settingsToggleBtn) {
            this.settingsToggleBtn.addEventListener('click', () => {
                if (this.themeSettings) this.themeSettings.classList.toggle('visible');
            });
        }
        if (this.themeSelect) this.themeSelect.addEventListener('change', () => this.setTheme(this.themeSelect.value));
        if (this.backgroundInput) this.backgroundInput.addEventListener('change', (e) => this.handleBackgroundUpload(e));
        if (this.clearBgBtn) this.clearBgBtn.addEventListener('click', () => this.clearBackgroundImage());
        if (this.startBtn) this.startBtn.addEventListener('click', () => this.start());
        if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.pause());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.reset(true));
        if (this.newEssayBtn) this.newEssayBtn.addEventListener('click', () => this.startNewEssay());
        if (this.savedEssaysSelect) this.savedEssaysSelect.addEventListener('change', () => this.loadSelectedEssay());
        if (this.deleteEssayBtn) this.deleteEssayBtn.addEventListener('click', () => this.deleteSelectedEssay());
        if (this.templateSelect) this.templateSelect.addEventListener('change', (e) => this.loadTemplate(e.target.value));
        if (this.editTemplateBtn) this.editTemplateBtn.addEventListener('click', () => this.toggleEditMode());
        if (this.saveTemplateBtn) this.saveTemplateBtn.addEventListener('click', () => this.saveTemplate());
        if (this.cancelEditBtn) this.cancelEditBtn.addEventListener('click', () => this.cancelEdit());
        if (this.addStageBtn) this.addStageBtn.addEventListener('click', () => this.addStage());
        if (this.essayNotes) this.essayNotes.addEventListener('input', () => this.debouncedSave());
        if (this.missionSelect) this.missionSelect.addEventListener('change', (e) => this.loadMission(e.target.value));
        if (this.newMissionBtn) this.newMissionBtn.addEventListener('click', () => this.createNewMission());

        window.addEventListener('beforeunload', () => this.saveDailySession());
    }

    debouncedSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveState(), 1500);
    }

    loadTheme() {
        const theme = db.get('theme') || 'light';
        this.setTheme(theme);
    }

    toggleTheme() {
        const current = db.get('theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
    }

    setTheme(theme) {
        document.body.className = '';
        if (theme !== 'light') document.body.classList.add(`${theme}-mode`);
        db.set('theme', theme);
        if (this.themeToggleBtn) {
            this.themeToggleBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
        if (this.themeSelect) this.themeSelect.value = theme;
    }

    loadBackgroundImage() {
        const img = db.get('bgImage');
        if (img) document.body.style.backgroundImage = `url(${img})`;
    }

    handleBackgroundUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const data = reader.result;
            db.set('bgImage', data);
            document.body.style.backgroundImage = `url(${data})`;
        };
        reader.readAsDataURL(file);
    }

    clearBackgroundImage() {
        db.remove('bgImage');
        document.body.style.backgroundImage = 'none';
        if (this.backgroundInput) this.backgroundInput.value = '';
    }

    setupVisibilityHandler() {
        const overlay = document.getElementById('floating-stage');
        if (!overlay) return;

        const asistenteContainer = document.getElementById('asistente-container');
        const assistantToggleBtn = document.getElementById('assistant-toggle-btn');
        let interval;
        let assistantWasHidden = false;

        const updateOverlay = () => {
            const stage = this.stages[this.currentStageIndex];
            if (!stage) return;
            const time = stage.isExtra ? this.extraTime : this.timeLeftInStage;
            overlay.textContent = `${stage.label}: ${this.formatTime(time)}`;
        };

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                updateOverlay();
                overlay.style.display = 'block';
                clearInterval(interval);
                interval = setInterval(updateOverlay, 1000);

                if (asistenteContainer && asistenteContainer.style.display === 'none') {
                    assistantWasHidden = true;
                    asistenteContainer.style.display = 'flex';
                    if (assistantToggleBtn) assistantToggleBtn.style.display = 'none';
                } else {
                    assistantWasHidden = false;
                }

                const stage = this.stages[this.currentStageIndex];
                if (window.asistenteDecir && stage) {
                    window.asistenteDecir(`Etapa actual: ${stage.label}`);
                }
            } else {
                overlay.style.display = 'none';
                clearInterval(interval);
                if (assistantWasHidden && asistenteContainer) {
                    asistenteContainer.style.display = 'none';
                    if (assistantToggleBtn) assistantToggleBtn.style.display = 'block';
                }
                assistantWasHidden = false;
            }
        });
    }

    playNotification() {
        if (this.notificationSound) {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(() => {});
        }
    }

    playStartSound() {
        if (!this.startSound) return;
        this.startSound.currentTime = 0;
        this.startSound.play().catch(() => {});
    }

    loadTemplates() {
        let templates = db.get('templates') || {};
        if (Object.keys(templates).length === 0) {
            templates = { default: defaultTemplate, pomodoro30: pomodoro30Template };
            db.set('templates', templates);
        } else if (!templates.pomodoro30) {
            templates.pomodoro30 = pomodoro30Template;
            db.set('templates', templates);
        }
        if (this.templateSelect) {
            this.templateSelect.innerHTML = '';
            for (const key in templates) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = templates[key].name;
                this.templateSelect.appendChild(option);
            }
        }
    }

    loadTemplate(templateKey) {
        if (this.isEditMode) return;
        const templates = db.get('templates');
        if (!templates || !templates[templateKey]) return;
        this.stages = JSON.parse(JSON.stringify(templates[templateKey].stages));
        this.renderStages();
        this.reset();
    }

    populateSavedEssays() {
        const essayIndex = db.get('index') || [];
        if (this.savedEssaysSelect) {
            this.savedEssaysSelect.innerHTML = '<option value="">Cargar Ensayo Guardado</option>';
            essayIndex.forEach(essayKey => {
                const essayData = db.get(essayKey);
                const option = document.createElement('option');
                option.value = essayKey;
                const modifiedDate = essayData?.lastModified ? new Date(essayData.lastModified).toLocaleString('es-AR') : 'N/A';
                option.textContent = `${essayKey} (Guardado: ${modifiedDate})`;
                this.savedEssaysSelect.appendChild(option);
            });
        }
    }

    saveState() {
        if (!this.currentEssayName) return;
        const state = {
            lastModified: new Date().toISOString(),
            templateKey: this.templateSelect?.value,
            stages: this.stages,
            currentStageIndex: this.currentStageIndex,
            timeLeftInStage: this.timeLeftInStage,
            extraTime: this.extraTime,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            notes: this.essayNotes?.value
        };
        db.set(this.currentEssayName, state);
    }

    loadState(essayName) {
        const state = db.get(essayName);
        if (!state) return;
        this.currentEssayName = essayName;
        if (this.templateSelect) this.templateSelect.value = state.templateKey;
        this.stages = state.stages;
        this.currentStageIndex = state.currentStageIndex;
        this.timeLeftInStage = state.timeLeftInStage;
        this.extraTime = state.extraTime;
        this.isRunning = state.isRunning;
        this.isPaused = state.isPaused;
        if (this.essayNotes) this.essayNotes.value = state.notes || '';
        this.renderStages();
        this.updateAllDisplays();
        if (this.pauseBtn) this.pauseBtn.disabled = this.isPaused;
        if (this.startBtn) this.startBtn.disabled = !this.isPaused;
        if (this.resetBtn) this.resetBtn.disabled = false;
        if (this.isRunning && !this.isPaused) {
            if (this.startBtn) this.startBtn.textContent = 'Reanudar';
            this.start();
        } else {
            this.pause();
        }
    }

    startNewEssay() {
        const name = this.essayNameInput?.value.trim();
        if (!name) {
            alert('Por favor, introduce un nombre para tu ensayo.');
            return;
        }
        let essays = db.get('index') || [];
        if (!essays.includes(name)) {
            essays.push(name);
            db.set('index', essays);
        }
        this.currentEssayName = name;
        if (this.essayNameInput) this.essayNameInput.value = '';
        if (this.templateSelect) this.loadTemplate(this.templateSelect.value);
        this.reset(true);
        this.saveState();
        this.populateSavedEssays();
        if (this.savedEssaysSelect) this.savedEssaysSelect.value = name;
        if (this.deleteEssayBtn) this.deleteEssayBtn.disabled = false;
        this.start();
    }

    loadSelectedEssay() {
        if (this.isEditMode) return;
        const name = this.savedEssaysSelect?.value;
        if (this.deleteEssayBtn) this.deleteEssayBtn.disabled = !name;
        if (name) {
            clearInterval(this.intervalId);
            this.loadState(name);
        } else {
            this.currentEssayName = null;
            this.reset();
        }
    }

    deleteSelectedEssay() {
        const name = this.savedEssaysSelect?.value;
        if (!name || !confirm(`¿Seguro que quieres borrar "${name}"? Esta acción no se puede deshacer.`)) return;
        db.remove(name);
        let essays = db.get('index') || [];
        essays = essays.filter(e => e !== name);
        db.set('index', essays);
        this.populateSavedEssays();
        this.currentEssayName = null;
        this.reset();
    }

    formatTime(seconds) {
        const mins = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, '0');
        const secs = (Math.abs(seconds) % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    calculateAndDisplayTotalTime() {
        const activeStages = this.stages.filter(stage => !stage.isExtra);
        let totalSeconds = activeStages.reduce((acc, stage) => acc + (stage.duration * 60), 0);
        if (this.totalTimeEl) this.totalTimeEl.textContent = `Tiempo Total: ${this.formatTime(totalSeconds)}`;
    }

    highlightCurrentStage() {
        if (this.previousStageId && this.stageElements[this.previousStageId]?.container) {
            this.stageElements[this.previousStageId].container.classList.remove('active-stage');
        }
        const current = this.stages[this.currentStageIndex];
        if (current && this.stageElements[current.id]?.container) {
            this.stageElements[current.id].container.classList.add('active-stage');
            this.previousStageId = current.id;
        }
    }

    updateAllDisplays() {
        this.stages.forEach((stage, index) => {
            const elements = this.stageElements[stage.id];
            if (!elements) return;
            let displayTime;
            if (this.isRunning && index === this.currentStageIndex) {
                displayTime = stage.isExtra ? this.extraTime : this.timeLeftInStage;
            } else if (this.isRunning && index < this.currentStageIndex) {
                displayTime = 0;
            } else {
                displayTime = stage.isExtra ? this.extraTime : stage.duration * 60;
            }
            this.updateDisplay(stage, displayTime);
        });
        this.calculateAndDisplayTotalTime();
    }

    updateDisplay(stage, timeLeft) {
        const elements = this.stageElements[stage.id];
        if (!elements) return;
        if (elements.display) elements.display.textContent = this.formatTime(timeLeft);
        if (!stage.isExtra && elements.progress && elements.display) {
            const duration = stage.duration * 60 || 1;
            const progressPercent = Math.max(0, (timeLeft / duration) * 100);
            elements.progress.style.width = `${progressPercent}%`;
            const percentage = timeLeft / duration;
            elements.display.className = 'timer-display';
            if (percentage <= 0.2) elements.display.classList.add('red');
            else if (percentage <= 0.5) elements.display.classList.add('orange');
            else elements.display.classList.add('green');
            elements.progress.style.backgroundColor = getComputedStyle(elements.display).color;
        }
    }

    start() {
        if (!this.currentEssayName) {
            alert("Por favor, empieza un nuevo ensayo o selecciona uno guardado.");
            return;
        }
        if (!this.isRunning) this.setCurrentStage();
        this.isRunning = true;
        this.isPaused = false;
        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.tick(), 1000);
        if (this.startBtn) {
            this.startBtn.textContent = 'Reanudar';
            this.startBtn.disabled = true;
        }
        if (this.pauseBtn) this.pauseBtn.disabled = false;
        if (this.resetBtn) this.resetBtn.disabled = false;
        this.updatePageTitle();
    }

    pause() {
        this.isPaused = true;
        if (this.startBtn) this.startBtn.disabled = !this.currentEssayName;
        if (this.pauseBtn) this.pauseBtn.disabled = true;
        this.saveState();
        this.saveDailySession();
        this.updatePageTitle();
    }

    reset(fullReset = false) {
        clearInterval(this.intervalId);
        this.isRunning = false;
        this.isPaused = true;
        this.currentStageIndex = 0;
        this.extraTime = 0;
        this.intervalId = null;
        if (fullReset) {
            if (this.essayNotes) this.essayNotes.value = '';
            this.pomodorosCompleted = 0;
            this.updatePomodoroDisplay();
        }
        if (fullReset && this.templateSelect) this.loadTemplate(this.templateSelect.value);
        this.updateAllDisplays();
        this.highlightCurrentStage();
        this.updatePageTitle();
        if (this.startBtn) {
            this.startBtn.textContent = 'Empezar';
            this.startBtn.disabled = !this.currentEssayName;
        }
        if (this.pauseBtn) this.pauseBtn.disabled = true;
        if (this.resetBtn) this.resetBtn.disabled = !this.currentEssayName;
        this.stages.forEach(s => {
            if (this.stageElements[s.id]?.input) this.stageElements[s.id].input.disabled = false;
        });
        if (this.currentEssayName) this.saveState();
    }
}

let appInstance;

function updateUserNav(nickname) {
    const link = document.getElementById('login-menu-link');
    if (!link) return;
    link.textContent = nickname ? `Usuario: ${nickname}` : 'Ingresar';
}

function startApp(nickname) {
    db = new LocalDB('essayTimer_' + nickname);
    appInstance = new EssayTimer('timers-container');
    updateUserNav(nickname);
}

function showLogin() {
    const overlay = document.getElementById('login-overlay');
    const input = document.getElementById('nickname-input');
    const btn = document.getElementById('login-btn');
    const tryStart = () => {
        const nick = input.value.trim();
        if (!nick) return;
        localStorage.setItem('currentNickname', nick);
        overlay.classList.add('hidden');
        startApp(nick);
    };
    if (input) input.value = '';
    if (overlay) overlay.classList.remove('hidden');
    if (btn) btn.addEventListener('click', tryStart);
    if (input) input.addEventListener('keyup', (e) => { if (e.key === 'Enter') tryStart(); });
}

document.addEventListener('DOMContentLoaded', () => {
    const loginLink = document.getElementById('login-menu-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
    }
    const stored = localStorage.getItem('currentNickname');
    if (stored) {
        startApp(stored);
    } else {
        updateUserNav(null);
        showLogin();
    }
});
