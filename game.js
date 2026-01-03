// Cross Math - IQ Challenge Game
// Soldan sağa hesaplama (işlem önceliği yok)

class CrossMathGame {
    constructor() {
        this.modes = {
            easy: { ops: ['+', '-'], iqMultiplier: 0.8, maxNum: 12 },
            medium: { ops: ['+', '-', '×'], iqMultiplier: 1.0, maxNum: 15 },
            hard: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.3, maxNum: 20 },
            extreme: { ops: ['+', '-', '×', '÷'], iqMultiplier: 1.6, maxNum: 30 },
            kubo: { ops: ['+', '-', '×', '÷'], iqMultiplier: 2.0, maxNum: 50 }
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

        // Mode'a göre boşluk sayısı (2x2 grid = 4 ana sayı, max 3 boşluk)
        const modeBlankCount = {
            easy: [1, 2],      // 1-2 boşluk
            medium: [1, 2],    // 1-2 boşluk
            hard: [2, 3],      // 2-3 boşluk
            extreme: [2, 3],   // 2-3 boşluk
            kubo: [3, 3]       // 3 boşluk (max)
        };

        const [minBlanks, maxBlanks] = modeBlankCount[this.currentMode] || [1, 2];
        const blankCount = minBlanks + Math.floor(levelFactor * (maxBlanks - minBlanks + 1));

        this.buildSimpleGrid(config, blankCount);
    }

    // Basit ve güvenilir 3x3 grid sistemi
    buildSimpleGrid(config, blankCount) {
        this.solution = {};
        this.equations = [];

        // 3x3 sayı gridi (toplam 9 sayı)
        // Her satır: A op B = C (soldan sağa hesaplama)
        // Her sütun: D op E = F (yukarıdan aşağı hesaplama)

        const ops = config.ops;
        const maxNum = config.maxNum;

        // Grid yapısı:
        // [0,0] [op] [0,1] [=] [0,2]
        // [op]       [op]
        // [1,0] [op] [1,1] [=] [1,2]
        // [=]        [=]
        // [2,0]      [2,1]

        let valid = false;
        let numbers, hOps, vOps, hResults, vResults;
        let attempts = 0;

        while (!valid && attempts < 100) {
            attempts++;

            // 2x2 ana sayıları rastgele üret
            numbers = [
                [0, 0],
                [0, 0]
            ];

            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    numbers[i][j] = this.randInt(1, Math.min(maxNum, 15));
                }
            }

            // Yatay operatörler (2 satır için)
            hOps = [
                this.pickSafeOp(ops, numbers[0][0], numbers[0][1]),
                this.pickSafeOp(ops, numbers[1][0], numbers[1][1])
            ];

            // Dikey operatörler (2 sütun için)
            vOps = [
                this.pickSafeOp(ops, numbers[0][0], numbers[1][0]),
                this.pickSafeOp(ops, numbers[0][1], numbers[1][1])
            ];

            // Yatay sonuçları hesapla (soldan sağa - işlem önceliği YOK)
            hResults = [
                this.applyOp(numbers[0][0], hOps[0], numbers[0][1]),
                this.applyOp(numbers[1][0], hOps[1], numbers[1][1])
            ];

            // Dikey sonuçları hesapla (yukarıdan aşağı - işlem önceliği YOK)
            vResults = [
                this.applyOp(numbers[0][0], vOps[0], numbers[1][0]),
                this.applyOp(numbers[0][1], vOps[1], numbers[1][1])
            ];

            // Tüm sonuçlar pozitif ve tam sayı mı kontrol et
            valid = hResults.every(r => r >= 0 && r <= 99 && Number.isInteger(r)) &&
                    vResults.every(r => r >= 0 && r <= 99 && Number.isInteger(r));
        }

        // Grid'i oluştur (5 satır x 5 sütun)
        this.gridRows = 5;
        this.gridCols = 5;
        this.grid = [];

        for (let r = 0; r < this.gridRows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.gridCols; c++) {
                this.grid[r][c] = { type: 'void' };
            }
        }

        // Sayıları yerleştir
        const numPositions = [
            { r: 0, c: 0, val: numbers[0][0] },
            { r: 0, c: 2, val: numbers[0][1] },
            { r: 0, c: 4, val: hResults[0] },
            { r: 2, c: 0, val: numbers[1][0] },
            { r: 2, c: 2, val: numbers[1][1] },
            { r: 2, c: 4, val: hResults[1] },
            { r: 4, c: 0, val: vResults[0] },
            { r: 4, c: 2, val: vResults[1] }
        ];

        numPositions.forEach(({ r, c, val }) => {
            this.grid[r][c] = { type: 'number', value: val, pos: `${r}-${c}` };
        });

        // Sonuçları result olarak işaretle
        this.grid[0][4] = { type: 'result', value: hResults[0], pos: '0-4' };
        this.grid[2][4] = { type: 'result', value: hResults[1], pos: '2-4' };
        this.grid[4][0] = { type: 'result', value: vResults[0], pos: '4-0' };
        this.grid[4][2] = { type: 'result', value: vResults[1], pos: '4-2' };

        // Operatörleri yerleştir
        this.grid[0][1] = { type: 'operator', value: hOps[0] };
        this.grid[0][3] = { type: 'equals', value: '=' };
        this.grid[2][1] = { type: 'operator', value: hOps[1] };
        this.grid[2][3] = { type: 'equals', value: '=' };
        this.grid[1][0] = { type: 'operator', value: vOps[0] };
        this.grid[1][2] = { type: 'operator', value: vOps[1] };
        this.grid[3][0] = { type: 'equals', value: '=' };
        this.grid[3][2] = { type: 'equals', value: '=' };

        // Denklemleri kaydet
        this.equations = [
            { type: 'h', cells: ['0-0', '0-2'], ops: [hOps[0]], result: hResults[0], resultPos: '0-4' },
            { type: 'h', cells: ['2-0', '2-2'], ops: [hOps[1]], result: hResults[1], resultPos: '2-4' },
            { type: 'v', cells: ['0-0', '2-0'], ops: [vOps[0]], result: vResults[0], resultPos: '4-0' },
            { type: 'v', cells: ['0-2', '2-2'], ops: [vOps[1]], result: vResults[1], resultPos: '4-2' }
        ];

        // Boşlukları belirle (en az 1 ipucu sayı kalmalı)
        const mainNumberPositions = ['0-0', '0-2', '2-0', '2-2'];
        this.shuffle(mainNumberPositions);

        // Max 3 boşluk - her zaman en az 1 sayı görünsün
        const actualBlanks = Math.min(blankCount, 3);
        const blanks = mainNumberPositions.slice(0, actualBlanks);

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
