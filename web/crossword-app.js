// Crossword Puzzle Application
(async function() {
  let currentPuzzle = null;
  let themes = {};
  let wordDatabase = [];

  // Load themes
  async function loadThemes() {
    try {
      const response = await fetch('word-themes.json');
      const data = await response.json();
      wordDatabase = data.wordDatabase || [];
      const themeSet = new Set();
      
      wordDatabase.forEach(entry => {
        if (entry.tags) {
          entry.tags.forEach(tag => themeSet.add(tag));
        }
      });
      
      const themeSelect = document.getElementById('themeSelect');
      Array.from(themeSet).sort().forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
        themeSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load themes:', error);
      updateStatus('Failed to load themes', 'error');
    }
  }

  // Generate word list based on theme and level
  function generateWordList(theme, level, maxWords = 20) {
    let filtered = wordDatabase.filter(entry => {
      const levelNum = parseInt(level);
      const entryLevel = entry.level || 3;
      return entry.tags && entry.tags.includes(theme) && entryLevel <= levelNum;
    });

    if (filtered.length === 0) {
      filtered = wordDatabase.filter(entry => 
        entry.tags && entry.tags.includes(theme)
      );
    }

    const unique = Array.from(new Map((filtered.map(e => [e.word, e]))).values());
    const shuffled = unique.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxWords).map(e => ({
      word: e.word,
      clue: e.clue || `${e.word.length} letters`
    }));
  }

  // Mock CrosswordGenerator class for browser
  class CrosswordGenerator {
    constructor(words, size = 20) {
      this.words = words.map(w => typeof w === 'string' ? w : w.word).sort((a, b) => b.length - a.length);
      this.maxSize = size;
      this.grid = {};
      this.placements = [];
      this.bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    }

    isValidPlacement(word, r, c, dr, dc) {
      const isHorizontal = dc !== 0;
      const placement = [];
      
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i;
        const cc = c + dc * i;
        const key = `${rr},${cc}`;
        
        if (rr < 0 || rr >= this.maxSize || cc < 0 || cc >= this.maxSize) return false;
        
        if (this.grid[key]) {
          if (this.grid[key] !== word[i]) return false;
        } else {
          placement.push({ r: rr, c: cc, char: word[i] });
          
          if (isHorizontal) {
            const above = `${rr - 1},${cc}`;
            const below = `${rr + 1},${cc}`;
            if (this.grid[above] || this.grid[below]) return false;
          } else {
            const left = `${rr},${cc - 1}`;
            const right = `${rr},${cc + 1}`;
            if (this.grid[left] || this.grid[right]) return false;
          }
        }
      }
      
      const before = `${r},${c - 1}`;
      const after = `${r},${c + dc * (word.length - 1) + 1}`;
      if (this.grid[before] || this.grid[after]) return false;
      
      return placement;
    }

    updateBounds(r, c, dr, dc, len) {
      const endR = r + dr * (len - 1);
      const endC = c + dc * (len - 1);
      const minR = Math.min(r, endR);
      const maxR = Math.max(r, endR);
      const minC = Math.min(c, endC);
      const maxC = Math.max(c, endC);

      this.bounds.minX = Math.min(this.bounds.minX, minC);
      this.bounds.maxX = Math.max(this.bounds.maxX, maxC);
      this.bounds.minY = Math.min(this.bounds.minY, minR);
      this.bounds.maxY = Math.max(this.bounds.maxY, maxR);
    }

    generate() {
      if (this.words.length === 0) return null;

      const word = this.words[0];
      const startR = Math.floor(this.maxSize / 2);
      const startC = Math.floor(this.maxSize / 2);

      for (let i = 0; i < word.length; i++) {
        const key = `${startR},${startC + i}`;
        this.grid[key] = word[i];
      }

      this.placements.push({ word, r: startR, c: startC, dr: 0, dc: 1, clue: '' });
      this.updateBounds(startR, startC, 0, 1, word.length);

      this.placeRemaining();
      return this.toGrid();
    }

    placeRemaining() {
      for (let i = 1; i < this.words.length; i++) {
        const w = this.words[i];
        let placed = false;

        for (let attempt = 0; attempt < 150 && !placed; attempt++) {
          const [dr, dc] = Math.random() > 0.5 ? [0, 1] : [1, 0];
          
          for (let tryPos = 0; tryPos < 30; tryPos++) {
            const r = Math.floor(Math.random() * this.maxSize);
            const c = Math.floor(Math.random() * this.maxSize);

            const placement = this.isValidPlacement(w, r, c, dr, dc);
            if (!placement) continue;

            let hasIntersection = false;
            for (let j = 0; j < w.length; j++) {
              const rr = r + dr * j;
              const cc = c + dc * j;
              const key = `${rr},${cc}`;
              const existingLetter = this.grid[key];
              if (existingLetter && existingLetter === w[j]) {
                hasIntersection = true;
                break;
              }
            }

            if (!hasIntersection) continue;

            let intersectionCount = 0;
            for (let j = 0; j < w.length; j++) {
              const rr = r + dr * j;
              const cc = c + dc * j;
              const key = `${rr},${cc}`;
              if (this.grid[key] && this.grid[key] === w[j]) {
                intersectionCount++;
              }
            }
            
            if (intersectionCount > 2) continue;

            placement.forEach(({ r, c, char }) => {
              this.grid[`${r},${c}`] = char;
            });

            this.placements.push({ word: w, r, c, dr, dc, clue: '' });
            this.updateBounds(r, c, dr, dc, w.length);
            placed = true;
            break;
          }
        }
      }
    }

    toGrid() {
      const width = this.bounds.maxX - this.bounds.minX + 1;
      const height = this.bounds.maxY - this.bounds.minY + 1;
      const grid = Array(height).fill(null).map(() => Array(width).fill(null));

      for (const [key, char] of Object.entries(this.grid)) {
        const [r, c] = key.split(',').map(Number);
        grid[r - this.bounds.minY][c - this.bounds.minX] = char;
      }

      return grid;
    }

    getClues() {
      const across = {};
      const down = {};

      const sorted = this.placements.slice().sort((a, b) => {
        if (a.r !== b.r) return a.r - b.r;
        return a.c - b.c;
      });

      let clueNumber = 1;
      sorted.forEach(p => {
        const clue = p.clue || `${p.word.length} letters`;
        if (p.dc !== 0) {
          across[clueNumber] = clue;
        } else {
          down[clueNumber] = clue;
        }
        clueNumber++;
      });

      return { across, down };
    }
  }

  function updateStatus(message, type = 'loading') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
  }

  function generateCrossword() {
    const theme = document.getElementById('themeSelect').value;
    const level = document.getElementById('levelSelect').value;
    const size = parseInt(document.getElementById('sizeInput').value);

    if (!theme) {
      updateStatus('Please select a theme', 'error');
      return;
    }

    updateStatus('Generating crossword...', 'loading');
    
    setTimeout(() => {
      try {
        const wordList = generateWordList(theme, level, 15);
        const words = wordList.map(w => w.word);
        
        const gen = new CrosswordGenerator(words, size);
        gen.generate();

        // Attach clues
        wordList.forEach(wl => {
          const placement = gen.placements.find(p => p.word === wl.word);
          if (placement) {
            placement.clue = wl.clue;
          }
        });

        currentPuzzle = {
          generator: gen,
          grid: gen.toGrid(),
          clues: gen.getClues(),
          answers: {}
        };

        // Store answers for checking
        gen.placements.forEach(p => {
          currentPuzzle.answers[p.word] = true;
        });

        renderGrid();
        renderClues();
        updateStatus(`Crossword generated with ${gen.placements.length} words`, 'success');

        document.getElementById('showAnswersBtn').disabled = false;
        document.getElementById('printBtn').disabled = false;
        document.getElementById('resetBtn').disabled = false;
        document.getElementById('checkBtn').disabled = false;
      } catch (error) {
        console.error('Generation error:', error);
        updateStatus('Failed to generate crossword', 'error');
      }
    }, 100);
  }

  function renderGrid() {
    if (!currentPuzzle) return;

    const gridDiv = document.getElementById('grid');
    gridDiv.innerHTML = '';

    const grid = currentPuzzle.grid;
    const width = grid[0] ? grid[0].length : 0;

    grid.forEach((row, rowIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'grid-row';

      row.forEach((cell, colIndex) => {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'cell';

        if (cell) {
          cellDiv.className += ' empty';
          const input = document.createElement('input');
          input.type = 'text';
          input.maxLength = '1';
          input.dataset.row = rowIndex;
          input.dataset.col = colIndex;
          input.value = '';
          cellDiv.appendChild(input);
        } else {
          cellDiv.className += ' black';
        }

        rowDiv.appendChild(cellDiv);
      });

      gridDiv.appendChild(rowDiv);
    });
  }

  function renderClues() {
    if (!currentPuzzle) return;

    const cluesDiv = document.getElementById('cluesContent');
    cluesDiv.innerHTML = '';

    const { across, down } = currentPuzzle.clues;

    const acrossSection = document.createElement('div');
    acrossSection.className = 'clues-section';
    acrossSection.innerHTML = '<h3>Across</h3>';
    const acrossList = document.createElement('div');
    Object.entries(across).forEach(([num, clue]) => {
      const clueDiv = document.createElement('div');
      clueDiv.className = 'clue';
      clueDiv.innerHTML = `<strong>${num}.</strong> ${clue}`;
      acrossList.appendChild(clueDiv);
    });
    acrossSection.appendChild(acrossList);
    cluesDiv.appendChild(acrossSection);

    const downSection = document.createElement('div');
    downSection.className = 'clues-section';
    downSection.innerHTML = '<h3>Down</h3>';
    const downList = document.createElement('div');
    Object.entries(down).forEach(([num, clue]) => {
      const clueDiv = document.createElement('div');
      clueDiv.className = 'clue';
      clueDiv.innerHTML = `<strong>${num}.</strong> ${clue}`;
      downList.appendChild(clueDiv);
    });
    downSection.appendChild(downList);
    cluesDiv.appendChild(downSection);
  }

  // Event listeners
  document.getElementById('generateBtn').addEventListener('click', generateCrossword);

  document.getElementById('showAnswersBtn').addEventListener('click', () => {
    if (!currentPuzzle) return;
    const inputs = document.querySelectorAll('.cell input');
    const grid = currentPuzzle.grid;
    inputs.forEach(input => {
      const row = parseInt(input.dataset.row);
      const col = parseInt(input.dataset.col);
      input.value = grid[row][col] || '';
    });
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!currentPuzzle) return;
    const inputs = document.querySelectorAll('.cell input');
    inputs.forEach(input => input.value = '');
  });

  document.getElementById('printBtn').addEventListener('click', () => {
    window.print();
  });

  // Initialize
  loadThemes();
})();
