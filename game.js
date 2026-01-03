// Cross Math - IQ Challenge Game
// True crossword-style interconnected puzzle

class CrossMathGame {
    constructor() {
        this.modes = {
            easy: { ops: ['+', '-'], iqMultiplier: 0.8, maxNum: 12 },
            medium: { ops: ['+', '-', '×'], iqMultiplier: 1.0, maxNum: 20 },
            hard: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.3, maxNum: 30 },
            extreme: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.6, maxNum: 50 },
            kubo: { ops: ['+', '-', '×', '÷'], iqMultiplier: 2.0, maxNum: 99 }
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
            btn.addEventListener('click', () => {
                console.log('Mode button clicked:', btn.dataset.mode);
                this.startGame(btn.dataset.mode);
            });
        });

        document.getElementById('theme-toggle').addEventListener('click', () => {
            console.log('Theme toggle clicked');
            this.toggleTheme();
        });
        document.getElementById('theme-toggle-game').addEventListener('click', () => {
            console.log('Theme toggle game clicked');
            this.toggleTheme();
        });
        document.getElementById('back-btn').addEventListener('click', () => {
            console.log('Back button clicked');
            this.showPause();
        });
        document.getElementById('hint-btn').addEventListener('click', () => {
            console.log('Hint button clicked');
            this.useHint();
        });
        document.getElementById('check-btn').addEventListener('click', () => {
            console.log('Check button clicked');
            console.log('Solution:', this.solution);
            console.log('User answers:', this.userAnswers);
            this.checkSolution();
        });
        document.getElementById('resume-btn').addEventListener('click', () => {
            console.log('Resume button clicked');
            this.resumeGame();
        });
        document.getElementById('restart-btn').addEventListener('click', () => {
            console.log('Restart button clicked');
            this.restartLevel();
        });
        document.getElementById('quit-btn').addEventListener('click', () => {
            console.log('Quit button clicked');
            this.quitToMenu();
        });
        document.getElementById('next-level-btn').addEventListener('click', () => {
            console.log('Next level button clicked');
            this.nextLevel();
        });
        document.getElementById('play-again-btn').addEventListener('click', () => {
            console.log('Play again button clicked');
            this.playAgain();
        });
        document.getElementById('menu-btn').addEventListener('click', () => {
            console.log('Menu button clicked');
            this.quitToMenu();
        });
        document.getElementById('try-again-btn').addEventListener('click', () => {
            console.log('Try again button clicked');
            this.hideScreen('wrong-answer');
        });

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

        // Mode'a göre boşluk oranı
        const modeBaseRatio = {
            easy: 0.25,
            medium: 0.40,
            hard: 0.55,
            extreme: 0.70,
            kubo: 0.80
        };

        const baseRatio = modeBaseRatio[this.currentMode] || 0.25;
        const maxIncrease = 0.95 - baseRatio;
        const blankRatio = baseRatio + levelFactor * maxIncrease;

        // Template seç (zorluk ve level'a göre)
        const modeIndex = ['easy', 'medium', 'hard', 'extreme', 'kubo'].indexOf(this.currentMode);
        const complexity = modeIndex + Math.floor(this.currentLevel / 6);

        const templates = this.getCrosswordTemplates();
        let available;
        if (complexity <= 1) {
            available = templates.slice(0, 3);
        } else if (complexity <= 3) {
            available = templates.slice(2, 6);
        } else {
            available = templates.slice(4);
        }

        const template = available[Math.floor(Math.random() * available.length)];
        this.buildFromTemplate(template, config, blankRatio);
    }

    getCrosswordTemplates() {
        // Referans görseldeki gibi düzensiz crossword şekilleri
        // N=sayı, o=operatör, ==eşittir, .=boş
        return [
            // Template 1: Basit T şekli
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', '.'],
                    ['.', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.'],
                ]
            },
            // Template 2: L şekli
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', '.'],
                    ['o', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', '.', '.', '.', '.', '.'],
                    ['o', '.', '.', '.', '.', '.', '.'],
                    ['N', 'o', 'N', '=', 'N', '.', '.'],
                    ['=', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', '.', '.', '.', '.', '.'],
                ]
            },
            // Template 3: Çapraz bağlantı
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', '.', '.', '.'],
                    ['.', '.', 'o', '.', '.', '.', '.', '.', '.'],
                    ['.', '.', 'N', 'o', 'N', '=', 'N', '.', '.'],
                    ['.', '.', '=', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', '.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                ]
            },
            // Template 4: H şekli
            {
                layout: [
                    ['N', '.', '.', '.', 'N', '.', '.'],
                    ['o', '.', '.', '.', 'o', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', '.', '.', 'o', '.', '.'],
                    ['N', '.', '.', '.', 'N', '.', '.'],
                    ['=', '.', '.', '.', '=', '.', '.'],
                    ['N', '.', '.', '.', 'N', '.', '.'],
                ]
            },
            // Template 5: Merdiven
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', '.', '.', '.', '.', '.'],
                    ['o', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', 'N', 'o', 'N', '=', 'N', '.', '.', '.', '.'],
                    ['=', '.', 'o', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', 'N', '.', 'N', 'o', 'N', '=', 'N', '.', '.'],
                    ['.', '.', '=', '.', 'o', '.', '.', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', 'N', '.', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', '.', '.', '=', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', 'N', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', '.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                ]
            },
            // Template 6: Artı şekli
            {
                layout: [
                    ['.', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', 'o', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', '=', 'N'],
                    ['.', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.'],
                    ['.', '.', '=', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.'],
                ]
            },
            // Template 7: Z şekli
            {
                layout: [
                    ['N', 'o', 'N', 'o', 'N', '=', 'N', '.', '.'],
                    ['.', '.', '.', '.', 'o', '.', '.', '.', '.'],
                    ['.', '.', 'N', 'o', 'N', '=', 'N', '.', '.'],
                    ['.', '.', 'o', '.', '.', '.', '.', '.', '.'],
                    ['N', 'o', 'N', '=', 'N', '.', '.', '.', '.'],
                    ['=', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', '.', '.', '.', '.', '.', '.', '.'],
                ]
            },
            // Template 8: Kompleks bağlantı
            {
                layout: [
                    ['N', 'o', 'N', '=', 'N', '.', 'N', 'o', 'N', '=', 'N'],
                    ['o', '.', '.', '.', '.', '.', 'o', '.', '.', '.', '.'],
                    ['N', '.', '.', '.', '.', '.', 'N', '.', '.', '.', '.'],
                    ['o', '.', '.', '.', '.', '.', '=', '.', '.', '.', '.'],
                    ['N', 'o', 'N', 'o', 'N', 'o', 'N', '=', 'N', '.', '.'],
                    ['=', '.', 'o', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['N', '.', 'N', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['.', '.', '=', '.', '.', '.', '.', '.', '.', '.', '.'],
                    ['.', '.', 'N', '.', '.', '.', '.', '.', '.', '.', '.'],
                ]
            },
        ];
    }

    buildFromTemplate(template, config, blankRatio) {
        this.solution = {};
        this.equations = [];

        const layout = template.layout;
        this.gridRows = layout.length;
        this.gridCols = layout[0].length;

        // Grid'i başlat
        this.grid = [];
        const numberCells = {}; // pos -> value

        for (let r = 0; r < this.gridRows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.gridCols; c++) {
                const cell = layout[r][c];
                if (cell === 'N') {
                    this.grid[r][c] = { type: 'number', value: null, pos: `${r}-${c}` };
                } else if (cell === 'o') {
                    this.grid[r][c] = { type: 'operator', value: null };
                } else if (cell === '=') {
                    this.grid[r][c] = { type: 'equals', value: '=' };
                } else {
                    this.grid[r][c] = { type: 'void' };
                }
            }
        }

        // Denklemleri bul (yatay ve dikey)
        const equations = this.findEquations(layout);

        // Denklemleri çöz
        const ops = config.ops;
        const maxNum = Math.min(config.maxNum, 20);

        for (const eq of equations) {
            this.solveEquation(eq, ops, maxNum, numberCells);
        }

        // Sayıları grid'e yerleştir
        for (const pos in numberCells) {
            const [r, c] = pos.split('-').map(Number);
            if (this.grid[r][c].type === 'number') {
                this.grid[r][c].value = numberCells[pos];
            }
        }

        // Boşlukları belirle
        const allNumPositions = Object.keys(numberCells);
        const numBlanks = Math.max(1, Math.floor(allNumPositions.length * blankRatio));
        this.shuffle(allNumPositions);
        const blanks = allNumPositions.slice(0, numBlanks);

        blanks.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            this.solution[pos] = numberCells[pos];
            this.grid[r][c] = { type: 'blank', pos: pos };
        });
    }

    findEquations(layout) {
        const equations = [];

        // Yatay denklemler
        for (let r = 0; r < layout.length; r++) {
            let inEquation = false;
            let cells = [];
            let opCells = [];

            for (let c = 0; c < layout[r].length; c++) {
                const cell = layout[r][c];
                if (cell === 'N') {
                    cells.push([r, c]);
                    inEquation = true;
                } else if (cell === 'o' && inEquation) {
                    opCells.push([r, c]);
                } else if (cell === '=' && cells.length >= 2) {
                    // Sonuç hücresini bul
                    for (let nc = c + 1; nc < layout[r].length; nc++) {
                        if (layout[r][nc] === 'N') {
                            equations.push({
                                type: 'h',
                                cells: [...cells],
                                opCells: [...opCells],
                                resultCell: [r, nc]
                            });
                            break;
                        }
                    }
                    cells = [];
                    opCells = [];
                    inEquation = false;
                } else if (cell === '.' && inEquation) {
                    cells = [];
                    opCells = [];
                    inEquation = false;
                }
            }
        }

        // Dikey denklemler
        for (let c = 0; c < layout[0].length; c++) {
            let inEquation = false;
            let cells = [];
            let opCells = [];

            for (let r = 0; r < layout.length; r++) {
                const cell = layout[r][c];
                if (cell === 'N') {
                    cells.push([r, c]);
                    inEquation = true;
                } else if (cell === 'o' && inEquation) {
                    opCells.push([r, c]);
                } else if (cell === '=' && cells.length >= 2) {
                    // Sonuç hücresini bul
                    for (let nr = r + 1; nr < layout.length; nr++) {
                        if (layout[nr][c] === 'N') {
                            equations.push({
                                type: 'v',
                                cells: [...cells],
                                opCells: [...opCells],
                                resultCell: [nr, c]
                            });
                            break;
                        }
                    }
                    cells = [];
                    opCells = [];
                    inEquation = false;
                } else if (cell === '.' && inEquation) {
                    cells = [];
                    opCells = [];
                    inEquation = false;
                }
            }
        }

        return equations;
    }

    solveEquation(eq, ops, maxNum, numberCells) {
        const numCount = eq.cells.length;
        const eqOps = [];

        // Operatörleri seç
        for (let i = 0; i < numCount - 1; i++) {
            eqOps.push(ops[Math.floor(Math.random() * ops.length)]);
        }

        // Sayıları üret (mevcut değerleri koru)
        let nums = [];
        let attempts = 0;
        let result;

        do {
            nums = [];
            for (let i = 0; i < numCount; i++) {
                const [r, c] = eq.cells[i];
                const pos = `${r}-${c}`;
                if (numberCells[pos] !== undefined) {
                    nums.push(numberCells[pos]);
                } else {
                    nums.push(this.randInt(1, maxNum));
                }
            }

            // Operatörlere göre sayıları düzelt
            for (let i = 0; i < eqOps.length; i++) {
                if (eqOps[i] === '÷') {
                    const a = nums[i];
                    const b = nums[i + 1];
                    if (b === 0 || a % b !== 0) {
                        // Tam bölünebilir yap
                        const divisor = this.randInt(1, 5);
                        nums[i + 1] = divisor;
                        nums[i] = divisor * this.randInt(1, Math.floor(maxNum / divisor));
                    }
                } else if (eqOps[i] === '-') {
                    // Çıkarma: ilk sayı ikinciden büyük olsun
                    if (nums[i] < nums[i + 1]) {
                        const temp = nums[i];
                        nums[i] = nums[i + 1];
                        nums[i + 1] = temp;
                    }
                }
            }

            result = this.calculateEquation(nums, eqOps);
            attempts++;
        } while ((result < 0 || result > 99 || !Number.isInteger(result)) && attempts < 50);

        // Sayıları kaydet
        for (let i = 0; i < numCount; i++) {
            const [r, c] = eq.cells[i];
            const pos = `${r}-${c}`;
            numberCells[pos] = nums[i];
        }

        // Sonucu kaydet
        const [rr, rc] = eq.resultCell;
        const resPos = `${rr}-${rc}`;
        numberCells[resPos] = result;
        this.grid[rr][rc] = { type: 'result', value: result, pos: resPos };

        // Operatörleri yerleştir
        for (let i = 0; i < eqOps.length; i++) {
            const [or, oc] = eq.opCells[i];
            this.grid[or][oc].value = eqOps[i];
        }

        // Equation kaydet
        this.equations.push({
            type: eq.type,
            cells: eq.cells.map(([r, c]) => `${r}-${c}`),
            ops: eqOps,
            result: result,
            resultPos: resPos
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
        const modes = ['easy', 'medium', 'hard', 'extreme', 'kubo'];
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
