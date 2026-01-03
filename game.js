// Cross Math - IQ Challenge Game
// Soldan sağa hesaplama (işlem önceliği yok)

class CrossMathGame {
    constructor() {
        this.modes = {
            easy: { ops: ['+', '-'], iqMultiplier: 0.8, maxNum: 10 },
            medium: { ops: ['+', '-', '×'], iqMultiplier: 1.0, maxNum: 12 },
            hard: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.3, maxNum: 15 },
            extreme: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.6, maxNum: 20 }
        };

        this.maxLevels = 25;
        this.gameId = null;
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
        // Varsayılan: light mode (gazete teması)
        return localStorage.getItem('crossmath_theme') === 'dark';
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
        document.getElementById('game-id').textContent = `#${this.gameId}`;
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
        // Benzersiz oyun ID'si oluştur
        this.gameId = Math.random().toString(36).substring(2, 8).toUpperCase();

        const config = this.modes[this.currentMode];
        const levelFactor = (this.currentLevel - 1) / (this.maxLevels - 1);
        const modeIndex = ['easy', 'medium', 'hard', 'extreme'].indexOf(this.currentMode);

        // Boşluk oranı
        const baseRatio = 0.35 + modeIndex * 0.08;
        const blankRatio = Math.min(0.7, baseRatio + levelFactor * 0.15);

        // Easy: 2x2 grid
        // Medium: 2x2 -> 3x3 grid
        // Hard/Extreme: template tabanlı düzensiz şekiller
        if (modeIndex === 0) {
            this.buildGrid(2, config, blankRatio);
        } else if (modeIndex === 1) {
            const gridSize = levelFactor < 0.5 ? 2 : 3;
            this.buildGrid(gridSize, config, blankRatio);
        } else {
            const templates = this.getIrregularTemplates(modeIndex, levelFactor);
            const template = templates[Math.floor(Math.random() * templates.length)];
            this.buildFromTemplate(template, config, blankRatio);
        }
    }

    // Düzensiz crossword şekilleri - Basit A op B = C formatında
    getIrregularTemplates(modeIndex, levelFactor) {
        // N=sayı, o=operatör, ==eşittir, .=boş(void)
        // Her denklem: N o N = N (2 sayı, 1 operatör, 1 sonuç)
        const templates = {
            // Hard mode templates (4-6 denklem)
            hard: [
                // Basit çapraz
                `N o N = N
                 o . . . .
                 N o N = N
                 = . = . .
                 N . N . .`,

                // T şekli
                `N o N = N
                 . . o . .
                 . . N . .
                 . . o . .
                 . . N . .
                 . . = . .
                 . . N . .`,

                // L şekli
                `N o N = N
                 o . . . .
                 N o N = N
                 = . . . .
                 N . . . .`,

                // Küçük grid
                `N o N = N
                 o . o . .
                 N o N = N
                 = . = . .
                 N . N . .`
            ],

            // Extreme mode templates (6-10 denklem)
            extreme: [
                // 2x3 grid
                `N o N = N . N o N = N
                 o . . . . . o . . . .
                 N o N = N . N o N = N
                 = . = . . . = . = . .
                 N . N . . . N . N . .`,

                // Merdiven
                `N o N = N . . . .
                 o . . . . . . . .
                 N o N = N . . . .
                 = . o . . . . . .
                 N . N o N = N . .
                 . . = . . . . . .
                 . . N . . . . . .`,

                // H şekli
                `N . . . N . .
                 o . . . o . .
                 N o N o N = N
                 o . . . o . .
                 N . . . N . .
                 = . . . = . .
                 N . . . N . .`,

                // Büyük grid
                `N o N = N . N o N = N
                 o . o . . . o . o . .
                 N o N = N . N o N = N
                 = . = . . . = . = . .
                 N . N . . . N . N . .`
            ]
        };

        const modeKey = modeIndex === 2 ? 'hard' : 'extreme';
        return templates[modeKey];
    }

    // Template'den puzzle oluştur
    buildFromTemplate(templateStr, config, blankRatio) {
        this.solution = {};
        this.equations = [];

        // Template'i parse et
        const rows = templateStr.trim().split('\n').map(row =>
            row.trim().split(/\s+/)
        );

        this.gridRows = rows.length;
        this.gridCols = rows[0].length;
        this.grid = [];

        // Grid'i başlat
        for (let r = 0; r < this.gridRows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.gridCols; c++) {
                const cell = rows[r][c];
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

        // Denklemleri bul ve çöz
        this.findAndSolveEquations(config);

        // Boşlukları belirle
        this.assignBlanks(blankRatio);
    }

    // Denklemleri bul ve matematiksel olarak çöz
    findAndSolveEquations(config) {
        const ops = config.ops;
        const maxNum = Math.min(config.maxNum, 15);
        const numberCells = {};

        // Yatay denklemleri bul
        for (let r = 0; r < this.gridRows; r++) {
            let cells = [], opCells = [];
            for (let c = 0; c < this.gridCols; c++) {
                const cell = this.grid[r][c];
                if (cell.type === 'number') {
                    cells.push([r, c]);
                } else if (cell.type === 'operator') {
                    opCells.push([r, c]);
                } else if (cell.type === 'equals' && cells.length >= 2 && opCells.length >= 1) {
                    // Sonuç hücresini bul
                    for (let nc = c + 1; nc < this.gridCols; nc++) {
                        if (this.grid[r][nc].type === 'number') {
                            this.solveEquation(cells, opCells, [r, nc], 'h', ops, maxNum, numberCells);
                            break;
                        }
                    }
                    cells = []; opCells = [];
                } else if (cell.type === 'void') {
                    cells = []; opCells = [];
                }
            }
        }

        // Dikey denklemleri bul
        for (let c = 0; c < this.gridCols; c++) {
            let cells = [], opCells = [];
            for (let r = 0; r < this.gridRows; r++) {
                const cell = this.grid[r][c];
                if (cell.type === 'number') {
                    cells.push([r, c]);
                } else if (cell.type === 'operator') {
                    opCells.push([r, c]);
                } else if (cell.type === 'equals' && cells.length >= 2 && opCells.length >= 1) {
                    for (let nr = r + 1; nr < this.gridRows; nr++) {
                        if (this.grid[nr][c].type === 'number') {
                            this.solveEquation(cells, opCells, [nr, c], 'v', ops, maxNum, numberCells);
                            break;
                        }
                    }
                    cells = []; opCells = [];
                } else if (cell.type === 'void') {
                    cells = []; opCells = [];
                }
            }
        }
    }

    // Tek bir denklemi çöz
    solveEquation(cells, opCells, resultCell, type, ops, maxNum, numberCells) {
        const numCount = cells.length;
        const eqOps = [];

        // Operatörleri seç
        for (let i = 0; i < opCells.length; i++) {
            eqOps.push(ops[Math.floor(Math.random() * ops.length)]);
        }

        // Sayıları üret
        let nums = [], attempts = 0, result;
        do {
            nums = [];
            for (let i = 0; i < numCount; i++) {
                const [r, c] = cells[i];
                const pos = `${r}-${c}`;
                if (numberCells[pos] !== undefined) {
                    nums.push(numberCells[pos]);
                } else {
                    nums.push(this.randInt(1, maxNum));
                }
            }

            // Güvenli operatörler için sayıları ayarla
            for (let i = 0; i < eqOps.length; i++) {
                if (eqOps[i] === '÷' && (nums[i + 1] === 0 || nums[i] % nums[i + 1] !== 0)) {
                    const div = this.randInt(1, 5);
                    nums[i + 1] = div;
                    nums[i] = div * this.randInt(1, Math.floor(maxNum / div));
                }
                if (eqOps[i] === '-' && nums[i] < nums[i + 1]) {
                    [nums[i], nums[i + 1]] = [nums[i + 1], nums[i]];
                }
            }

            result = this.calculateEquation(nums, eqOps);
            attempts++;
        } while ((result < 0 || result > 99 || !Number.isInteger(result)) && attempts < 50);

        // Sayıları kaydet
        for (let i = 0; i < numCount; i++) {
            const [r, c] = cells[i];
            const pos = `${r}-${c}`;
            numberCells[pos] = nums[i];
            this.grid[r][c].value = nums[i];
        }

        // Operatörleri yerleştir
        for (let i = 0; i < opCells.length; i++) {
            const [r, c] = opCells[i];
            this.grid[r][c].value = eqOps[i];
        }

        // Sonucu yerleştir
        const [rr, rc] = resultCell;
        numberCells[`${rr}-${rc}`] = result;
        this.grid[rr][rc] = { type: 'result', value: result, pos: `${rr}-${rc}` };

        // Denklemi kaydet
        this.equations.push({
            type,
            cells: cells.map(([r, c]) => `${r}-${c}`),
            ops: eqOps,
            result,
            resultPos: `${rr}-${rc}`
        });
    }

    // Boşlukları ata
    assignBlanks(blankRatio) {
        const mainPositions = [];
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                if (this.grid[r][c].type === 'number') {
                    mainPositions.push(`${r}-${c}`);
                }
            }
        }

        this.shuffle(mainPositions);
        const numBlanks = Math.min(mainPositions.length - 1, Math.max(1, Math.floor(mainPositions.length * blankRatio)));
        const blanks = mainPositions.slice(0, numBlanks);

        blanks.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            this.solution[pos] = this.grid[r][c].value;
            this.grid[r][c] = { type: 'blank', pos };
        });
    }

    // Dinamik NxN grid sistemi (2x2, 3x3, 4x4)
    buildGrid(size, config, blankRatio) {
        this.solution = {};
        this.equations = [];

        const ops = config.ops;
        const maxNum = Math.min(config.maxNum, 20);

        // NxN sayı matrisi oluştur
        let numbers = [];
        let hOps = [];
        let vOps = [];
        let hResults = [];
        let vResults = [];
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 100) {
            attempts++;
            valid = true;

            // Sayıları üret
            numbers = [];
            for (let i = 0; i < size; i++) {
                numbers[i] = [];
                for (let j = 0; j < size; j++) {
                    numbers[i][j] = this.randInt(1, maxNum);
                }
            }

            // Yatay operatörler ve sonuçlar
            hOps = [];
            hResults = [];
            for (let i = 0; i < size; i++) {
                hOps[i] = [];
                let result = numbers[i][0];
                for (let j = 0; j < size - 1; j++) {
                    const op = this.pickSafeOp(ops, result, numbers[i][j + 1]);
                    hOps[i][j] = op;
                    result = this.applyOp(result, op, numbers[i][j + 1]);
                }
                hResults[i] = result;
                if (result < 0 || result > 99 || !Number.isInteger(result)) valid = false;
            }

            // Dikey operatörler ve sonuçlar
            vOps = [];
            vResults = [];
            for (let j = 0; j < size; j++) {
                vOps[j] = [];
                let result = numbers[0][j];
                for (let i = 0; i < size - 1; i++) {
                    const op = this.pickSafeOp(ops, result, numbers[i + 1][j]);
                    vOps[j][i] = op;
                    result = this.applyOp(result, op, numbers[i + 1][j]);
                }
                vResults[j] = result;
                if (result < 0 || result > 99 || !Number.isInteger(result)) valid = false;
            }
        }

        // Grid boyutları
        this.gridRows = size * 2 + 1;
        this.gridCols = size * 2 + 1;
        this.grid = [];

        for (let r = 0; r < this.gridRows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.gridCols; c++) {
                this.grid[r][c] = { type: 'void' };
            }
        }

        // Ana sayıları yerleştir
        const mainPositions = [];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const r = i * 2;
                const c = j * 2;
                this.grid[r][c] = { type: 'number', value: numbers[i][j], pos: `${r}-${c}` };
                mainPositions.push(`${r}-${c}`);
            }
        }

        // Yatay operatörler, = ve sonuçlar
        for (let i = 0; i < size; i++) {
            const r = i * 2;
            for (let j = 0; j < size - 1; j++) {
                this.grid[r][j * 2 + 1] = { type: 'operator', value: hOps[i][j] };
            }
            this.grid[r][(size - 1) * 2 + 1] = { type: 'equals', value: '=' };
            this.grid[r][size * 2] = { type: 'result', value: hResults[i], pos: `${r}-${size * 2}` };
        }

        // Dikey operatörler, = ve sonuçlar
        for (let j = 0; j < size; j++) {
            const c = j * 2;
            for (let i = 0; i < size - 1; i++) {
                this.grid[i * 2 + 1][c] = { type: 'operator', value: vOps[j][i] };
            }
            this.grid[(size - 1) * 2 + 1][c] = { type: 'equals', value: '=' };
            this.grid[size * 2][c] = { type: 'result', value: vResults[j], pos: `${size * 2}-${c}` };
        }

        // Denklemleri kaydet
        for (let i = 0; i < size; i++) {
            const cells = [];
            for (let j = 0; j < size; j++) cells.push(`${i * 2}-${j * 2}`);
            this.equations.push({
                type: 'h', cells, ops: hOps[i], result: hResults[i], resultPos: `${i * 2}-${size * 2}`
            });
        }
        for (let j = 0; j < size; j++) {
            const cells = [];
            for (let i = 0; i < size; i++) cells.push(`${i * 2}-${j * 2}`);
            this.equations.push({
                type: 'v', cells, ops: vOps[j], result: vResults[j], resultPos: `${size * 2}-${j * 2}`
            });
        }

        // Boşlukları belirle (en az 1 sayı görünsün)
        this.shuffle(mainPositions);
        const totalMain = size * size;
        const numBlanks = Math.min(totalMain - 1, Math.max(1, Math.floor(totalMain * blankRatio)));
        const blanks = mainPositions.slice(0, numBlanks);

        blanks.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            this.solution[pos] = this.grid[r][c].value;
            this.grid[r][c] = { type: 'blank', pos: pos };
        });
    }

    // Güvenli operatör seç
    pickSafeOp(ops, a, b) {
        const safeOps = ops.filter(op => {
            if (op === '÷') {
                return b !== 0 && a % b === 0;
            }
            if (op === '-') {
                return a >= b;
            }
            return true;
        });
        return safeOps.length > 0 ? safeOps[Math.floor(Math.random() * safeOps.length)] : '+';
    }

    // Soldan sağa hesaplama (işlem önceliği YOK)
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
