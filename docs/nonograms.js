// Nonogram generator for the web UI
(function(){
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function sizeForAge(age){
    if(age==='3-6') return 5;
    if(age==='6-8') return 6;
    if(age==='9-12') return 8;
    if(age==='13-17') return 10;
    if(age==='Adults') return 12;
    return 8;
  }

  function generatePattern(size){
    const grid = Array.from({length:size},()=>Array(size).fill(0));
    const density = 0.35;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        grid[r][c] = Math.random() < density ? 1 : 0;
      }
    }
    return grid;
  }

  function lineHints(line){
    const hints = [];
    let count = 0;
    for(let i=0;i<line.length;i++){
      if(line[i]===1) count++;
      else if(count>0){hints.push(count); count=0;}
    }
    if(count>0) hints.push(count);
    return hints.length ? hints : [0];
  }

  function computeHints(grid){
    const size = grid.length;
    const rowHints = grid.map(r=>lineHints(r));
    const colHints = [];
    for(let c=0;c<size;c++){
      const col = [];
      for(let r=0;r<size;r++) col.push(grid[r][c]);
      colHints.push(lineHints(col));
    }
    return {rowHints, colHints};
  }

  function renderGrid(el, grid, hints, showAnswers){
    const size = grid.length;
    const maxRow = Math.max(...hints.rowHints.map(h=>h.length));
    const maxCol = Math.max(...hints.colHints.map(h=>h.length));
    const table = document.createElement('table');
    table.className = 'grid nonogram';
    for(let r=0;r<maxCol;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<maxRow;c++){
        tr.appendChild(document.createElement('th'));
      }
      for(let c=0;c<size;c++){
        const th = document.createElement('th');
        const hintIdx = hints.colHints[c].length - maxCol + r;
        th.textContent = hintIdx >= 0 ? hints.colHints[c][hintIdx] : '';
        tr.appendChild(th);
      }
      table.appendChild(tr);
    }
    for(let r=0;r<size;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<maxRow;c++){
        const th = document.createElement('th');
        const hintIdx = hints.rowHints[r].length - maxRow + c;
        th.textContent = hintIdx >= 0 ? hints.rowHints[r][hintIdx] : '';
        tr.appendChild(th);
      }
      for(let c=0;c<size;c++){
        const td = document.createElement('td');
        if(showAnswers && grid[r][c]===1) td.classList.add('filled');
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML = '';
    el.appendChild(table);
  }

  function savePng(grid, hints, showAnswers, bg){
    const size = grid.length;
    const maxRow = Math.max(...hints.rowHints.map(h=>h.length));
    const maxCol = Math.max(...hints.colHints.map(h=>h.length));
    const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px',10) || 30;
    const padding = 8;
    const rows = maxCol + size;
    const cols = maxRow + size;
    const canvas = document.createElement('canvas');
    canvas.width = cols*cell + padding*2;
    canvas.height = rows*cell + padding*2;
    const ctx = canvas.getContext('2d');
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.font = `bold ${Math.floor(cell*0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x = padding + c*cell;
        const y = padding + r*cell;
        ctx.strokeRect(x, y, cell, cell);
        if(r < maxCol && c >= maxRow){
          const col = c - maxRow;
          const hintIdx = hints.colHints[col].length - maxCol + r;
          const text = hintIdx >= 0 ? hints.colHints[col][hintIdx] : '';
          if(text) ctx.fillText(String(text), x + cell/2, y + cell/2);
        }else if(c < maxRow && r >= maxCol){
          const row = r - maxCol;
          const hintIdx = hints.rowHints[row].length - maxRow + c;
          const text = hintIdx >= 0 ? hints.rowHints[row][hintIdx] : '';
          if(text) ctx.fillText(String(text), x + cell/2, y + cell/2);
        }else if(r >= maxCol && c >= maxRow && showAnswers && grid[r-maxCol][c-maxRow]===1){
          ctx.fillStyle = '#111';
          ctx.fillRect(x+2, y+2, cell-4, cell-4);
        }
      }
    }
    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nonogram.png';
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
      size = Math.max(5, Math.min(12, size));
      document.getElementById('size').value = size;
      const grid = generatePattern(size);
      const hints = computeHints(grid);
      window.__nonogram = {grid, hints};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), grid, hints, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__nonogram; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.grid, last.hints, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__nonogram; if(!last){alert('Generate first'); return}
      savePng(last.grid, last.hints, window.__showAnswers, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
