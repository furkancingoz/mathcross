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

        // Mode'a göre başlangıç boşluk oranı
        const modeBaseRatio = {
            easy: 0.25,
            medium: 0.40,
            hard: 0.55,
            extreme: 0.70
        };

        const baseRatio = modeBaseRatio[this.currentMode] || 0.25;
        const maxIncrease = 0.90 - baseRatio;
        const blankRatio = baseRatio + levelFactor * maxIncrease;

        // Grid boyutu seç (zorluk ve level'a göre)
        const modeIndex = ['easy', 'medium', 'hard', 'extreme'].indexOf(this.currentMode);
        const complexity = modeIndex + Math.floor(this.currentLevel / 8);

        let gridSize;
        if (complexity <= 1) {
            gridSize = 2; // 2x2 grid
        } else if (complexity <= 2) {
            gridSize = 3; // 3x3 grid
        } else {
            gridSize = 4; // 4x4 grid
        }

        this.buildMathGrid(gridSize, config, blankRatio);
    }

    // Matematiksel olarak doğru grid oluştur
    buildMathGrid(size, config, blankRatio) {
        this.solution = {};
        this.equations = [];

        // Grid boyutları: her hücre için sayı + operatör + sonuç
        this.gridRows = size * 2 + 1;
        this.gridCols = size * 2 + 1;

        // Grid'i başlat
        this.grid = [];
        for (let r = 0; r < this.gridRows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.gridCols; c++) {
                this.grid[r][c] = { type: 'void' };
            }
        }

        const ops = config.ops;
        const maxNum = config.maxNum;

        // Sayı matrisini oluştur (size x size)
        const numbers = [];
        for (let i = 0; i < size; i++) {
            numbers[i] = [];
            for (let j = 0; j < size; j++) {
                numbers[i][j] = this.randInt(1, Math.min(maxNum, 15));
            }
        }

        // Yatay operatörler ve sonuçlar
        const hOps = [];
        const hResults = [];
        for (let i = 0; i < size; i++) {
            hOps[i] = [];
            // Her satır için operatörler seç
            for (let j = 0; j < size - 1; j++) {
                hOps[i][j] = this.pickSafeOp(ops, numbers[i][j], numbers[i][j + 1]);
            }
            // Sonucu hesapla
            hResults[i] = this.calculateRow(numbers[i], hOps[i]);
        }

        // Dikey operatörler ve sonuçlar
        const vOps = [];
        const vResults = [];
        for (let j = 0; j < size; j++) {
            vOps[j] = [];
            const column = numbers.map(row => row[j]);
            // Her sütun için operatörler seç
            for (let i = 0; i < size - 1; i++) {
                vOps[j][i] = this.pickSafeOp(ops, column[i], column[i + 1]);
            }
            // Sonucu hesapla
            vResults[j] = this.calculateRow(column, vOps[j]);
        }

        // Grid'e yerleştir
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const r = i * 2;
                const c = j * 2;
                this.grid[r][c] = {
                    type: 'number',
                    value: numbers[i][j],
                    pos: `${r}-${c}`
                };
            }
        }

        // Yatay operatörler
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size - 1; j++) {
                const r = i * 2;
                const c = j * 2 + 1;
                this.grid[r][c] = {
                    type: 'operator',
                    value: hOps[i][j]
                };
            }
        }

        // Yatay eşittir ve sonuçlar
        for (let i = 0; i < size; i++) {
            const r = i * 2;
            const eqCol = (size - 1) * 2 + 1;
            const resCol = size * 2;

            this.grid[r][eqCol] = { type: 'equals', value: '=' };
            this.grid[r][resCol] = {
                type: 'result',
                value: hResults[i],
                pos: `${r}-${resCol}`
            };

            // Equation kaydet
            const cells = [];
            for (let j = 0; j < size; j++) {
                cells.push(`${r}-${j * 2}`);
            }
            this.equations.push({
                type: 'h',
                cells: cells,
                ops: hOps[i],
                result: hResults[i],
                resultPos: `${r}-${resCol}`
            });
        }

        // Dikey operatörler
        for (let j = 0; j < size; j++) {
            for (let i = 0; i < size - 1; i++) {
                const r = i * 2 + 1;
                const c = j * 2;
                this.grid[r][c] = {
                    type: 'operator',
                    value: vOps[j][i]
                };
            }
        }

        // Dikey eşittir ve sonuçlar
        for (let j = 0; j < size; j++) {
            const c = j * 2;
            const eqRow = (size - 1) * 2 + 1;
            const resRow = size * 2;

            this.grid[eqRow][c] = { type: 'equals', value: '=' };
            this.grid[resRow][c] = {
                type: 'result',
                value: vResults[j],
                pos: `${resRow}-${c}`
            };

            // Equation kaydet
            const cells = [];
            for (let i = 0; i < size; i++) {
                cells.push(`${i * 2}-${c}`);
            }
            this.equations.push({
                type: 'v',
                cells: cells,
                ops: vOps[j],
                result: vResults[j],
                resultPos: `${resRow}-${c}`
            });
        }

        // Boşluk pozisyonlarını belirle
        const allNumPositions = [];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                allNumPositions.push(`${i * 2}-${j * 2}`);
            }
        }

        const numBlanks = Math.max(1, Math.floor(allNumPositions.length * blankRatio));
        this.shuffle(allNumPositions);
        const blanks = allNumPositions.slice(0, numBlanks);

        blanks.forEach(pos => {
            const [r, c] = pos.split('-').map(Number);
            this.solution[pos] = this.grid[r][c].value;
            this.grid[r][c] = { type: 'blank', pos: pos };
        });
    }

    // Güvenli operatör seç (bölme için tam bölünebilir olmalı)
    pickSafeOp(ops, a, b) {
        const safeOps = ops.filter(op => {
            if (op === '÷') {
                return b !== 0 && a % b === 0 && a / b <= 20;
            }
            return true;
        });
        return safeOps.length > 0
            ? safeOps[Math.floor(Math.random() * safeOps.length)]
            : '+';
    }

    // Satır/sütun hesapla
    calculateRow(nums, ops) {
        let result = nums[0];
        for (let i = 0; i < ops.length; i++) {
            result = this.applyOp(result, ops[i], nums[i + 1]);
        }
        return result;
    }

    calculateEquation(nums, ops) {
        return this.calculateRow(nums, ops);
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
