// Minimal wordsearch generator ported to browser for the web UI
(function(){
  let THEMES = [];
  let AGE_PRESETS = {};

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  const DIRS = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  function makeEmptyGrid(n){return Array.from({length:n},()=>Array.from({length:n},()=>null))}
  function canPlace(grid, word, r, c, dr, dc){
    const n=grid.length;
    for(let i=0;i<word.length;i++){
      const rr=r+dr*i,cc=c+dc*i;
      if(rr<0||cc<0||rr>=n||cc>=n) return false;
      const ch=grid[rr][cc]; 
      if(ch && ch!==word[i]) return false;
    }
    // Check buffer zones: ensure no adjacent cells are occupied
    for(let i=0;i<word.length;i++){
      const rr = r + dr*i, cc = c + dc*i;
      for(let d=0;d<DIRS.length;d++){
        const ar = rr + DIRS[d][0], ac = cc + DIRS[d][1];
        if(ar>=0 && ac>=0 && ar<n && ac<n && grid[ar][ac]) return false;
      }
    }
    return true;
  }
  function placeWord(grid, word, r, c, dr, dc){for(let i=0;i<word.length;i++) grid[r+dr*i][c+dc*i]=word[i]}
  function fillGrid(grid){
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const weights = [8.12, 1.54, 2.71, 4.32, 12.02, 2.30, 1.73, 5.92, 7.31, 0.23, 0.87, 3.98, 2.61, 6.95, 7.68, 1.66, 0.14, 6.02, 6.28, 9.10, 2.88, 1.06, 2.11, 0.06, 2.11, 0.23];
    const total = weights.reduce((a, b) => a + b, 0);
    const cumulative = weights.map((w, i) => weights.slice(0, i + 1).reduce((a, b) => a + b, 0) / total);
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) {
        if (!grid[r][c]) {
          const rand = Math.random();
          const idx = cumulative.findIndex(c => rand <= c);
          grid[r][c] = letters[idx];
        }
      }
    }
  }
  function checkGrid(grid, words) {
    const n = grid.length;
    const blocklist = ['ASS', 'DAMN', 'HELL', 'FUCK', 'SHIT', 'CUNT', 'DICK', 'PISS', 'TITS', 'BOOB', 'COCK', 'BALLS', 'BUTT', 'POOP', 'PEE', 'SEX', 'PORN', 'NAZI', 'KKK', 'RAPE', 'KILL', 'DIE', 'DEAD', 'BOMB', 'GUN', 'DRUG', 'WEED', 'CRACK', 'HEROIN', 'METH', 'COCAINE', 'ALCOHOL', 'BEER', 'WINE', 'BOOZE'];
    const wordSet = new Set(words.map(w => w.toUpperCase()));
    const foundWords = new Map();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        for (let d = 0; d < DIRS.length; d++) {
          const dr = DIRS[d][0], dc = DIRS[d][1];
          let word = '';
          let rr = r, cc = c;
          while (rr >= 0 && rr < n && cc >= 0 && cc < n) {
            word += grid[rr][cc];
            if (word.length >= 3) {
              const upper = word.toUpperCase();
              if (blocklist.includes(upper)) return false;
              if (wordSet.has(upper)) {
                foundWords.set(upper, (foundWords.get(upper) || 0) + 1);
              }
            }
            rr += dr;
            cc += dc;
          }
        }
      }
    }
    for (let count of foundWords.values()) {
      if (count > 1) return false;
    }
    return true;
  }
  function generate(words,size,level){
    const n = size || Math.max(10, ...words.map(w=>w.length));
    const grid = makeEmptyGrid(n);
    const placements = [];
    const order = shuffle(words.slice()).sort((a,b)=>b.length-a.length);
    let dirs;
    if(level === 1) dirs = [[0,1],[1,0]];
    else if(level === 2) dirs = [[0,1],[1,0],[1,1]];
    else dirs = DIRS;
    for(const raw of order){
      const word = raw.toUpperCase().replace(/[^A-Z]/g,'');
      let placed = false;
      for(let t=0;t<500 && !placed;t++){
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
    let tries = 0;
    while (!checkGrid(grid, words) && tries < 10) {
      fillGrid(grid);
      tries++;
    }
    if (tries >= 10) console.warn('Could not generate clean grid');
    return {grid, placements};
  }

  function generateWordList(wordDatabase, targetTheme, targetLevel, maxWords) {
    // 1. Filter the Master List
    const candidateWords = wordDatabase.filter(item => {
      // Does the word have the requested theme tag?
      const hasTheme = item.tags.includes(targetTheme);
      
      // Is it appropriate for this age group?
      // Allow lower levels in higher difficulties (e.g., "CAT" is okay in a Level 3 puzzle),
      // But DON'T allow Level 3 words in a Level 1 puzzle.
      const isLevelAppropriate = item.level <= targetLevel;

      // Minimum length 3
      const isLongEnough = item.word.length >= 3;

      return hasTheme && isLevelAppropriate && isLongEnough;
    });

    // Remove duplicates based on word
    const uniqueCandidates = candidateWords.filter((item, index, arr) => 
      arr.findIndex(i => i.word === item.word) === index
    );

    // 2. Shuffle (Fisher-Yates Algorithm) - Standard for randomness
    // Prevents the same words from always appearing first
    for (let i = uniqueCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueCandidates[i], uniqueCandidates[j]] = [uniqueCandidates[j], uniqueCandidates[i]];
    }

    // 3. The "Cap" (Slice the array)
    // Only take the first 'maxWords' (e.g., 10) to avoid overcrowding
    const finalSelection = uniqueCandidates.slice(0, maxWords);

    // Return just the word strings for the generator to use
    return finalSelection.map(item => item.word); 
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
    fetch('word-themes.json').then(r=>r.json()).then(data=>{
      const wordDatabase = data.wordDatabase || [];
      AGE_PRESETS = data.agePresets || {};
      THEMES = wordDatabase;
      // Get unique tags for theme select
      const uniqueTags = [...new Set(wordDatabase.flatMap(item => item.tags))];
      uniqueTags.forEach(k=>{const o=document.createElement('option'); o.value=k; o.textContent=k; themeSelect.appendChild(o)});
    }).catch(()=>{
      // fallback: leave THEMES empty
      THEMES = [];
    });
    $('generate').addEventListener('click',()=>{
      applyBackground($('bgSelect').value);
      const theme=themeSelect.value; const level = parseInt($('levelSelect').value) || 3; const size = level === 1 ? 10 : level === 2 ? 12 : 15; const custom=$('custom').value.trim(); const teacher = (level === 1); let words=[]; 
      if(theme) words=words.concat(generateWordList(THEMES, theme, level, 20)); // default max 20
      if(custom) words=words.concat(custom.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean)); 
      if(words.length===0){alert('Add words or pick a theme'); return}
      const {grid,placements}=generate(words,size,level);
      renderGridTo($('gridWrap'),grid,false);
      renderWordList($('wordListWrap'),placements.map(p=>p.word));
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
