// Crossword Puzzle Application
(async function() {
  let currentPuzzle = null;
  let wordDatabase = [];

  const DIRS = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 }
  ];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeEmptyGrid(size) {
    return Array.from({ length: size }, () => Array(size).fill(null));
  }

  function inBounds(size, r, c) {
    return r >= 0 && c >= 0 && r < size && c < size;
  }

  function canPlace(grid, word, startR, startC, dr, dc) {
    const size = grid.length;
    const endR = startR + dr * (word.length - 1);
    const endC = startC + dc * (word.length - 1);

    if (!inBounds(size, startR, startC) || !inBounds(size, endR, endC)) {
      return false;
    }

    const prevR = startR - dr;
    const prevC = startC - dc;
    const nextR = endR + dr;
    const nextC = endC + dc;

    if (inBounds(size, prevR, prevC) && grid[prevR][prevC]) return false;
    if (inBounds(size, nextR, nextC) && grid[nextR][nextC]) return false;

    for (let i = 0; i < word.length; i++) {
      const rr = startR + dr * i;
      const cc = startC + dc * i;
      const cell = grid[rr][cc];

      if (cell && cell !== word[i]) return false;

      if (!cell) {
        if (dr === 0) {
          if ((inBounds(size, rr - 1, cc) && grid[rr - 1][cc]) || (inBounds(size, rr + 1, cc) && grid[rr + 1][cc])) {
            return false;
          }
        } else {
          if ((inBounds(size, rr, cc - 1) && grid[rr][cc - 1]) || (inBounds(size, rr, cc + 1) && grid[rr][cc + 1])) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function placeWord(grid, word, startR, startC, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const rr = startR + dr * i;
      const cc = startC + dc * i;
      grid[rr][cc] = word[i];
    }
  }

  function countIntersections(grid, word, startR, startC, dr, dc) {
    let hits = 0;
    for (let i = 0; i < word.length; i++) {
      const rr = startR + dr * i;
      const cc = startC + dc * i;
      if (grid[rr][cc]) hits++;
    }
    return hits;
  }

  function countInnerIntersections(grid, word, startR, startC, dr, dc) {
    let hits = 0;
    for (let i = 1; i < word.length - 1; i++) {
      const rr = startR + dr * i;
      const cc = startC + dc * i;
      if (grid[rr][cc]) hits++;
    }
    return hits;
  }

  function computeGridSize(entries) {
    const longest = Math.max(6, ...entries.map(e => e.answer.length));
    const byCount = Math.ceil(Math.sqrt(entries.length)) * 4;
    return Math.max(10, longest + 2, byCount);
  }

  function generate(entries, preferredSize) {
    const words = entries
      .map(e => ({ answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ''), clue: e.clue || '' }))
      .filter(e => e.answer.length > 1);

    if (words.length === 0) return null;

    const size = preferredSize || computeGridSize(words);
    let bestResult = null;

    for (let attempt = 0; attempt < 30; attempt++) {
      const grid = makeEmptyGrid(size);
      const placements = [];
      const order = shuffle(words.slice()).sort((a, b) => b.answer.length - a.answer.length);
      const first = order.shift();
      const startR = Math.floor(size / 2);
      const startC = Math.floor((size - first.answer.length) / 2);
      if (!canPlace(grid, first.answer, startR, startC, 0, 1)) continue;
      placeWord(grid, first.answer, startR, startC, 0, 1);
      placements.push({ answer: first.answer, clue: first.clue, r: startR, c: startC, dr: 0, dc: 1 });

      for (const entry of order) {
        let best = null;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cell = grid[r][c];
            if (!cell) continue;
            for (let i = 0; i < entry.answer.length; i++) {
              if (entry.answer[i] !== cell) continue;
              for (const dir of DIRS) {
                const sr = r - dir.dr * i;
                const sc = c - dir.dc * i;
                if (!canPlace(grid, entry.answer, sr, sc, dir.dr, dir.dc)) continue;
                const hits = countIntersections(grid, entry.answer, sr, sc, dir.dr, dir.dc);
                const innerHits = entry.answer.length <= 2 ? hits : countInnerIntersections(grid, entry.answer, sr, sc, dir.dr, dir.dc);
                if (innerHits < 1) continue;
                if (!best || innerHits > best.hits) {
                  best = { r: sr, c: sc, dr: dir.dr, dc: dir.dc, hits: innerHits };
                }
              }
            }
          }
        }

        if (!best) {
          for (let r = 0; r < size && !best; r++) {
            for (let c = 0; c < size && !best; c++) {
              const cell = grid[r][c];
              if (!cell) continue;
              for (let i = 0; i < entry.answer.length; i++) {
                if (entry.answer[i] !== cell) continue;
                for (const dir of DIRS) {
                  const sr = r - dir.dr * i;
                  const sc = c - dir.dc * i;
                  if (!canPlace(grid, entry.answer, sr, sc, dir.dr, dir.dc)) continue;
                  const hits = countIntersections(grid, entry.answer, sr, sc, dir.dr, dir.dc);
                  if (hits < 1) continue;
                  best = { r: sr, c: sc, dr: dir.dr, dc: dir.dc, hits };
                  break;
                }
                if (best) break;
              }
            }
          }
        }

        if (!best) {
          for (let r = 0; r < size && !best; r++) {
            for (let c = 0; c < size && !best; c++) {
              for (const dir of DIRS) {
                if (!canPlace(grid, entry.answer, r, c, dir.dr, dir.dc)) continue;
                best = { r, c, dr: dir.dr, dc: dir.dc, hits: 0 };
                break;
              }
            }
          }
        }

        if (best) {
          placeWord(grid, entry.answer, best.r, best.c, best.dr, best.dc);
          placements.push({ answer: entry.answer, clue: entry.clue, r: best.r, c: best.c, dr: best.dr, dc: best.dc });
        }
      }

      if (!bestResult || placements.length > bestResult.placements.length) {
        bestResult = { grid, placements };
      }

      if (bestResult && bestResult.placements.length === words.length) {
        break;
      }
    }

    return bestResult;
  }

  function generateWithResize(entries) {
    const words = entries
      .map(e => ({ answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ''), clue: e.clue || '' }))
      .filter(e => e.answer.length > 1);

    if (words.length === 0) return null;

    let size = computeGridSize(words);
    let best = null;
    for (let i = 0; i < 4; i++) {
      const attempt = generate(words, size);
      if (attempt && (!best || attempt.placements.length > best.placements.length)) {
        best = attempt;
      }
      if (best && best.placements.length === words.length) break;
      size += 2;
    }
    return best;
  }

  function computeNumbers(grid) {
    const size = grid.length;
    const numbers = Array.from({ length: size }, () => Array(size).fill(null));
    let num = 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) continue;
        const startsAcross = (c === 0 || !grid[r][c - 1]) && (c + 1 < size && grid[r][c + 1]);
        const startsDown = (r === 0 || !grid[r - 1][c]) && (r + 1 < size && grid[r + 1][c]);
        if (startsAcross || startsDown) {
          numbers[r][c] = num++;
        }
      }
    }
    return numbers;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);
  }

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

  function generateWordList(theme, level, maxWords = 20) {
    let filtered = wordDatabase.filter(entry => {
      const levelNum = parseInt(level, 10);
      const entryLevel = entry.level || 3;
      return entry.tags && entry.tags.includes(theme) && entryLevel <= levelNum;
    });

    if (filtered.length === 0) {
      filtered = wordDatabase.filter(entry => entry.tags && entry.tags.includes(theme));
    }

    const unique = Array.from(new Map(filtered.map(e => [e.word, e])).values());
    const shuffled = unique.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxWords).map(e => ({
      word: e.word,
      clue: e.clue || `${e.word.length} letters`
    }));
  }

  function updateStatus(message, type = 'loading') {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = message;
    status.className = 'status ' + type;
  }

  function buildEntries(wordList) {
    return wordList
      .map(item => ({
        answer: (item.word || '').toUpperCase().replace(/[^A-Z]/g, ''),
        clue: item.clue || `${item.word.length} letters`
      }))
      .filter(entry => entry.answer.length > 1);
  }

  function handleCellInput(event) {
    if (!currentPuzzle || currentPuzzle.showingAnswers) return;
    const input = event.target;
    const normalized = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    input.value = normalized.slice(-1);
    const cellId = input.dataset.cell;
    if (!input.value) {
      delete currentPuzzle.userEntries[cellId];
    } else {
      currentPuzzle.userEntries[cellId] = input.value;
    }
    input.classList.remove('correct', 'incorrect');
  }

  function renderGrid() {
    if (!currentPuzzle) return;

    const gridDiv = document.getElementById('grid');
    gridDiv.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'grid crossword';
    currentPuzzle.inputs = [];

    const { grid, numbers } = currentPuzzle;

    for (let r = 0; r < grid.length; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < grid[r].length; c++) {
        const td = document.createElement('td');
        const letter = grid[r][c];

        if (!letter) {
          td.className = 'block';
          tr.appendChild(td);
          continue;
        }

        const num = numbers[r][c];
        if (num) {
          const numSpan = document.createElement('span');
          numSpan.className = 'num';
          numSpan.textContent = num;
          td.appendChild(numSpan);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.dataset.answer = letter;
        input.dataset.cell = `${r}-${c}`;
        input.value = currentPuzzle.userEntries[input.dataset.cell] || '';
        input.autocomplete = 'off';
        input.addEventListener('input', handleCellInput);
        input.addEventListener('focus', () => input.select());
        currentPuzzle.inputs.push(input);
        td.appendChild(input);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    gridDiv.appendChild(table);
  }

  function renderClues(placements, numbers) {
    const cluesDiv = document.getElementById('cluesContent');
    if (!cluesDiv) return;

    const mapped = placements
      .map(p => {
        const num = numbers[p.r][p.c];
        if (!num) return null;
        const dir = p.dr === 0 && p.dc === 1 ? 'across' : 'down';
        return { num, dir, clue: p.clue || p.answer };
      })
      .filter(Boolean);

    const across = mapped.filter(c => c.dir === 'across').sort((a, b) => a.num - b.num);
    const down = mapped.filter(c => c.dir === 'down').sort((a, b) => a.num - b.num);

    const renderList = list => list.map(item => `<li><strong>${item.num}.</strong> ${escapeHtml(item.clue)}</li>`).join('') || '<li>No clues yet</li>';

    cluesDiv.innerHTML = `
      <div class="clues">
        <div>
          <h3>Across</h3>
          <ol>${renderList(across)}</ol>
        </div>
        <div>
          <h3>Down</h3>
          <ol>${renderList(down)}</ol>
        </div>
      </div>
    `;
  }

  function toggleAnswers() {
    if (!currentPuzzle) return;
    const show = !currentPuzzle.showingAnswers;
    currentPuzzle.showingAnswers = show;

    currentPuzzle.inputs.forEach(input => {
      const cellId = input.dataset.cell;
      if (show) {
        input.value = input.dataset.answer;
        input.readOnly = true;
      } else {
        input.value = currentPuzzle.userEntries[cellId] || '';
        input.readOnly = false;
      }
      input.classList.remove('correct', 'incorrect');
    });

    const button = document.getElementById('showAnswersBtn');
    button.textContent = show ? 'Hide Answers' : 'Show Answers';
  }

  function resetPuzzleInputs() {
    if (!currentPuzzle) return;
    currentPuzzle.userEntries = {};
    currentPuzzle.showingAnswers = false;
    currentPuzzle.inputs.forEach(input => {
      input.readOnly = false;
      input.value = '';
      input.classList.remove('correct', 'incorrect');
    });
    document.getElementById('showAnswersBtn').textContent = 'Show Answers';
    updateStatus('Puzzle cleared. Happy solving!', 'info');
  }

  function checkPuzzle() {
    if (!currentPuzzle) return;

    let total = 0;
    let correct = 0;
    let blanks = 0;

    currentPuzzle.inputs.forEach(input => {
      const expected = input.dataset.answer;
      const value = (input.value || '').toUpperCase();
      total++;
      if (!value) {
        blanks++;
        input.classList.remove('correct', 'incorrect');
        return;
      }
      if (value === expected) {
        correct++;
        input.classList.add('correct');
        input.classList.remove('incorrect');
      } else {
        input.classList.add('incorrect');
        input.classList.remove('correct');
      }
    });

    if (correct === total && blanks === 0) {
      updateStatus('Great job! Puzzle solved!', 'success');
    } else {
      const remaining = total - correct;
      updateStatus(`Keep going! ${remaining} letters still need attention.`, 'info');
    }
  }

  function generateCrossword() {
    const theme = document.getElementById('themeSelect').value;
    const level = document.getElementById('levelSelect').value;
    const sizeInput = parseInt(document.getElementById('sizeInput').value, 10);

    if (!theme) {
      updateStatus('Please select a theme', 'error');
      return;
    }

    updateStatus('Generating crossword...', 'loading');

    setTimeout(() => {
      try {
        const wordList = generateWordList(theme, level, 20);
        const entries = buildEntries(wordList);
        if (entries.length === 0) {
          updateStatus('Not enough words for this theme/level.', 'error');
          return;
        }

        let puzzle = null;
        if (!Number.isNaN(sizeInput) && sizeInput > 0) {
          puzzle = generate(entries, sizeInput);
        }
        if (!puzzle) {
          puzzle = generateWithResize(entries);
        }

        if (!puzzle) {
          updateStatus('Failed to build crossword. Try a smaller grid or different theme.', 'error');
          return;
        }

        const numbers = computeNumbers(puzzle.grid);
        currentPuzzle = {
          grid: puzzle.grid,
          numbers,
          placements: puzzle.placements,
          userEntries: {},
          showingAnswers: false,
          inputs: []
        };

        renderGrid();
        renderClues(puzzle.placements, numbers);

        updateStatus(`Crossword generated with ${puzzle.placements.length} words`, 'success');

        const showBtn = document.getElementById('showAnswersBtn');
        showBtn.disabled = false;
        showBtn.textContent = 'Show Answers';
        document.getElementById('printBtn').disabled = false;
        document.getElementById('resetBtn').disabled = false;
        document.getElementById('checkBtn').disabled = false;
      } catch (error) {
        console.error('Generation error:', error);
        updateStatus('Failed to generate crossword', 'error');
      }
    }, 50);
  }

  document.getElementById('generateBtn').addEventListener('click', generateCrossword);
  document.getElementById('showAnswersBtn').addEventListener('click', toggleAnswers);
  document.getElementById('resetBtn').addEventListener('click', resetPuzzleInputs);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('checkBtn').addEventListener('click', checkPuzzle);

  loadThemes();
})();
