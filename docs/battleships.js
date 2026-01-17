// Battleships logic puzzle generator for the web UI
(function(){
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function sizeForAge(age){
    if(age==='3-6') return 6;
    if(age==='6-8') return 7;
    if(age==='9-12') return 8;
    if(age==='13-17') return 9;
    if(age==='Adults') return 10;
    return 8;
  }

  function fleetForSize(size){
    if(size <= 6) return [3,2,2,1,1,1];
    if(size <= 8) return [4,3,2,2,1,1,1];
    return [4,3,3,2,2,1,1,1];
  }

  function makeGrid(n){return Array.from({length:n},()=>Array(n).fill(0))}

  function inBounds(n,r,c){return r>=0&&c>=0&&r<n&&c<n}

  function canPlace(grid, r, c, len, dir){
    const n = grid.length;
    for(let i=0;i<len;i++){
      const rr = r + (dir==='v'?i:0);
      const cc = c + (dir==='h'?i:0);
      if(!inBounds(n,rr,cc)) return false;
      if(grid[rr][cc]!==0) return false;
      for(let dr=-1; dr<=1; dr++){
        for(let dc=-1; dc<=1; dc++){
          const nr = rr + dr;
          const nc = cc + dc;
          if(inBounds(n,nr,nc) && grid[nr][nc]===1) return false;
        }
      }
    }
    return true;
  }

  function placeShip(grid, r, c, len, dir){
    for(let i=0;i<len;i++){
      const rr = r + (dir==='v'?i:0);
      const cc = c + (dir==='h'?i:0);
      grid[rr][cc] = 1;
    }
  }

  function generateBoard(size, fleet){
    const attempts = 200;
    for(let t=0;t<attempts;t++){
      const grid = makeGrid(size);
      let ok = true;
      for(const len of fleet){
        let placed = false;
        for(let k=0;k<300 && !placed;k++){
          const dir = Math.random() < 0.5 ? 'h' : 'v';
          const r = Math.floor(Math.random()*size);
          const c = Math.floor(Math.random()*size);
          if(canPlace(grid, r, c, len, dir)){
            placeShip(grid, r, c, len, dir);
            placed = true;
          }
        }
        if(!placed){ok = false; break;}
      }
      if(ok) return grid;
    }
    return null;
  }

  function rowCounts(grid){
    return grid.map(row=>row.reduce((a,b)=>a+b,0));
  }
  function colCounts(grid){
    const n = grid.length;
    const out = Array(n).fill(0);
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) out[c] += grid[r][c];
    return out;
  }

  function renderGrid(el, grid, showAnswers){
    const n = grid.length;
    const table = document.createElement('table');
    table.className = 'grid battleships';
    const thead = document.createElement('tr');
    thead.appendChild(document.createElement('th'));
    const col = colCounts(grid);
    for(let c=0;c<n;c++){
      const th = document.createElement('th');
      th.textContent = col[c];
      thead.appendChild(th);
    }
    table.appendChild(thead);
    const rows = rowCounts(grid);
    for(let r=0;r<n;r++){
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = rows[r];
      tr.appendChild(th);
      for(let c=0;c<n;c++){
        const td = document.createElement('td');
        if(showAnswers && grid[r][c]===1) td.textContent = '●';
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML = '';
    el.appendChild(table);
  }

  function savePng(grid, showAnswers, bg){
    const n = grid.length;
    const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px',10) || 30;
    const padding = 10;
    const canvas = document.createElement('canvas');
    canvas.width = (n+1)*cell + padding*2;
    canvas.height = (n+1)*cell + padding*2;
    const ctx = canvas.getContext('2d');
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.font = `bold ${Math.floor(cell*0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rows = rowCounts(grid);
    const cols = colCounts(grid);
    for(let r=0;r<=n;r++){
      for(let c=0;c<=n;c++){
        const x = padding + c*cell;
        const y = padding + r*cell;
        ctx.strokeRect(x, y, cell, cell);
        if(r===0 && c>0){
          ctx.fillStyle = '#111';
          ctx.fillText(String(cols[c-1]), x+cell/2, y+cell/2);
        }else if(c===0 && r>0){
          ctx.fillStyle = '#111';
          ctx.fillText(String(rows[r-1]), x+cell/2, y+cell/2);
        }else if(r>0 && c>0 && showAnswers && grid[r-1][c-1]===1){
          ctx.fillStyle = '#111';
          ctx.fillText('●', x+cell/2, y+cell/2);
        }
      }
    }
    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'battleships.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
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
      let size = parseInt(document.getElementById('size').value,10) || 8;
      if(age) size = sizeForAge(age);
      size = Math.max(6, Math.min(10, size));
      document.getElementById('size').value = size;
      const fleet = fleetForSize(size);
      const grid = generateBoard(size, fleet);
      if(!grid){alert('Could not place ships. Try again.'); return}
      window.__battleships = {grid};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), grid, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__battleships; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.grid, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__battleships; if(!last){alert('Generate first'); return}
      savePng(last.grid, window.__showAnswers, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
