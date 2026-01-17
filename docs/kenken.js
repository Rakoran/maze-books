// KenKen generator for the web UI
(function(){
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function buildLatin(size){
    const base = [];
    for(let r=0;r<size;r++){
      const row = [];
      for(let c=0;c<size;c++) row.push(((r+c)%size)+1);
      base.push(row);
    }
    return base;
  }

  function shuffleRowsCols(grid){
    const n = grid.length;
    const rows = shuffle([...Array(n).keys()]);
    const cols = shuffle([...Array(n).keys()]);
    const out = Array.from({length:n},()=>Array(n).fill(0));
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        out[r][c] = grid[rows[r]][cols[c]];
      }
    }
    return out;
  }

  function makeCages(size){
    const cells = [];
    for(let r=0;r<size;r++) for(let c=0;c<size;c++) cells.push({r,c});
    const cages = [];
    const used = Array.from({length:size},()=>Array(size).fill(false));
    for(const cell of shuffle(cells)){
      if(used[cell.r][cell.c]) continue;
      const cage = [cell];
      used[cell.r][cell.c] = true;
      const grow = Math.random() < 0.6 ? 2 : 1;
      for(let i=1;i<grow;i++){
        const neighbors = cage.flatMap(p=>[
          {r:p.r+1,c:p.c},{r:p.r-1,c:p.c},{r:p.r,c:p.c+1},{r:p.r,c:p.c-1}
        ]).filter(p=>p.r>=0&&p.c>=0&&p.r<size&&p.c<size&&!used[p.r][p.c]);
        if(!neighbors.length) break;
        const pick = neighbors[Math.floor(Math.random()*neighbors.length)];
        used[pick.r][pick.c] = true;
        cage.push(pick);
      }
      cages.push(cage);
    }
    return cages;
  }

  function cageOp(values){
    if(values.length===1) return {op:'', target:values[0]};
    if(values.length===2){
      const [a,b] = values;
      if(a%b===0) return {op:'÷', target:a/b};
      if(b%a===0) return {op:'÷', target:b/a};
      return {op:'−', target:Math.abs(a-b)};
    }
    return {op:'+', target:values.reduce((a,b)=>a+b,0)};
  }

  function buildPuzzle(size){
    const solution = shuffleRowsCols(buildLatin(size));
    const cages = makeCages(size);
    const cageInfo = cages.map(cage=>{
      const vals = cage.map(p=>solution[p.r][p.c]).sort((a,b)=>b-a);
      const info = cageOp(vals);
      return {cells:cage, op:info.op, target:info.target};
    });
    return {solution, cages:cageInfo};
  }

  function renderGrid(el, puzzle, showAnswers){
    const n = puzzle.solution.length;
    const table = document.createElement('table');
    table.className = 'grid kenken';
    for(let r=0;r<n;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<n;c++){
        const td = document.createElement('td');
        if(showAnswers) td.textContent = puzzle.solution[r][c];
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML = '';
    el.appendChild(table);
    drawCageBorders(table, puzzle.cages);
    renderCageLabels(table, puzzle.cages);
  }

  function drawCageBorders(table, cages){
    const n = table.rows.length;
    const map = Array.from({length:n},()=>Array(n).fill(-1));
    cages.forEach((cage, idx)=>{
      cage.cells.forEach(p=>{map[p.r][p.c]=idx;});
    });
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const td = table.rows[r].cells[c];
        const id = map[r][c];
        td.style.borderTop = (r===0 || map[r-1][c]!==id) ? '2px solid #111' : '1px solid #999';
        td.style.borderLeft = (c===0 || map[r][c-1]!==id) ? '2px solid #111' : '1px solid #999';
        td.style.borderBottom = (r===n-1 || map[r+1][c]!==id) ? '2px solid #111' : '1px solid #999';
        td.style.borderRight = (c===n-1 || map[r][c+1]!==id) ? '2px solid #111' : '1px solid #999';
      }
    }
  }

  function renderCageLabels(table, cages){
    cages.forEach(cage=>{
      const cell = cage.cells[0];
      const td = table.rows[cell.r].cells[cell.c];
      const label = document.createElement('div');
      label.className = 'kenken-label';
      label.textContent = `${cage.target}${cage.op}`;
      td.appendChild(label);
    });
  }

  function savePng(puzzle, showAnswers, bg){
    const n = puzzle.solution.length;
    const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px',10) || 30;
    const padding = 8;
    const canvas = document.createElement('canvas');
    canvas.width = n*cell + padding*2;
    canvas.height = n*cell + padding*2;
    const ctx = canvas.getContext('2d');
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const x = padding + c*cell;
        const y = padding + r*cell;
        ctx.strokeRect(x, y, cell, cell);
        if(showAnswers){
          ctx.fillStyle = '#111';
          ctx.font = `bold ${Math.floor(cell*0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(puzzle.solution[r][c]), x+cell/2, y+cell/2 + 1);
        }
      }
    }
    // cage borders + labels
    const tableMap = Array.from({length:n},()=>Array(n).fill(-1));
    puzzle.cages.forEach((cage, idx)=>cage.cells.forEach(p=>{tableMap[p.r][p.c]=idx;}));
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const id = tableMap[r][c];
        const x = padding + c*cell;
        const y = padding + r*cell;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        if(r===0 || tableMap[r-1][c]!==id){ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+cell,y); ctx.stroke();}
        if(c===0 || tableMap[r][c-1]!==id){ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+cell); ctx.stroke();}
        if(r===n-1 || tableMap[r+1][c]!==id){ctx.beginPath(); ctx.moveTo(x,y+cell); ctx.lineTo(x+cell,y+cell); ctx.stroke();}
        if(c===n-1 || tableMap[r][c+1]!==id){ctx.beginPath(); ctx.moveTo(x+cell,y); ctx.lineTo(x+cell,y+cell); ctx.stroke();}
      }
    }
    puzzle.cages.forEach(cage=>{
      const cellPos = cage.cells[0];
      const x = padding + cellPos.c*cell + 3;
      const y = padding + cellPos.r*cell + 3;
      ctx.fillStyle = '#111';
      ctx.font = `bold ${Math.floor(cell*0.32)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${cage.target}${cage.op}`, x, y);
    });
    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'kenken.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function sizeForAge(age){
    if(age==='3-6') return 4;
    if(age==='6-8') return 4;
    if(age==='9-12') return 5;
    if(age==='13-17') return 6;
    if(age==='Adults') return 6;
    return 4;
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      AGE_PRESETS = data.agePresets || {};
      const themes = data.themes || {};
      Object.keys(themes).forEach(k=>{
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
    });

    document.getElementById('generate').addEventListener('click',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 4;
      if(age) size = sizeForAge(age);
      size = Math.max(4, Math.min(6, size));
      document.getElementById('size').value = size;
      const puzzle = buildPuzzle(size);
      window.__kenken = puzzle;
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), puzzle, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      if(!window.__kenken){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), window.__kenken, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      if(!window.__kenken){alert('Generate first'); return}
      savePng(window.__kenken, window.__showAnswers, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
