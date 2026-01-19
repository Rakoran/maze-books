// Minimal wordsearch generator ported to browser for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  const DIRS = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  function makeEmptyGrid(n){return Array.from({length:n},()=>Array.from({length:n},()=>null))}
  function canPlace(grid, word, r, c, dr, dc){const n=grid.length;for(let i=0;i<word.length;i++){const rr=r+dr*i,cc=c+dc*i;if(rr<0||cc<0||rr>=n||cc>=n) return false;const ch=grid[rr][cc]; if(ch && ch!==word[i]) return false;}return true}
  function placeWord(grid, word, r, c, dr, dc){for(let i=0;i<word.length;i++) grid[r+dr*i][c+dc*i]=word[i]}
  function fillGrid(grid){const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';const weights=[8.12,1.54,2.71,4.32,12.02,2.30,1.73,5.92,7.31,0.23,0.87,3.98,2.61,6.95,7.68,1.66,0.14,6.02,6.28,9.10,2.88,1.06,2.11,0.06,2.11,0.23];const total=weights.reduce((a,b)=>a+b,0);const cumulative=weights.map((w,i)=>weights.slice(0,i+1).reduce((a,b)=>a+b,0)/total);for(let r=0;r<grid.length;r++)for(let c=0;c<grid.length;c++)if(!grid[r][c]){const rand=Math.random();const idx=cumulative.findIndex(c=>rand<=c);grid[r][c]=letters[idx]}}
  function generate(words,size,teacher){
    const n = size || Math.max(10, ...words.map(w=>w.length));
    const grid = makeEmptyGrid(n);
    const placements = [];
    const order = shuffle(words.slice()).sort((a,b)=>b.length-a.length);
    const dirs = teacher ? [[0,1],[1,0]] : DIRS;

    for(const raw of order){
      const word = raw.toUpperCase().replace(/[^A-Z]/g,'');
      let placed = false;
      for(let t=0;t<300 && !placed;t++){
        const dir = dirs[Math.floor(Math.random()*dirs.length)];
        const dr = dir[0], dc = dir[1];
        const r = Math.floor(Math.random()*n), c = Math.floor(Math.random()*n);
        const endR = r + dr*(word.length-1), endC = c + dc*(word.length-1);
        if(endR<0||endC<0||endR>=n||endC>=n) continue;
        if(canPlace(grid,word,r,c,dr,dc)){
          placeWord(grid,word,r,c,dr,dc);
          placements.push({word,r,c,dr,dc});
          placed = true;
        }
      }
      if(!placed) console.warn('Could not place',raw);
    }
    fillGrid(grid);
    return {grid, placements};
  }

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  // DOM helpers
  const $ = id=>document.getElementById(id);
  function renderGridTo(el,grid,showLines){
    const n=grid.length;
    const table=document.createElement('table');
    table.className = showLines ? 'grid' : 'grid no-lines';
    for(let r=0;r<n;r++){
      const tr=document.createElement('tr');
      for(let c=0;c<n;c++){
        const td=document.createElement('td');
        td.textContent=grid[r][c];
        td.dataset.r = r;
        td.dataset.c = c;
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML='';
    el.appendChild(table);
  }
  function renderWordList(el,words){el.innerHTML=`<strong>Words:</strong><ul>${words.map(w=>`<li>${w.toUpperCase()}</li>`).join('')}</ul>`}

  // Wire UI
  function init(){
    const themeSelect=$('themeSelect');
    // fetch themes.json to populate themes and age presets
    fetch('themes.json').then(r=>r.json()).then(data=>{
      const srcThemes = data.themes || {};
      AGE_PRESETS = data.agePresets || {};
      THEMES = srcThemes;
      Object.keys(THEMES).forEach(k=>{const o=document.createElement('option'); o.value=k; o.textContent=k; themeSelect.appendChild(o)});
      // populate ageSelect if presets provided
      const ageSelect = $('ageSelect');
      if(ageSelect && AGE_PRESETS){
        Object.keys(AGE_PRESETS).forEach(k=>{
          const opt = document.createElement('option'); opt.value = k; opt.textContent = `${k} (${AGE_PRESETS[k].teacher? 'easy':'hard'})`; ageSelect.appendChild(opt);
        });
      }
    }).catch(()=>{
      // fallback: leave THEMES empty
      THEMES = {};
    });
    $('generate').addEventListener('click',()=>{
      applyBackground($('bgSelect').value);
      const theme=themeSelect.value; const age = $('ageSelect').value; let size=parseInt($('size').value,10)||12; const custom=$('custom').value.trim(); const teacherCheckbox = !!$('teacherMode').checked; let words=[]; if(theme && THEMES[theme]) words=words.concat(THEMES[theme]); if(custom) words=words.concat(custom.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean)); if(words.length===0){alert('Add words or pick a theme'); return}
      // Age presets from fetched data
      const ageMap = AGE_PRESETS || {};
      let teacher = teacherCheckbox;
      let maxWords = null;
      if(age && ageMap[age]){
        size = ageMap[age].size;
        teacher = ageMap[age].teacher;
        maxWords = ageMap[age].maxWords;
        // reflect size in UI
        $('size').value = size;
      }
      // trim words to maxWords if using theme or many custom words
      if(maxWords && words.length > maxWords){
        words = shuffle(words).slice(0, maxWords);
      }
      const {grid,placements}=generate(words,size,teacher);
      renderGridTo($('gridWrap'),grid,$('showGridLines').checked);
      renderWordList($('wordListWrap'),words);
      // save last for PNG export
      window.__last = {grid,placements,theme,size};
      // remove any previous answer highlights
      window.__showAnswers = false;
      const toggleBtn = $('toggleAnswers'); if(toggleBtn) toggleBtn.textContent = 'Show Answers';
    });

    // Show Answers toggle
    $('toggleAnswers').addEventListener('click',()=>{
      const last = window.__last; if(!last){alert('Generate first');return}
      window.__showAnswers = !window.__showAnswers;
      const btn = $('toggleAnswers'); btn.textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
      toggleAnswers(window.__showAnswers, last.placements);
    });

    function toggleAnswers(show, placements){
      const wrap = $('gridWrap'); if(!wrap) return; const table = wrap.querySelector('table.grid'); if(!table) return;
      // clear previous
      table.querySelectorAll('td').forEach(td=>td.classList.remove('answer'));
      if(!show) return;
      for(const p of placements){
        const word = p.word; let r=p.r, c=p.c, dr=p.dr, dc=p.dc;
        for(let i=0;i<word.length;i++){
          const rr = r + dr*i, cc = c + dc*i;
          const td = table.querySelector(`td[data-r="${rr}"][data-c="${cc}"]`);
          if(td) td.classList.add('answer');
        }
      }
    }

    $('bgSelect').addEventListener('change',()=>{
      applyBackground($('bgSelect').value);
    });

    $('showGridLines').addEventListener('change',()=>{
      const wrap = $('gridWrap'); if(!wrap) return;
      const table = wrap.querySelector('table.grid'); if(!table) return;
      table.classList.toggle('no-lines', !$('showGridLines').checked);
    });

    // Save PNG button
    $('savePng').addEventListener('click',()=>{
      const last = window.__last; if(!last){alert('Generate first'); return}
      saveGridAsPng(last.grid, last.placements, !!window.__showAnswers, $('showGridLines').checked, $('bgSelect').value);
    });

    function saveGridAsPng(grid, placements, showAnswers, showLines, bg){
      const n = grid.length;
      // determine cell size from CSS var
      const rootStyle = getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px';
      const cell = parseInt(rootStyle,10) || 30;
      const padding = 8; // extra padding around
      const canvas = document.createElement('canvas');
      canvas.width = n * cell + padding*2;
      canvas.height = n * cell + padding*2;
      const ctx = canvas.getContext('2d');
      // background
      if(bg && bg !== 'transparent'){
        ctx.fillStyle = bg;
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      // precompute answers set if needed
      const answerSet = new Set();
      if(showAnswers && placements){
        for(const p of placements){
          const w = p.word; let r=p.r, c=p.c, dr=p.dr, dc=p.dc;
          for(let i=0;i<w.length;i++){ answerSet.add(`${r+dr*i},${c+dc*i}`); }
        }
      }
      // draw grid cells
      for(let r=0;r<n;r++){
        for(let c=0;c<n;c++){
          const x = padding + c*cell;
          const y = padding + r*cell;
          // fill answer background if applicable
          if(answerSet.has(`${r},${c}`)){
            ctx.fillStyle = '#ffea8a';
            ctx.fillRect(x, y, cell, cell);
          }
          if(showLines){
            ctx.strokeStyle = '#999';
            ctx.strokeRect(x, y, cell, cell);
          }
          // draw letter
          ctx.fillStyle = '#111';
          const fontSize = Math.floor(cell*0.6);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(grid[r][c], x + cell/2, y + cell/2 + 1);
        }
      }
      // download
      canvas.toBlob(function(blob){
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wordsearch.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    }

  }

  document.addEventListener('DOMContentLoaded',init);
})();
