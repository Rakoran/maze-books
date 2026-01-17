// Simple Sudoku generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function makeGrid(){
    return Array.from({length:9},()=>Array(9).fill(0));
  }

  function isSafe(grid, r, c, val){
    for(let i=0;i<9;i++){
      if(grid[r][i]===val || grid[i][c]===val) return false;
    }
    const br = Math.floor(r/3)*3;
    const bc = Math.floor(c/3)*3;
    for(let rr=br; rr<br+3; rr++){
      for(let cc=bc; cc<bc+3; cc++){
        if(grid[rr][cc]===val) return false;
      }
    }
    return true;
  }

  function fillGrid(grid, idx){
    if(idx>=81) return true;
    const r = Math.floor(idx/9);
    const c = idx % 9;
    if(grid[r][c]!==0) return fillGrid(grid, idx+1);
    const nums = shuffle([1,2,3,4,5,6,7,8,9]);
    for(const n of nums){
      if(isSafe(grid, r, c, n)){
        grid[r][c] = n;
        if(fillGrid(grid, idx+1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  function generateFull(){
    const grid = makeGrid();
    fillGrid(grid, 0);
    return grid;
  }

  function cloneGrid(grid){
    return grid.map(row=>row.slice());
  }

  function buildPuzzle(solution, clues){
    const puzzle = cloneGrid(solution);
    const positions = [];
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) positions.push({r,c});
    shuffle(positions);
    let toRemove = Math.max(0, 81 - clues);
    for(const pos of positions){
      if(toRemove<=0) break;
      puzzle[pos.r][pos.c] = 0;
      toRemove--;
    }
    return puzzle;
  }

  function cluesForAge(age){
    if(age==='3-6') return 50;
    if(age==='6-8') return 45;
    if(age==='9-12') return 40;
    if(age==='13-17') return 32;
    if(age==='Adults') return 28;
    return 36;
  }

  function renderGrid(el, puzzle, solution, showAnswers){
    const table = document.createElement('table');
    table.className = 'grid sudoku';
    for(let r=0;r<9;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<9;c++){
        const td = document.createElement('td');
        const val = showAnswers ? solution[r][c] : puzzle[r][c];
        if(puzzle[r][c]!==0) td.classList.add('given');
        td.textContent = val ? String(val) : '';
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML = '';
    el.appendChild(table);
  }

  function savePng(grid, solution, showAnswers, bg){
    const rootStyle = getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px';
    const cell = parseInt(rootStyle,10) || 30;
    const padding = 8;
    const size = 9;
    const canvas = document.createElement('canvas');
    canvas.width = size*cell + padding*2;
    canvas.height = size*cell + padding*2;
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    // grid lines
    for(let r=0;r<=9;r++){
      const y = padding + r*cell;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = (r%3===0) ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + size*cell, y);
      ctx.stroke();
    }
    for(let c=0;c<=9;c++){
      const x = padding + c*cell;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = (c%3===0) ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + size*cell);
      ctx.stroke();
    }

    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(cell*0.6)}px sans-serif`;
    for(let r=0;r<9;r++){
      for(let c=0;c<9;c++){
        const val = showAnswers ? solution[r][c] : grid[r][c];
        if(!val) continue;
        const x = padding + c*cell + cell/2;
        const y = padding + r*cell + cell/2 + 1;
        ctx.fillText(String(val), x, y);
      }
    }

    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sudoku.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      THEMES = data.themes || {};
      AGE_PRESETS = data.agePresets || {};
      Object.keys(THEMES).forEach(k=>{
        const o = document.createElement('option');
        o.value = k; o.textContent = k;
        themeSelect.appendChild(o);
      });
      const ageSelect = document.getElementById('ageSelect');
      if(ageSelect && AGE_PRESETS){
        Object.keys(AGE_PRESETS).forEach(k=>{
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k;
          ageSelect.appendChild(opt);
        });
      }
    }).catch(()=>{THEMES = {}});

    document.getElementById('generate').addEventListener('click',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const age = document.getElementById('ageSelect').value;
      const size = parseInt(document.getElementById('size').value,10);
      if(size && size !== 9) document.getElementById('size').value = 9;
      const solution = generateFull();
      const clues = cluesForAge(age);
      const puzzle = buildPuzzle(solution, clues);
      window.__sudoku = {puzzle, solution};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), puzzle, solution, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__sudoku; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.puzzle, last.solution, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__sudoku; if(!last){alert('Generate first'); return}
      savePng(last.puzzle, last.solution, window.__showAnswers, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
