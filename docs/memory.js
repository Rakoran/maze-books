// Memory match generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function sizeForAge(age){
    if(age==='3-6') return 3;
    if(age==='6-8') return 4;
    if(age==='9-12') return 4;
    if(age==='13-17') return 5;
    if(age==='Adults') return 6;
    return 4;
  }

  function buildDeck(words, count){
    const picks = shuffle(words).slice(0, count);
    const deck = shuffle(picks.concat(picks));
    return deck;
  }

  function renderGrid(el, deck, size, showAnswers){
    const table = document.createElement('table');
    table.className = 'grid memory';
    const total = size * size;
    for(let r=0;r<size;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<size;c++){
        const idx = r*size + c;
        const td = document.createElement('td');
        if(idx < total){
          td.textContent = showAnswers ? deck[idx].toUpperCase() : '';
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML = '';
    el.appendChild(table);
  }

  function savePng(deck, size, showAnswers, bg){
    const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px',10) || 30;
    const padding = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size*cell + padding*2;
    canvas.height = size*cell + padding*2;
    const ctx = canvas.getContext('2d');
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(cell*0.45)}px sans-serif`;
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const x = padding + c*cell;
        const y = padding + r*cell;
        ctx.strokeRect(x, y, cell, cell);
        const idx = r*size + c;
        if(showAnswers){
          ctx.fillStyle = '#111';
          ctx.fillText(deck[idx].toUpperCase(), x + cell/2, y + cell/2);
        }
      }
    }
    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'memory.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
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
    });

    document.getElementById('generate').addEventListener('click',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 4;
      if(age) size = sizeForAge(age);
      size = Math.max(2, Math.min(6, size));
      if((size*size) % 2 !== 0) size = size - 1;
      document.getElementById('size').value = size;
      const theme = themeSelect.value;
      const custom = document.getElementById('custom').value.trim();
      let words = [];
      if(theme && THEMES[theme]) words = words.concat(THEMES[theme]);
      if(custom) words = words.concat(custom.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean));
      if(words.length < (size*size)/2){alert('Not enough words for this grid size. Add more words or choose a smaller size.'); return}
      const deck = buildDeck(words, (size*size)/2);
      window.__memory = {deck, size};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), deck, size, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__memory; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.deck, last.size, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__memory; if(!last){alert('Generate first'); return}
      savePng(last.deck, last.size, window.__showAnswers, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
