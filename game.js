// Cross Math - IQ Challenge Game
// True crossword-style interconnected puzzle

class CrossMathGame {
    constructor() {
        this.modes = {
            easy: { ops: ['+', '-'], iqMultiplier: 0.8, maxNum: 12 },
            medium: { ops: ['+', '-', '×'], iqMultiplier: 1.0, maxNum: 20 },
            hard: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.3, maxNum: 30 },
            extreme: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.6, maxNum: 50 }
        };

        this.maxLevels = 25;
        this.currentMode = null;
        this.currentLevel = 1;
        this.grid = null;
        this.gridRows = 0;
        this.gridCols = 0;
        this.solution = {};
        this.userAnswers = {};
        this.equations = [];
        this.selectedCell = null;
        this.hintsLeft = 3;
        this.hintsUsedThisLevel = 0;
        this.totalHintsUsed = 0;
        this.gameStartTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.levelStats = [];
        this.highScores = this.loadHighScores();

        this.isDragging = false;
        this.dragValue = null;
        this.dragSourceEl = null;
        this.dragPreview = null;
        this.isDarkMode = this.loadTheme();

        this.init();
    }

    init() {
        this.dragPreview = document.getElementById('drag-preview');
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.applyTheme();
        this.displayHighScores();
    }

    setupEventListeners() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startGame(btn.dataset.mode));
        });

        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('theme-toggle-game').addEventListener('click', () => this.toggleTheme());
        document.getElementById('back-btn').addEventListener('click', () => this.showPause());
        document.getElementById('hint-btn').addEventListener('click', () => this.useHint());
        document.getElementById('check-btn').addEventListener('click', () => this.checkSolution());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartLevel());
        document.getElementById('quit-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        document.getElementById('menu-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('try-again-btn').addEventListener('click', () => this.hideScreen('wrong-answer'));

        document.addEventListener('keydown', (e) => this.handleKeypress(e));
    }

    setupDragAndDrop() {
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleTouchStart(e) {
        const target = e.target.closest('.bank-number');
        if (target && !target.classList.contains('used')) {
            e.preventDefault();
            this.startDrag(target, e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    handleTouchMove(e) {
        if (this.isDragging) {
            e.preventDefault();
            this.moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    handleTouchEnd(e) {
        if (this.isDragging) {
            this.endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
    }

    handleMouseDown(e) {
        const target = e.target.closest('.bank-number');
        if (target && !target.classList.contains('used')) {
            this.startDrag(target, e.clientX, e.clientY);
        }
    }

    handleMouseMove(e) {
        if (this.isDragging) this.moveDrag(e.clientX, e.clientY);
    }

    handleMouseUp(e) {
        if (this.isDragging) this.endDrag(e.clientX, e.clientY);
    }

    startDrag(element, x, y) {
        this.isDragging = true;
        this.dragValue = parseInt(element.dataset.value);
        this.dragSourceEl = element;
        element.classList.add('dragging');
        this.dragPreview.textContent = this.dragValue;
        this.dragPreview.classList.add('active');
        this.dragPreview.style.left = x + 'px';
        this.dragPreview.style.top = y + 'px';
    }

    moveDrag(x, y) {
        this.dragPreview.style.left = x + 'px';
        this.dragPreview.style.top = y + 'px';
        document.querySelectorAll('.puzzle-cell.drag-over').forEach(el => el.classList.remove('drag-over'));
        const target = this.getDropTarget(x, y);
        if (target) target.classList.add('drag-over');
    }

    endDrag(x, y) {
        this.isDragging = false;
        this.dragPreview.classList.remove('active');
        if (this.dragSourceEl) this.dragSourceEl.classList.remove('dragging');
        document.querySelectorAll('.puzzle-cell.drag-over').forEach(el => el.classList.remove('drag-over'));
        const target = this.getDropTarget(x, y);
        if (target && this.dragValue !== null) {
            this.placeNumber(target.dataset.id, this.dragValue);
        }
        this.dragValue = null;
        this.dragSourceEl = null;
    }

    getDropTarget(x, y) {
        const elements = document.elementsFromPoint(x, y);
        for (const el of elements) {
            if (el.classList.contains('puzzle-cell') && el.classList.contains('blank')) {
                return el;
            }
        }
        return null;
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        localStorage.setItem('crossmath_theme', this.isDarkMode ? 'dark' : 'light');
    }

    applyTheme() {
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        document.body.classList.toggle('light-mode', !this.isDarkMode);
        const icon = this.isDarkMode ? '🌙' : '☀️';
        document.querySelectorAll('.theme-btn .theme-icon, .theme-btn-small').forEach(el => el.textContent = icon);
    }

    loadTheme() {
        return localStorage.getItem('crossmath_theme') !== 'light';
    }

    startGame(mode) {
        this.currentMode = mode;
        this.currentLevel = 1;
        this.levelStats = [];
        this.totalHintsUsed = 0;
        this.showScreen('game-screen');
        this.initLevel();
    }

    initLevel() {
        this.userAnswers = {};
        this.selectedCell = null;
        this.hintsLeft = 3;
        this.hintsUsedThisLevel = 0;

        this.generatePuzzle();

        document.getElementById('current-level').textContent = this.currentLevel;
        document.getElementById('hints-left').textContent = this.hintsLeft;
        this.updateProgress();
        this.renderPuzzle();
        this.renderNumberBank();
        this.startTimer();
        this.updateIQDisplay();
    }

    updateProgress() {
        const progress = (this.currentLevel / this.maxLevels) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent = `Level ${this.currentLevel}/${this.maxLevels}`;
    }

    generatePuzzle() {
        const config = this.modes[this.currentMode];
        const levelFactor = (this.currentLevel - 1) / (this.maxLevels - 1);
        // Level 1: %25 boş, Level 25: %85 boş (çok zorlaşıyor)
        const blankRatio = 0.25 + levelFactor * 0.60;

        // Zorluk ve level'a göre template seç
        const allTemplates = this.getCrosswordTemplates();

        // Difficulty ve level'a göre hangi template'ler kullanılabilir
        let availableTemplates;
        const modeIndex = ['easy', 'medium', 'hard', 'extreme'].indexOf(this.currentMode);
        const complexity = modeIndex + Math.floor(this.currentLevel / 5);

        if (complexity <= 1) {
            availableTemplates = allTemplates.slice(0, 4); // Küçük template'ler
        } else if (complexity <= 3) {
            availableTemplates = allTemplates.slice(2, 7); // Orta template'ler
        } else {
            availableTemplates = allTemplates.slice(4); // Büyük template'ler
        }

        const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
        this.buildPuzzleFromTemplate(template, config, blankRatio);
    }

    getCrosswordTemplates() {
        // Each template is a 2D array where:
        // 'N' = number cell
        // '+', '-', '×', '÷' = operator (will be randomized based on mode)
        // '=' = equals sign
        // '.' = empty/void cell
        // Numbers indicate shared cells (same number = same value)

        return [
            // Template 1: Classic cross
            {
                layout: [
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', 'o', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', 'o', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['=', '.', '=', '.', '=', '.', '.'],
                    ['N', '.', 'N', '.', 'N', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2], [0,4]], result: [0,6] },
                    { type: 'h', cells: [[2,0], [2,2], [2,4]], result: [2,6] },
                    { type: 'h', cells: [[4,0], [4,2], [4,4]], result: [4,6] },
                    { type: 'v', cells: [[0,0], [2,0], [4,0]], result: [6,0] },
                    { type: 'v', cells: [[0,2], [2,2], [4,2]], result: [6,2] },
                    { type: 'v', cells: [[0,4], [2,4], [4,4]], result: [6,4] },
                ]
            },
            // Template 2: L-shape
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', '.'],
                    ['o', '.', '.', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['=', '.', 'o', '.', '.', '.', '.'],
                    ['N', '.', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2]], result: [0,4] },
                    { type: 'h', cells: [[2,0], [2,2], [2,4]], result: [2,6] },
                    { type: 'h', cells: [[4,2], [4,4]], result: [4,6] },
                    { type: 'v', cells: [[0,0], [2,0]], result: [4,0] },
                    { type: 'v', cells: [[2,2], [4,2]], result: [6,2] },
                ]
            },
            // Template 3: Plus shape
            {
                layout: [
                    ['.', '.', 'N', '.', '.'],
                    ['.', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', 'o', '.', '.'],
                    ['.', '.', 'N', '.', '.'],
                    ['.', '.', '=', '.', '.'],
                    ['.', '.', 'N', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[2,0], [2,2], [2,4]], result: [2,6] },
                    { type: 'v', cells: [[0,2], [2,2], [4,2]], result: [6,2] },
                ]
            },
            // Template 4: T-shape
            {
                layout: [
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2], [0,4]], result: [0,6] },
                    { type: 'v', cells: [[0,2], [2,2], [4,2]], result: [6,2] },
                ]
            },
            // Template 5: Complex interconnected
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', '.', '.', '.', '.', 'o', '.', '.', '.', '.'],
                    ['N', '.', '.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                    ['o', '.', '.', '.', '.', '.', '=', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N', '.', '.', '.', '.'],
                    ['=', '.', 'o', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', 'N', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['.', '.', '=', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.', '.', '.', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2]], result: [0,4] },
                    { type: 'h', cells: [[0,6], [0,8]], result: [0,10] },
                    { type: 'h', cells: [[4,0], [4,2], [4,4]], result: [4,6] },
                    { type: 'v', cells: [[0,0], [2,0], [4,0]], result: [6,0] },
                    { type: 'v', cells: [[0,6], [2,6]], result: [4,6] },
                    { type: 'v', cells: [[4,2], [6,2]], result: [8,2] },
                ]
            },
            // Template 6: Grid 2x2
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N'],
                    ['o', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', '=', 'N'],
                    ['=', '.', '=', '.', '.'],
                    ['N', '.', 'N', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2]], result: [0,4] },
                    { type: 'h', cells: [[2,0], [2,2]], result: [2,4] },
                    { type: 'v', cells: [[0,0], [2,0]], result: [4,0] },
                    { type: 'v', cells: [[0,2], [2,2]], result: [4,2] },
                ]
            },
            // Template 7: Staircase
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', '.', '.', '.'],
                    ['o', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N', '.', '.'],
                    ['=', '.', 'o', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', '=', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2]], result: [0,4] },
                    { type: 'h', cells: [[2,0], [2,2], [2,4]], result: [2,6] },
                    { type: 'h', cells: [[4,2], [4,4], [4,6]], result: [4,8] },
                    { type: 'v', cells: [[0,0], [2,0]], result: [4,0] },
                    { type: 'v', cells: [[2,2], [4,2]], result: [6,2] },
                    { type: 'v', cells: [[4,4], [6,4]], result: [8,4] },
                ]
            },
            // Template 8: Big Grid 4x4
            {
                layout: [
                    ['N', 'o', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', 'o', '.', 'o', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', 'o', '.', 'o', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', 'o', '.', 'o', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['=', '.', '=', '.', '=', '.', '=', '.', '.'],
                    ['N', '.', 'N', '.', 'N', '.', 'N', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2], [0,4], [0,6]], result: [0,8] },
                    { type: 'h', cells: [[2,0], [2,2], [2,4], [2,6]], result: [2,8] },
                    { type: 'h', cells: [[4,0], [4,2], [4,4], [4,6]], result: [4,8] },
                    { type: 'h', cells: [[6,0], [6,2], [6,4], [6,6]], result: [6,8] },
                    { type: 'v', cells: [[0,0], [2,0], [4,0], [6,0]], result: [8,0] },
                    { type: 'v', cells: [[0,2], [2,2], [4,2], [6,2]], result: [8,2] },
                    { type: 'v', cells: [[0,4], [2,4], [4,4], [6,4]], result: [8,4] },
                    { type: 'v', cells: [[0,6], [2,6], [4,6], [6,6]], result: [8,6] },
                ]
            },
            // Template 9: Diamond
            {
                layout: [
                    ['.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', 'o', '.', 'o', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', 'o', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', '=', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[2,2], [2,4], [2,6]], result: [2,8] },
                    { type: 'h', cells: [[4,0], [4,2], [4,4], [4,6]], result: [4,8] },
                    { type: 'h', cells: [[6,2], [6,4], [6,6]], result: [6,8] },
                    { type: 'v', cells: [[2,2], [4,2], [6,2]], result: [8,2] },
                    { type: 'v', cells: [[0,4], [2,4], [4,4], [6,4]], result: [10,4] },
                ]
            },
            // Template 10: Mega Cross
            {
                layout: [
                    ['N', 'o', 'N', 'o', 'N', '=', 'N', '.', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', 'o', '.', 'o', '.', '.', '.', 'o', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N', '.', 'N', '.', '.', '.', '.'],
                    ['o', '.', 'o', '.', '.', '.', '.', '.', 'o', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', 'o', 'N', 'o', 'N', '=', 'N', '.', '.'],
                    ['=', '.', '=', '.', '.', '.', '.', '.', '=', '.', '.', '.', '.'],
                    ['N', '.', 'N', '.', '.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                ],
                equations: [
                    { type: 'h', cells: [[0,0], [0,2], [0,4]], result: [0,6] },
                    { type: 'h', cells: [[0,8], [0,10]], result: [0,12] },
                    { type: 'h', cells: [[2,0], [2,2], [2,4]], result: [2,6] },
                    { type: 'h', cells: [[4,0], [4,2], [4,4], [4,6], [4,8]], result: [4,10] },
                    { type: 'v', cells: [[0,0], [2,0], [4,0]], result: [6,0] },
                    { type: 'v', cells: [[0,2], [2,2], [4,2]], result: [6,2] },
                    { type: 'v', cells: [[0,8], [2,8], [4,8]], result: [6,8] },
                ]
            },
        ];
    }

    buildPuzzleFromTemplate(template, config, blankRatio) {
        this.solution = {};
        this.equations = [];

        const layout = template.layout;
        this.gridRows = layout.length;
        this.gridCols = layout[0].length;

        // Initialize grid
        this.grid = [];
        for (let r = 0; r < this.gridRows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.gridCols; c++) {
                const cell = layout[r][c];
                if (cell === '.') {
                    this.grid[r][c] = { type: 'void' };
                } else if (cell === 'N') {
                    this.grid[r][c] = { type: 'number', value: null, pos: `${r}-${c}` };
                } else if (cell === 'o') {
                    this.grid[r][c] = { type: 'operator', value: null };
                } else if (cell === '=') {
                    this.grid[r][c] = { type: 'equals', value: '=' };
                }
            }
        }

        // Generate numbers for each equation
        const ops = config.ops;
        const maxNum = config.maxNum;

        template.equations.forEach((eq, idx) => {
            const numCount = eq.cells.length;
            const eqOps = [];

            // Pick operators
            for (let i = 0; i < numCount - 1; i++) {
                eqOps.push(this.pickOp(ops));
            }

            // Generate numbers that produce valid results
            let nums = [];
            let result;
            let attempts = 0;

            do {
                nums = [];
                for (let i = 0; i < numCount; i++) {
                    const [r, c] = eq.cells[i];
                    // Check if this cell already has a value (shared cell)
                    if (this.grid[r][c].value !== null) {
                        nums.push(this.grid[r][c].value);
                    } else {
                        nums.push(this.randInt(1, maxNum));
                    }
                }

                // Calculate result
                result = this.calculateEquation(nums, eqOps);
                attempts++;
            } while ((result < -99 || result > 99 || !Number.isInteger(result)) && attempts < 50);

            // Place numbers
            eq.cells.forEach(([r, c], i) => {
                this.grid[r][c].value = nums[i];
            });

            // Place result
            const [rr, rc] = eq.result;
            this.grid[rr][rc] = { type: 'result', value: result, pos: `${rr}-${rc}` };

            // Place operators between cells
            for (let i = 0; i < numCount - 1; i++) {
                const [r1, c1] = eq.cells[i];
                const [r2, c2] = eq.cells[i + 1];

                // Find operator cell between
                if (eq.type === 'h') {
                    // Horizontal: operator is at (r1, c1+1)
                    const opCol = c1 + 1;
                    if (this.grid[r1][opCol] && this.grid[r1][opCol].type === 'operator') {
                        this.grid[r1][opCol].value = eqOps[i];
                    }
                } else {
                    // Vertical: operator is at (r1+1, c1)
                    const opRow = r1 + 1;
                    if (this.grid[opRow][c1] && this.grid[opRow][c1].type === 'operator') {
                        this.grid[opRow][c1].value = eqOps[i];
                    }
                }
            }

            // Store equation for validation
            this.equations.push({
                type: eq.type,
                cells: eq.cells.map(([r, c]) => `${r}-${c}`),
                ops: eqOps,
                result: result,
                resultPos: `${eq.result[0]}-${eq.result[1]}`
            });
        });

        // Determine blanks
        const allNumPositions = [];
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                if (this.grid[r][c].type === 'number' && this.grid[r][c].value !== null) {
                    allNumPositions.push(`${r}-${c}`);
                }
            }
        }

        const numBlanks = Math.max(2, Math.floor(allNumPositions.length * blankRatio));
        this.shuffle(allNumPositions);
        const blanks = allNumPositions.slice(0, numBlanks);

        blanks.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            this.solution[pos] = this.grid[r][c].value;
            this.grid[r][c] = { type: 'blank', pos: pos };
        });
    }

    calculateEquation(nums, ops) {
        let result = nums[0];
        for (let i = 0; i < ops.length; i++) {
            result = this.applyOp(result, ops[i], nums[i + 1]);
        }
        return result;
    }

    pickOp(ops) {
        return ops[Math.floor(Math.random() * ops.length)];
    }

    applyOp(a, op, b) {
        switch(op) {
            case '+': return a + b;
            case '-': return a - b;
            case '×': return a * b;
            case '÷': return b !== 0 ? Math.floor(a / b) : a; // Tam sayı bölme
            default: return a + b;
        }
    }

    // Bölme işlemi için tam bölünebilir sayılar üret
    generateDivisibleNumber(divisor, maxNum) {
        const multiplier = this.randInt(1, Math.floor(maxNum / divisor));
        return multiplier * divisor;
    }

    renderPuzzle() {
        const container = document.getElementById('puzzle-grid');
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${this.gridRows}, 1fr)`;

        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const cell = this.grid[r][c];
                const el = document.createElement('div');
                el.className = 'puzzle-cell';
                el.dataset.row = r;
                el.dataset.col = c;

                switch (cell.type) {
                    case 'number':
                        el.classList.add('cell-number');
                        el.textContent = cell.value;
                        el.dataset.id = cell.pos;
                        break;
                    case 'blank':
                        el.classList.add('cell-number', 'blank');
                        el.dataset.id = cell.pos;
                        if (this.userAnswers[cell.pos] !== undefined) {
                            el.textContent = this.userAnswers[cell.pos];
                            el.classList.add('filled');
                        } else {
                            el.textContent = '?';
                        }
                        el.addEventListener('click', () => this.selectCell(cell.pos, el));
                        break;
                    case 'operator':
                        el.classList.add('cell-operator');
                        el.textContent = cell.value || '';
                        break;
                    case 'equals':
                        el.classList.add('cell-equals');
                        el.textContent = '=';
                        break;
                    case 'result':
                        el.classList.add('cell-result');
                        el.textContent = Math.round(cell.value); // Her zaman tam sayı
                        el.dataset.id = cell.pos;
                        break;
                    case 'void':
                    default:
                        el.classList.add('cell-void');
                        break;
                }

                container.appendChild(el);
            }
        }

        this.validateEquations();
    }

    renderNumberBank() {
        const bankEl = document.getElementById('bank-numbers');
        bankEl.innerHTML = '';

        // Sadece ihtiyaç duyulan sayılar (ekstra yok)
        const needed = Object.values(this.solution);
        this.shuffle(needed);

        needed.forEach((num, idx) => {
            const el = document.createElement('div');
            el.className = 'bank-number';
            el.textContent = num;
            el.dataset.value = num;
            el.dataset.index = idx;
            el.addEventListener('click', () => this.handleBankClick(num, el));
            bankEl.appendChild(el);
        });

        this.updateBankUsage();
    }

    updateBankUsage() {
        const bankEl = document.getElementById('bank-numbers');
        const numberEls = bankEl.querySelectorAll('.bank-number');
        const usedValues = Object.values(this.userAnswers);

        const usedCounts = {};
        usedValues.forEach(v => usedCounts[v] = (usedCounts[v] || 0) + 1);

        const marked = {};
        numberEls.forEach(el => {
            const value = parseInt(el.dataset.value);
            if (!marked[value]) marked[value] = 0;

            if (usedCounts[value] && marked[value] < usedCounts[value]) {
                el.classList.add('used');
                marked[value]++;
            } else {
                el.classList.remove('used');
            }
        });
    }

    selectCell(cellId, cellEl) {
        document.querySelectorAll('.puzzle-cell.selected').forEach(el => el.classList.remove('selected'));

        if (this.selectedCell === cellId) {
            if (this.userAnswers[cellId] !== undefined) {
                delete this.userAnswers[cellId];
                cellEl.textContent = '?';
                cellEl.classList.remove('filled');
                this.updateBankUsage();
                this.validateEquations();
            }
            this.selectedCell = null;
            return;
        }

        this.selectedCell = cellId;
        cellEl.classList.add('selected');
    }

    handleBankClick(num, numEl) {
        if (numEl.classList.contains('used')) return;

        if (this.selectedCell) {
            this.placeNumber(this.selectedCell, num);
        } else {
            document.querySelectorAll('.bank-number.selected').forEach(el => el.classList.remove('selected'));
            numEl.classList.add('selected');
        }
    }

    placeNumber(cellId, number) {
        this.userAnswers[cellId] = number;

        const cellEl = document.querySelector(`[data-id="${cellId}"]`);
        if (cellEl) {
            cellEl.textContent = number;
            cellEl.classList.remove('selected');
            cellEl.classList.add('filled');
        }

        this.selectedCell = null;
        document.querySelectorAll('.bank-number.selected').forEach(el => el.classList.remove('selected'));
        this.updateBankUsage();
        this.validateEquations();
        this.updateIQDisplay();
    }

    validateEquations() {
        document.querySelectorAll('.puzzle-cell').forEach(el => {
            el.classList.remove('valid', 'equation-valid');
        });

        this.equations.forEach(eq => {
            const values = eq.cells.map(pos => {
                const [r, c] = pos.split('-').map(Number);
                const cell = this.grid[r][c];
                if (cell.type === 'number') return cell.value;
                if (cell.type === 'blank') return this.userAnswers[pos];
                return undefined;
            });

            if (values.every(v => v !== undefined)) {
                const result = this.calculateEquation(values, eq.ops);

                if (Math.abs(result - eq.result) < 0.01) {
                    eq.cells.forEach(pos => {
                        const el = document.querySelector(`[data-id="${pos}"]`);
                        if (el) el.classList.add('valid');
                    });

                    const resultEl = document.querySelector(`[data-id="${eq.resultPos}"]`);
                    if (resultEl) resultEl.classList.add('equation-valid');
                }
            }
        });
    }

    handleKeypress(e) {
        if (this.isPaused) return;

        const num = parseInt(e.key);
        if (!isNaN(num) && this.selectedCell && num >= 0 && num <= 99) {
            this.placeNumber(this.selectedCell, num);
        }

        if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectedCell) {
            if (this.userAnswers[this.selectedCell] !== undefined) {
                delete this.userAnswers[this.selectedCell];
                const cellEl = document.querySelector(`[data-id="${this.selectedCell}"]`);
                if (cellEl) {
                    cellEl.textContent = '?';
                    cellEl.classList.remove('filled');
                }
                this.updateBankUsage();
                this.validateEquations();
            }
        }

        if (e.key === 'Enter') this.checkSolution();
        if (e.key === 'Escape') this.showPause();
    }

    useHint() {
        if (this.hintsLeft <= 0) return;

        const emptyCells = Object.keys(this.solution).filter(id => this.userAnswers[id] === undefined);
        if (emptyCells.length === 0) return;

        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.placeNumber(randomCell, this.solution[randomCell]);

        this.hintsLeft--;
        this.hintsUsedThisLevel++;
        this.totalHintsUsed++;
        document.getElementById('hints-left').textContent = this.hintsLeft;
        this.updateIQDisplay();
    }

    checkSolution() {
        const allFilled = Object.keys(this.solution).every(id => this.userAnswers[id] !== undefined);
        if (!allFilled) {
            this.showScreen('wrong-answer');
            return;
        }

        let allCorrect = true;
        Object.keys(this.solution).forEach(id => {
            const cellEl = document.querySelector(`[data-id="${id}"]`);
            if (!cellEl) return;

            // Sayıları tam sayı olarak karşılaştır
            const userAnswer = parseInt(this.userAnswers[id]);
            const correctAnswer = parseInt(this.solution[id]);

            if (userAnswer === correctAnswer) {
                cellEl.classList.add('correct');
            } else {
                cellEl.classList.add('wrong');
                allCorrect = false;
            }
        });

        if (allCorrect) {
            this.levelComplete();
        } else {
            this.showScreen('wrong-answer');
            setTimeout(() => {
                document.querySelectorAll('.wrong').forEach(el => el.classList.remove('wrong'));
            }, 1000);
        }
    }

    startTimer() {
        this.gameStartTime = Date.now();
        this.elapsedTime = 0;
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.elapsedTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
                this.updateTimerDisplay();
                this.updateIQDisplay();
            }
        }, 100);
    }

    updateTimerDisplay() {
        const min = Math.floor(this.elapsedTime / 60);
        const sec = this.elapsedTime % 60;
        document.getElementById('timer').textContent =
            `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    calculateIQ() {
        const config = this.modes[this.currentMode];
        const blanksCount = Object.keys(this.solution).length;
        const optimalTime = blanksCount * 5;
        const timeFactor = Math.max(0, 1 - (this.elapsedTime - optimalTime) / 120);
        const hintPenalty = this.hintsUsedThisLevel * 5;
        const levelBonus = (this.currentLevel - 1) * 2;
        const iq = Math.round(100 + (timeFactor * 50 * config.iqMultiplier) + levelBonus - hintPenalty);
        return Math.max(70, Math.min(180, iq));
    }

    updateIQDisplay() {
        document.getElementById('current-iq').textContent = this.calculateIQ();
    }

    getIQCategory(iq) {
        if (iq >= 160) return { text: 'Genius', color: '#EF4444' };
        if (iq >= 145) return { text: 'Very Superior', color: '#A855F7' };
        if (iq >= 130) return { text: 'Superior', color: '#5B4FE9' };
        if (iq >= 120) return { text: 'Above Average', color: '#10B981' };
        if (iq >= 110) return { text: 'High Average', color: '#F59E0B' };
        if (iq >= 90) return { text: 'Average', color: '#8E8E93' };
        return { text: 'Below Average', color: '#6E6E73' };
    }

    levelComplete() {
        clearInterval(this.timerInterval);
        const iq = this.calculateIQ();
        this.levelStats.push({ level: this.currentLevel, time: this.elapsedTime, hints: this.hintsUsedThisLevel, iq });

        const min = Math.floor(this.elapsedTime / 60);
        const sec = this.elapsedTime % 60;
        document.getElementById('complete-time').textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        document.getElementById('complete-hints').textContent = this.hintsUsedThisLevel;
        document.getElementById('complete-iq').textContent = iq;

        if (this.currentLevel >= this.maxLevels) {
            this.gameComplete();
        } else {
            this.showScreen('level-complete');
        }
    }

    nextLevel() {
        this.currentLevel++;
        this.hideScreen('level-complete');
        this.initLevel();
    }

    gameComplete() {
        clearInterval(this.timerInterval);
        const totalTime = this.levelStats.reduce((sum, s) => sum + s.time, 0);
        const avgIQ = Math.round(this.levelStats.reduce((sum, s) => sum + s.iq, 0) / this.levelStats.length);
        const finalIQ = avgIQ;
        const category = this.getIQCategory(finalIQ);

        document.getElementById('final-iq').textContent = finalIQ;
        document.getElementById('iq-category').textContent = category.text;
        document.getElementById('iq-category').style.color = category.color;
        document.getElementById('total-levels').textContent = this.levelStats.length;
        document.getElementById('total-hints').textContent = this.totalHintsUsed;

        const tMin = Math.floor(totalTime / 60);
        const tSec = totalTime % 60;
        document.getElementById('total-time').textContent = `${tMin.toString().padStart(2, '0')}:${tSec.toString().padStart(2, '0')}`;

        this.saveHighScore(this.currentMode, finalIQ);
        this.showScreen('game-over');
    }

    showPause() {
        this.isPaused = true;
        this.showScreen('pause-screen');
    }

    resumeGame() {
        this.isPaused = false;
        this.hideScreen('pause-screen');
        this.gameStartTime = Date.now() - this.elapsedTime * 1000;
    }

    restartLevel() {
        this.hideScreen('pause-screen');
        this.isPaused = false;
        this.hintsUsedThisLevel = 0;
        this.initLevel();
    }

    quitToMenu() {
        clearInterval(this.timerInterval);
        this.hideScreen('pause-screen');
        this.hideScreen('game-over');
        this.hideScreen('level-complete');
        this.hideScreen('game-screen');
        this.showScreen('menu-screen');
        this.displayHighScores();
    }

    playAgain() {
        this.hideScreen('game-over');
        this.startGame(this.currentMode);
    }

    showScreen(id) { document.getElementById(id).classList.add('active'); }
    hideScreen(id) { document.getElementById(id).classList.remove('active'); }

    randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    loadHighScores() {
        try { return JSON.parse(localStorage.getItem('crossmath_scores')) || {}; }
        catch { return {}; }
    }

    saveHighScore(mode, iq) {
        if (!this.highScores[mode] || iq > this.highScores[mode]) {
            this.highScores[mode] = iq;
            localStorage.setItem('crossmath_scores', JSON.stringify(this.highScores));
        }
    }

    displayHighScores() {
        const container = document.getElementById('scores-list');
        container.innerHTML = '';
        const modes = ['easy', 'medium', 'hard', 'extreme'];
        let hasScores = false;

        modes.forEach(mode => {
            const score = this.highScores[mode];
            if (score) {
                hasScores = true;
                const item = document.createElement('div');
                item.className = 'score-item';
                item.innerHTML = `<strong>${mode.charAt(0).toUpperCase() + mode.slice(1)}</strong>: ${score}`;
                container.appendChild(item);
            }
        });

        if (!hasScores) {
            container.innerHTML = '<div class="score-item">No scores yet</div>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new CrossMathGame();
});
