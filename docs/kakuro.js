// Kakuro generator for the web UI
(function(){
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function generateGrid(size){
    const n = size;
    const grid = Array.from({length:n},()=>Array.from({length:n},()=>({type:'block'})));
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(r===0 || c===0) continue;
        grid[r][c] = {type:'cell', value:0};
      }
    }
    return grid;
  }

  function fillValues(grid){
    const n = grid.length;
    for(let r=1;r<n;r++){
      for(let c=1;c<n;c++){
        if(grid[r][c].type==='cell'){
          const usedRow = new Set();
          let cc = c-1;
          while(cc>=1 && grid[r][cc].type==='cell'){usedRow.add(grid[r][cc].value); cc--;}
          const usedCol = new Set();
          let rr = r-1;
          while(rr>=1 && grid[rr][c].type==='cell'){usedCol.add(grid[rr][c].value); rr--;}
          const choices = shuffle([1,2,3,4,5,6,7,8,9].filter(v=>!usedRow.has(v) && !usedCol.has(v)));
          grid[r][c].value = choices[0] || 1;
        }
      }
    }
  }

  function buildClues(grid){
    const n = grid.length;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(grid[r][c].type==='block'){
          let sumRight = 0, sumDown = 0;
          let cc = c+1;
          while(cc<n && grid[r][cc].type==='cell'){sumRight += grid[r][cc].value; cc++;}
          let rr = r+1;
          while(rr<n && grid[rr][c].type==='cell'){sumDown += grid[rr][c].value; rr++;}
          grid[r][c].clueRight = sumRight > 0 ? sumRight : null;
          grid[r][c].clueDown = sumDown > 0 ? sumDown : null;
        }
      }
    }
  }

  function renderGrid(el, grid, showAnswers){
    const table = document.createElement('table');
    table.className = 'grid kakuro';
    const n = grid.length;
    for(let r=0;r<n;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<n;c++){
        const cell = grid[r][c];
        const td = document.createElement('td');
        if(cell.type==='block'){
          td.className = 'kakuro-block';
          const d = cell.clueDown;
          const rsum = cell.clueRight;
          if(d || rsum){
            const diag = document.createElement('div');
            diag.className = 'kakuro-diag';
            const dSpan = document.createElement('span');
            dSpan.className = 'kakuro-down';
            dSpan.textContent = d ? d : '';
            const rSpan = document.createElement('span');
            rSpan.className = 'kakuro-right';
            rSpan.textContent = rsum ? rsum : '';
            diag.appendChild(dSpan);
            diag.appendChild(rSpan);
            td.appendChild(diag);
          }
        }else{
          td.className = 'kakuro-cell';
          td.textContent = showAnswers ? cell.value : '';
        }
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
        const cellObj = grid[r][c];
        if(cellObj.type==='block'){
          ctx.fillStyle = '#111';
          ctx.fillRect(x, y, cell, cell);
          const d = cellObj.clueDown;
          const rs = cellObj.clueRight;
          if(d || rs){
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(x, y+cell);
            ctx.lineTo(x+cell, y);
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.floor(cell*0.3)}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            if(d) ctx.fillText(String(d), x + 4, y + 4);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            if(rs) ctx.fillText(String(rs), x + cell - 4, y + cell - 4);
          }
        }else if(showAnswers){
          ctx.fillStyle = '#111';
          ctx.font = `bold ${Math.floor(cell*0.6)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(cellObj.value), x + cell/2, y + cell/2 + 1);
        }
      }
    }
    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'kakuro.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function sizeForAge(age){
    if(age==='3-6') return 5;
    if(age==='6-8') return 6;
    if(age==='9-12') return 7;
    if(age==='13-17') return 8;
    if(age==='Adults') return 9;
    return 6;
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      AGE_PRESETS = data.agePresets || {};
      // theme is not used, but keep dropdown consistent
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
      let size = parseInt(document.getElementById('size').value,10) || 6;
      if(age) size = sizeForAge(age);
      size = Math.max(5, Math.min(9, size));
      document.getElementById('size').value = size;
      const grid = generateGrid(size);
      fillValues(grid);
      buildClues(grid);
      window.__kakuro = {grid};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), grid, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__kakuro; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.grid, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__kakuro; if(!last){alert('Generate first'); return}
      savePng(last.grid, window.__showAnswers, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
