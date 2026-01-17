// Counting patterns generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function pickPattern(age){
    const easy = [
      {start:2, step:1},
      {start:4, step:2},
      {start:10, step:5},
      {start:3, step:3}
    ];
    const medium = [
      {start:7, step:2},
      {start:20, step:5},
      {start:9, step:3},
      {start:5, step:4}
    ];
    const hard = [
      {start:12, step:7},
      {start:25, step:6},
      {start:30, step:8},
      {start:15, step:9}
    ];
    if(age==='3-6') return shuffle(easy)[0];
    if(age==='6-8') return shuffle(easy.concat(medium))[0];
    if(age==='9-12') return shuffle(medium)[0];
    if(age==='13-17') return shuffle(medium.concat(hard))[0];
    if(age==='Adults') return shuffle(hard)[0];
    return shuffle(medium)[0];
  }

  function buildSequence(start, step, length){
    const out = [];
    for(let i=0;i<length;i++) out.push(start + step*i);
    return out;
  }

  function hideSome(sequence, count){
    const idxs = sequence.map((_,i)=>i);
    shuffle(idxs);
    const missing = new Set(idxs.slice(0, count));
    return sequence.map((v,i)=>({value:v, missing:missing.has(i)}));
  }

  function renderGrid(el, items, size, showAnswers){
    const table = document.createElement('table');
    table.className = 'grid patterns';
    for(let r=0;r<size;r++){
      const tr = document.createElement('tr');
      for(let c=0;c<size;c++){
        const i = r*size + c;
        const td = document.createElement('td');
        const item = items[i];
        if(item.missing && !showAnswers){
          td.textContent = '';
          td.classList.add('missing');
        }else{
          td.textContent = String(item.value);
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    el.innerHTML = '';
    el.appendChild(table);
  }

  function savePng(table, bg){
    const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px',10) || 30;
    const rows = table.rows.length;
    const cols = table.rows[0].cells.length;
    const padding = 8;
    const canvas = document.createElement('canvas');
    canvas.width = cols*cell + padding*2;
    canvas.height = rows*cell + padding*2;
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    ctx.strokeStyle = '#999';
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x = padding + c*cell;
        const y = padding + r*cell;
        ctx.strokeRect(x, y, cell, cell);
        const text = table.rows[r].cells[c].textContent;
        if(text){
          ctx.fillStyle = '#111';
          ctx.font = `${Math.floor(cell*0.55)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, x + cell/2, y + cell/2 + 1);
        }
      }
    }

    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'patterns.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
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
    }).catch(()=>{THEMES = {}});

    document.getElementById('generate').addEventListener('click',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 6;
      if(size < 4) size = 4;
      if(size > 12) size = 12;
      document.getElementById('size').value = size;
      const length = size*size;
      const pattern = pickPattern(age);
      const seq = buildSequence(pattern.start, pattern.step, length);
      const missingCount = Math.max(2, Math.floor(length * 0.25));
      const items = hideSome(seq, missingCount);
      window.__pattern = {items, size};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderGrid(document.getElementById('gridWrap'), items, size, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__pattern; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderGrid(document.getElementById('gridWrap'), last.items, last.size, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const table = document.querySelector('#gridWrap table'); if(!table){alert('Generate first'); return}
      savePng(table, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
