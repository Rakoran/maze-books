// Logic grid puzzle renderer for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function pickPuzzle(theme, size){
    let pool = [];
    if(theme && THEMES[theme]) pool = pool.concat(THEMES[theme]);
    if(pool.length===0) return null;
    const filtered = pool.filter(p=>p.categories && p.categories[0].items.length === size);
    if(filtered.length) return shuffle(filtered)[0];
    return shuffle(pool)[0];
  }

  function renderGrid(el, puzzle, showAnswers){
    const cats = puzzle.categories;
    const base = cats[0];
    const grid = document.createElement('table');
    grid.className = 'grid logic-grid';
    const header = document.createElement('tr');
    header.appendChild(document.createElement('th'));
    cats.slice(1).forEach(cat=>{
      cat.items.forEach(it=>{
        const th = document.createElement('th');
        th.textContent = it;
        header.appendChild(th);
      });
    });
    grid.appendChild(header);
    base.items.forEach(name=>{
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = name;
      tr.appendChild(th);
      cats.slice(1).forEach(cat=>{
        cat.items.forEach(it=>{
          const td = document.createElement('td');
          if(showAnswers){
            const match = puzzle.solution[name][cat.name];
            td.textContent = (match === it) ? 'X' : '';
          }else{
            td.textContent = '';
          }
          tr.appendChild(td);
        });
      });
      grid.appendChild(tr);
    });
    el.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'logic-title';
    title.textContent = puzzle.title || 'Logic Grid';
    el.appendChild(title);
    el.appendChild(grid);
  }

  function renderClues(el, clues){
    const wrap = document.createElement('div');
    wrap.className = 'logic-clues';
    const h = document.createElement('div');
    h.className = 'logic-clues-title';
    h.textContent = 'Clues';
    wrap.appendChild(h);
    const list = document.createElement('ol');
    clues.forEach(c=>{
      const li = document.createElement('li');
      li.textContent = c;
      list.appendChild(li);
    });
    wrap.appendChild(list);
    el.innerHTML = '';
    el.appendChild(wrap);
  }

  function savePng(wrapper, bg){
    const grid = wrapper.querySelector('table.logic-grid');
    if(!grid) return;
    const padding = 16;
    const rows = grid.rows.length;
    const cols = grid.rows[0].cells.length;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const cellFont = 12;
    const headerFont = 13;
    ctx.font = `${cellFont}px sans-serif`;
    let maxText = 0;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const text = grid.rows[r].cells[c].textContent || '';
        maxText = Math.max(maxText, ctx.measureText(text).width);
      }
    }
    const cell = Math.max(32, Math.ceil(maxText + 16));
    const clueItems = wrapper.querySelectorAll('.logic-clues li');
    const clueHeight = clueItems.length * 16 + 34;
    const width = cols*cell + padding*2;
    const height = rows*cell + padding*2 + clueHeight;
    canvas.width = width;
    canvas.height = height;
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,width,height);
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const startY = padding + 20;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x = padding + c*cell;
        const y = startY + r*cell;
        ctx.strokeRect(x, y, cell, cell);
        const text = grid.rows[r].cells[c].textContent;
        if(text){
          ctx.fillStyle = '#111';
          ctx.font = (r === 0 || c === 0) ? `bold ${headerFont}px sans-serif` : `${cellFont}px sans-serif`;
          ctx.fillText(text, x + cell/2, y + cell/2);
        }
      }
    }
    const clues = wrapper.querySelectorAll('.logic-clues li');
    let y = startY + rows*cell + 16;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Clues', padding, y);
    y += 18;
    ctx.font = '13px sans-serif';
    clues.forEach((li, i)=>{
      ctx.fillText(`${i+1}. ${li.textContent}`, padding, y);
      y += 16;
    });
    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'logic-grid.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      THEMES = data.logicThemes || {};
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
      let size = parseInt(document.getElementById('size').value,10) || 3;
      size = Math.max(3, Math.min(4, size));
      document.getElementById('size').value = size;
      const puzzle = pickPuzzle(theme, size);
      if(!puzzle){alert('No logic grids available for that theme.'); return}
      window.__logic = {puzzle};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), puzzle, false);
      renderClues(document.getElementById('clueWrap'), puzzle.clues || []);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__logic; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.puzzle, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const wrap = document.getElementById('gridWrap'); if(!wrap.firstChild){alert('Generate first'); return}
      savePng(document.getElementById('output'), document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
