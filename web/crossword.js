// Simple crossword generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  const DIRS = [
    {dr:0, dc:1, name:'across'},
    {dr:1, dc:0, name:'down'}
  ];

  function makeEmptyGrid(n){return Array.from({length:n},()=>Array.from({length:n},()=>null))}

  function canPlace(grid, word, startR, startC, dr, dc){
    const n = grid.length;
    const endR = startR + dr*(word.length-1);
    const endC = startC + dc*(word.length-1);
    if(startR<0||startC<0||endR<0||endC<0||startR>=n||startC>=n||endR>=n||endC>=n) return false;

    // cell before and after must be empty to avoid run-ons
    const prevR = startR - dr, prevC = startC - dc;
    const nextR = endR + dr, nextC = endC + dc;
    if(inBounds(n, prevR, prevC) && grid[prevR][prevC]) return false;
    if(inBounds(n, nextR, nextC) && grid[nextR][nextC]) return false;

    for(let i=0;i<word.length;i++){
      const rr = startR + dr*i, cc = startC + dc*i;
      const ch = grid[rr][cc];
      if(ch && ch !== word[i]) return false;
      // prevent side-by-side touching when this cell is newly placed
      if(!ch){
        if(dr===0){
          if(inBounds(n, rr-1, cc) && grid[rr-1][cc]) return false;
          if(inBounds(n, rr+1, cc) && grid[rr+1][cc]) return false;
        }else{
          if(inBounds(n, rr, cc-1) && grid[rr][cc-1]) return false;
          if(inBounds(n, rr, cc+1) && grid[rr][cc+1]) return false;
        }
      }
    }
    return true;
  }

  function inBounds(n,r,c){return r>=0&&c>=0&&r<n&&c<n}

  function placeWord(grid, word, startR, startC, dr, dc){
    for(let i=0;i<word.length;i++){
      const rr = startR + dr*i, cc = startC + dc*i;
      grid[rr][cc] = word[i];
    }
  }

  function countIntersections(grid, word, startR, startC, dr, dc){
    let count = 0;
    for(let i=0;i<word.length;i++){
      const rr = startR + dr*i, cc = startC + dc*i;
      if(grid[rr][cc]) count++;
    }
    return count;
  }

  function countInnerIntersections(grid, word, startR, startC, dr, dc){
    let count = 0;
    for(let i=1;i<word.length-1;i++){
      const rr = startR + dr*i, cc = startC + dc*i;
      if(grid[rr][cc]) count++;
    }
    return count;
  }

  function generate(entries, size){
    const words = entries.map(e=>({answer:e.answer.toUpperCase().replace(/[^A-Z]/g,''), clue:e.clue || ''}))
      .filter(e=>e.answer.length>1);
    if(words.length===0) return null;
    const n = size || Math.max(10, ...words.map(w=>w.answer.length));
    let bestResult = null;

    for(let attempt=0; attempt<25; attempt++){
      const grid = makeEmptyGrid(n);
      const placements = [];
      const order = shuffle(words.slice()).sort((a,b)=>b.answer.length-a.answer.length);
      const first = order.shift();
      const startR = Math.floor(n/2);
      const startC = Math.floor((n - first.answer.length)/2);
      if(!canPlace(grid, first.answer, startR, startC, 0, 1)) continue;
      placeWord(grid, first.answer, startR, startC, 0, 1);
      placements.push({answer:first.answer, clue:first.clue, r:startR, c:startC, dr:0, dc:1});

      for(const entry of order){
        let best = null;
        for(let r=0;r<n;r++){
          for(let c=0;c<n;c++){
            const cell = grid[r][c];
            if(!cell) continue;
            for(let i=0;i<entry.answer.length;i++){
              if(entry.answer[i] !== cell) continue;
              for(const dir of DIRS){
                const sr = r - dir.dr * i;
                const sc = c - dir.dc * i;
                if(!canPlace(grid, entry.answer, sr, sc, dir.dr, dir.dc)) continue;
                const hits = countIntersections(grid, entry.answer, sr, sc, dir.dr, dir.dc);
                const innerHits = (entry.answer.length <= 2) ? hits : countInnerIntersections(grid, entry.answer, sr, sc, dir.dr, dir.dc);
                if(innerHits < 1) continue;
                if(!best || innerHits > best.hits){
                  best = {r:sr, c:sc, dr:dir.dr, dc:dir.dc, hits: innerHits};
                }
              }
            }
          }
        }
        if(best){
          placeWord(grid, entry.answer, best.r, best.c, best.dr, best.dc);
          placements.push({answer:entry.answer, clue:entry.clue, r:best.r, c:best.c, dr:best.dr, dc:best.dc});
        }
      }

      if(!bestResult || placements.length > bestResult.placements.length){
        bestResult = {grid, placements};
      }
      if(bestResult && bestResult.placements.length === words.length) break;
    }

    return bestResult;
  }

  function computeNumbers(grid){
    const n = grid.length;
    const numbers = Array.from({length:n},()=>Array(n).fill(null));
    let num = 1;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(!grid[r][c]) continue;
        const startsAcross = (c===0 || !grid[r][c-1]) && (c+1<n && grid[r][c+1]);
        const startsDown = (r===0 || !grid[r-1][c]) && (r+1<n && grid[r+1][c]);
        if(startsAcross || startsDown){
          numbers[r][c] = num++;
        }
      }
    }
    return numbers;
  }

  function renderGrid(el, grid, numbers, showAnswers){
    const n = grid.length;
    const table = document.createElement('table');
    table.className = 'grid crossword';
    for(let r=0;r<n;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<n;c++){
        const td = document.createElement('td');
        const letter = grid[r][c];
        if(!letter){
          td.className = 'block';
        }else{
          td.dataset.r = r;
          td.dataset.c = c;
          const num = numbers[r][c];
          if(num){
            const s = document.createElement('span');
            s.className = 'num';
            s.textContent = num;
            td.appendChild(s);
          }
          const l = document.createElement('span');
          l.className = 'letter';
          l.textContent = showAnswers ? letter : '';
          td.appendChild(l);
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML = '';
    el.appendChild(table);
  }

  function renderClues(acrossEl, downEl, placements, numbers){
    const byNumber = placements.map(p=>{
      const num = numbers[p.r][p.c];
      const dir = (p.dr===0 && p.dc===1) ? 'across' : 'down';
      return {num, dir, clue:p.clue || p.answer};
    }).filter(x=>x.num);

    const across = byNumber.filter(x=>x.dir==='across').sort((a,b)=>a.num-b.num);
    const down = byNumber.filter(x=>x.dir==='down').sort((a,b)=>a.num-b.num);

    acrossEl.innerHTML = across.map(x=>`<li><strong>${x.num}</strong> ${escapeHtml(x.clue)}</li>`).join('');
    downEl.innerHTML = down.map(x=>`<li><strong>${x.num}</strong> ${escapeHtml(x.clue)}</li>`).join('');
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function parseCustom(text){
    const lines = text.split(/\n+/).map(l=>l.trim()).filter(Boolean);
    const out = [];
    for(const line of lines){
      const parts = line.split(/\s*-\s*/);
      const answer = (parts[0]||'').trim();
      const clue = parts.slice(1).join(' - ').trim();
      if(answer) out.push({answer, clue});
    }
    return out;
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      THEMES = data.crosswordThemes || {};
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
      const theme = themeSelect.value;
      const custom = document.getElementById('custom').value.trim();
      let size = parseInt(document.getElementById('size').value,10) || 13;
      const age = document.getElementById('ageSelect').value;

      let entries = [];
      if(theme && THEMES[theme]) entries = entries.concat(THEMES[theme]);
      if(custom) entries = entries.concat(parseCustom(custom));
      if(entries.length===0){alert('Add words or pick a theme'); return}

      const ageMap = AGE_PRESETS || {};
      if(age && ageMap[age]){
        size = ageMap[age].size;
        document.getElementById('size').value = size;
        if(ageMap[age].maxWords && entries.length > ageMap[age].maxWords){
          entries = shuffle(entries).slice(0, ageMap[age].maxWords);
        }
      }

      const result = generate(entries, size);
      if(!result){alert('Could not build crossword. Try fewer or shorter words.'); return}
      const numbers = computeNumbers(result.grid);
      renderGrid(document.getElementById('gridWrap'), result.grid, numbers, false);
      renderClues(document.getElementById('acrossList'), document.getElementById('downList'), result.placements, numbers);
      window.__last = {grid:result.grid, numbers, placements:result.placements, theme};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__last; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.grid, last.numbers, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__last; if(!last){alert('Generate first'); return}
      saveGridAsPng(last.grid, last.numbers, !!window.__showAnswers, document.getElementById('bgSelect').value);
    });
  }

  function saveGridAsPng(grid, numbers, showAnswers, bg){
    const n = grid.length;
    const rootStyle = getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px';
    const cell = parseInt(rootStyle,10) || 30;
    const padding = 8;
    const canvas = document.createElement('canvas');
    canvas.width = n * cell + padding*2;
    canvas.height = n * cell + padding*2;
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    const numFont = Math.max(10, Math.floor(cell*0.35));
    const letterFont = Math.floor(cell*0.6);
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        const x = padding + c*cell;
        const y = padding + r*cell;
        const letter = grid[r][c];
        if(!letter) continue;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, cell, cell);
        const num = numbers[r][c];
        if(num){
          ctx.fillStyle = '#111';
          ctx.font = `${numFont}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(num), x + 2, y + 1);
        }
        if(showAnswers){
          ctx.fillStyle = '#111';
          ctx.font = `${letterFont}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter, x + cell/2, y + cell/2 + 1);
        }
      }
    }

    canvas.toBlob(function(blob){
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

  document.addEventListener('DOMContentLoaded', init);
})();
