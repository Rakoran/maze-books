// Simple maze generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function makeGrid(rows, cols){
    return Array.from({length:rows},()=>Array.from({length:cols},()=>({
      visited:false,
      walls:{t:true,r:true,b:true,l:true}
    })));
  }

  function generateMaze(rows, cols){
    const grid = makeGrid(rows, cols);
    const stack = [];
    let current = {r:0, c:0};
    grid[0][0].visited = true;
    stack.push(current);

    while(stack.length){
      const {r,c} = current;
      const neighbors = [];
      if(r>0 && !grid[r-1][c].visited) neighbors.push({r:r-1,c,dir:'t'});
      if(c<cols-1 && !grid[r][c+1].visited) neighbors.push({r,c:c+1,dir:'r'});
      if(r<rows-1 && !grid[r+1][c].visited) neighbors.push({r:r+1,c,dir:'b'});
      if(c>0 && !grid[r][c-1].visited) neighbors.push({r,c:c-1,dir:'l'});

      if(neighbors.length){
        const next = shuffle(neighbors)[0];
        // remove walls between current and next
        if(next.dir==='t'){grid[r][c].walls.t=false; grid[r-1][c].walls.b=false;}
        if(next.dir==='r'){grid[r][c].walls.r=false; grid[r][c+1].walls.l=false;}
        if(next.dir==='b'){grid[r][c].walls.b=false; grid[r+1][c].walls.t=false;}
        if(next.dir==='l'){grid[r][c].walls.l=false; grid[r][c-1].walls.r=false;}
        grid[next.r][next.c].visited = true;
        stack.push(current);
        current = {r:next.r, c:next.c};
      }else{
        current = stack.pop();
      }
    }
    return grid;
  }

  function solveMaze(grid){
    const rows = grid.length, cols = grid[0].length;
    const start = {r:0,c:0}, end = {r:rows-1,c:cols-1};
    const queue = [start];
    const prev = Array.from({length:rows},()=>Array(cols).fill(null));
    const seen = Array.from({length:rows},()=>Array(cols).fill(false));
    seen[start.r][start.c] = true;

    while(queue.length){
      const cur = queue.shift();
      if(cur.r===end.r && cur.c===end.c) break;
      const cell = grid[cur.r][cur.c];
      const moves = [];
      if(!cell.walls.t) moves.push({r:cur.r-1,c:cur.c});
      if(!cell.walls.r) moves.push({r:cur.r,c:cur.c+1});
      if(!cell.walls.b) moves.push({r:cur.r+1,c:cur.c});
      if(!cell.walls.l) moves.push({r:cur.r,c:cur.c-1});
      for(const m of moves){
        if(m.r<0||m.c<0||m.r>=rows||m.c>=cols) continue;
        if(seen[m.r][m.c]) continue;
        seen[m.r][m.c] = true;
        prev[m.r][m.c] = cur;
        queue.push(m);
      }
    }
    const path = [];
    let cur = end;
    while(cur){
      path.push(cur);
      cur = prev[cur.r][cur.c];
    }
    return path.reverse();
  }

  function drawMaze(canvas, grid, options){
    const opts = options || {};
    const showAnswers = !!opts.showAnswers;
    const bg = opts.bg || 'transparent';
    const rows = grid.length, cols = grid[0].length;
    const rootStyle = getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px';
    const cell = parseInt(rootStyle,10) || 30;
    const padding = 8;
    canvas.width = cols * cell + padding*2;
    canvas.height = rows * cell + padding*2;
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x = padding + c*cell;
        const y = padding + r*cell;
        const w = grid[r][c].walls;
        if(w.t){ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+cell,y); ctx.stroke();}
        if(w.r){ctx.beginPath(); ctx.moveTo(x+cell,y); ctx.lineTo(x+cell,y+cell); ctx.stroke();}
        if(w.b){ctx.beginPath(); ctx.moveTo(x,y+cell); ctx.lineTo(x+cell,y+cell); ctx.stroke();}
        if(w.l){ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+cell); ctx.stroke();}
      }
    }

    // entrance and exit gaps
    ctx.clearRect(padding-2, padding+1, 6, cell-2);
    ctx.clearRect(padding + (cols-1)*cell + cell-4, padding + (rows-1)*cell + 1, 6, cell-2);

    if(showAnswers){
      const path = solveMaze(grid);
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = Math.max(2, Math.floor(cell*0.2));
      ctx.beginPath();
      for(let i=0;i<path.length;i++){
        const p = path[i];
        const cx = padding + p.c*cell + cell/2;
        const cy = padding + p.r*cell + cell/2;
        if(i===0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
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

    const canvas = document.getElementById('mazeCanvas');

    document.getElementById('generate').addEventListener('click',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 14;
      const ageMap = AGE_PRESETS || {};
      if(age && ageMap[age]){
        size = ageMap[age].size;
        document.getElementById('size').value = size;
      }
      const grid = generateMaze(size, size);
      window.__maze = {grid, size};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      drawMaze(canvas, grid, {showAnswers:false, bg:document.getElementById('bgSelect').value});
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__maze; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      drawMaze(canvas, last.grid, {showAnswers:window.__showAnswers, bg:document.getElementById('bgSelect').value});
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__maze; if(!last){alert('Generate first'); return}
      drawMaze(canvas, last.grid, {showAnswers:window.__showAnswers, bg:document.getElementById('bgSelect').value});
      canvas.toBlob(function(blob){
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maze.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const last = window.__maze; if(!last) return;
      drawMaze(canvas, last.grid, {showAnswers:window.__showAnswers, bg:document.getElementById('bgSelect').value});
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
