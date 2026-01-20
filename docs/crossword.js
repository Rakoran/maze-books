// Golden-standard crossword generator and UI
(function () {
  let currentPuzzle = null;
  let wordDatabase = [];

  const DIRS = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 }
  ];
  const MAX_ATTEMPTS = 60;

  function applyBackground(value) {
    const resolved = value && value !== 'default' ? value : '#ffffff';
    document.documentElement.style.setProperty('--puzzle-bg', resolved);
  }

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

  function normalizeEntries(entries) {
    return entries
      .map(e => ({
        answer: (e.answer || '').toUpperCase().replace(/[^A-Z]/g, ''),
        clue: e.clue || ''
      }))
      .filter(e => e.answer.length >= 3);
  }

  function computeGridSize(words) {
    const longest = Math.max(6, ...words.map(w => w.answer.length));
    const byCount = Math.ceil(Math.sqrt(words.length)) * 4;
    return Math.max(10, longest + 2, byCount);
  }

  function areaOfBounds(bounds) {
    if (!bounds) return 0;
    const width = bounds.maxC - bounds.minC + 1;
    const height = bounds.maxR - bounds.minR + 1;
    return width * height;
  }

  function extendBounds(bounds, r, c, dr, dc, len) {
    const endR = r + dr * (len - 1);
    const endC = c + dc * (len - 1);
    const base = bounds
      ? { ...bounds }
      : { minR: r, maxR: r, minC: c, maxC: c };

    const next = {
      minR: Math.min(base.minR, r, endR),
      maxR: Math.max(base.maxR, r, endR),
      minC: Math.min(base.minC, c, endC),
      maxC: Math.max(base.maxC, c, endC)
    };
    next.area = areaOfBounds(next);
    return next;
  }

  function trimGrid(grid, bounds) {
    if (!bounds) return grid;
    const height = bounds.maxR - bounds.minR + 1;
    const width = bounds.maxC - bounds.minC + 1;
    const trimmed = Array.from({ length: height }, () => Array(width).fill(null));

    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      for (let c = bounds.minC; c <= bounds.maxC; c++) {
        trimmed[r - bounds.minR][c - bounds.minC] = grid[r][c];
      }
    }
    return trimmed;
  }

  function shiftPlacements(placements, bounds) {
    if (!bounds) return placements.slice();
    const offsetR = bounds.minR;
    const offsetC = bounds.minC;
    return placements.map(p => ({
      answer: p.answer,
      clue: p.clue,
      r: p.r - offsetR,
      c: p.c - offsetC,
      dr: p.dr,
      dc: p.dc
    }));
  }

  function finalizePuzzle(grid, placements, bounds) {
    if (!placements.length || !bounds) return null;
    return {
      grid: trimGrid(grid, bounds),
      placements: shiftPlacements(placements, bounds),
      bounds: { ...bounds }
    };
  }

  function savePuzzleAsPng() {
    if (!currentPuzzle || !currentPuzzle.grid || !currentPuzzle.grid.length) {
      updateStatus('Generate a crossword before saving.', 'error');
      return;
    }

    const grid = currentPuzzle.grid;
    const rows = grid.length;
    const cols = grid[0].length;
    const style = getComputedStyle(document.documentElement);
    const cellVar = (style.getPropertyValue('--cell') || '').trim();
    const cellSize = parseInt(cellVar, 10) || 30;
    const padding = 12;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cellSize + padding * 2;
    canvas.height = rows * cellSize + padding * 2;
    const ctx = canvas.getContext('2d');

    const bg = (style.getPropertyValue('--puzzle-bg') || '').trim();
    if (bg && bg !== 'transparent') {
      ctx.fillStyle = bg;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const numbers = currentPuzzle.numbers || [];
    const showAnswers = !!currentPuzzle.showingAnswers;
    const numFont = Math.max(10, Math.floor(cellSize * 0.35));
    const letterFont = Math.floor(cellSize * 0.65);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const letter = grid[r][c];
        const x = padding + c * cellSize;
        const y = padding + r * cellSize;

        if (!letter) {
          ctx.fillStyle = '#111';
          ctx.fillRect(x, y, cellSize, cellSize);
          continue;
        }

        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellSize, cellSize);

        const num = numbers[r] ? numbers[r][c] : null;
        if (num) {
          ctx.fillStyle = '#111';
          ctx.font = `${numFont}px Segoe UI, Arial, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(num), x + 2, y + 1);
        }

        if (showAnswers) {
          ctx.fillStyle = '#111';
          ctx.font = `${letterFont}px Segoe UI, Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter, x + cellSize / 2, y + cellSize / 2 + 1);
        }
      }
    }

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crossword.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function findBestPlacement(grid, entry, bounds) {
    const size = grid.length;
    const baseArea = areaOfBounds(bounds);
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
            if (hits < 1 || hits > 2) continue;
            const candidateBounds = extendBounds(bounds, sr, sc, dir.dr, dir.dc, entry.answer.length);
            const areaIncrease = candidateBounds.area - baseArea;
            const center = size / 2;
            const span = Math.abs(sr - center) + Math.abs(sc - center);

            if (
              !best ||
              areaIncrease < best.areaIncrease ||
              (areaIncrease === best.areaIncrease && hits < best.hits) ||
              (areaIncrease === best.areaIncrease && hits === best.hits && span < best.span)
            ) {
              best = {
                r: sr,
                c: sc,
                dr: dir.dr,
                dc: dir.dc,
                hits,
                span,
                areaIncrease,
                newBounds: candidateBounds
              };
            }
          }
        }
      }
    }

    return best;
  }

  function buildPuzzle(words, preferredSize) {
    if (!words.length) return null;
    const size = preferredSize || computeGridSize(words);
    let bestResult = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const grid = makeEmptyGrid(size);
      const placements = [];
      const order = shuffle(words.slice()).sort((a, b) => b.answer.length - a.answer.length);
      const first = order.shift();
      const startR = Math.floor(size / 2);
      const startC = Math.floor((size - first.answer.length) / 2);
      if (!canPlace(grid, first.answer, startR, startC, 0, 1)) continue;
      placeWord(grid, first.answer, startR, startC, 0, 1);
      placements.push({ answer: first.answer, clue: first.clue, r: startR, c: startC, dr: 0, dc: 1 });
      let bounds = extendBounds(null, startR, startC, 0, 1, first.answer.length);

      for (const entry of order) {
        const best = findBestPlacement(grid, entry, bounds);
        if (!best) continue; // discard word if no compliant intersection
        placeWord(grid, entry.answer, best.r, best.c, best.dr, best.dc);
        placements.push({ answer: entry.answer, clue: entry.clue, r: best.r, c: best.c, dr: best.dr, dc: best.dc });
        bounds = best.newBounds;
      }

      const candidate = finalizePuzzle(grid, placements, bounds);
      if (!candidate) continue;

      if (
        !bestResult ||
        candidate.placements.length > bestResult.placements.length ||
        (candidate.placements.length === bestResult.placements.length && candidate.bounds.area < bestResult.bounds.area)
      ) {
        bestResult = candidate;
      }

      if (bestResult.placements.length === words.length) break;
    }

    return bestResult;
  }

  function generateWithResize(words) {
    if (!words.length) return null;
    let size = computeGridSize(words);
    let best = null;
    for (let i = 0; i < 4; i++) {
      const attempt = buildPuzzle(words, size);
      if (
        attempt &&
        (!best ||
          attempt.placements.length > best.placements.length ||
          (attempt.placements.length === best.placements.length && attempt.bounds.area < best.bounds.area))
      ) {
        best = attempt;
      }
      if (best && best.placements.length === words.length) break;
      size += 2;
    }
    return best;
  }

  function computeNumbers(grid) {
    const rows = grid.length;
    const cols = grid[0] ? grid[0].length : 0;
    const numbers = Array.from({ length: rows }, () => Array(cols).fill(null));
    let num = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c]) continue;
        const startsAcross = (c === 0 || !grid[r][c - 1]) && (c + 1 < cols && grid[r][c + 1]);
        const startsDown = (r === 0 || !grid[r - 1][c]) && (r + 1 < rows && grid[r + 1][c]);
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
    return shuffled
      .filter(item => (item.word || '').length >= 3)
      .slice(0, maxWords)
      .map(e => ({
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
    const raw = wordList.map(item => ({
      answer: item.word,
      clue: item.clue || `${(item.word || '').length} letters`
    }));
    return normalizeEntries(raw);
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

    grid.forEach((row, r) => {
      const tr = document.createElement('tr');
      row.forEach((letter, c) => {
        const td = document.createElement('td');
        if (!letter) {
          td.className = 'block';
          tr.appendChild(td);
          return;
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
      });
      table.appendChild(tr);
    });

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

    currentPuzzle.inputs.forEach(input => {
      const expected = input.dataset.answer;
      const value = (input.value || '').toUpperCase();
      total++;
      if (!value) {
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

    if (correct === total && total > 0) {
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
        const wordList = generateWordList(theme, level, 25);
        const entries = buildEntries(wordList);
        if (entries.length === 0) {
          updateStatus('Not enough words for this theme/level.', 'error');
          return;
        }

        let puzzle = null;
        if (!Number.isNaN(sizeInput) && sizeInput > 0) {
          puzzle = buildPuzzle(entries, sizeInput);
        }
        if (!puzzle) {
          puzzle = generateWithResize(entries);
        }

        if (!puzzle) {
          updateStatus('Failed to build crossword. Try a different theme.', 'error');
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
        if (showBtn) {
          showBtn.disabled = false;
          showBtn.textContent = 'Show Answers';
        }
        const printBtn = document.getElementById('printBtn');
        if (printBtn) printBtn.disabled = false;
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.disabled = false;
        const checkBtn = document.getElementById('checkBtn');
        if (checkBtn) checkBtn.disabled = false;
        const saveBtn = document.getElementById('savePngBtn');
        if (saveBtn) saveBtn.disabled = false;
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
  const saveBtn = document.getElementById('savePngBtn');
  if (saveBtn) saveBtn.addEventListener('click', savePuzzleAsPng);

  const bgSelect = document.getElementById('bgSelect');
  if (bgSelect) {
    applyBackground(bgSelect.value);
    bgSelect.addEventListener('change', event => applyBackground(event.target.value));
  } else {
    applyBackground('transparent');
  }

  loadThemes();
})();
