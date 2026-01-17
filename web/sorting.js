// Counting and sorting generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function buildItems(size, age){
    const count = Math.max(6, Math.min(size, 30));
    const base = [];
    if(age==='3-6'){
      for(let i=0;i<count;i++) base.push(Math.floor(Math.random()*9)+1);
    }else if(age==='6-8'){
      for(let i=0;i<count;i++) base.push(Math.floor(Math.random()*20)+1);
    }else if(age==='9-12'){
      for(let i=0;i<count;i++) base.push(Math.floor(Math.random()*50)+1);
    }else if(age==='13-17'){
      for(let i=0;i<count;i++) base.push(Math.floor(Math.random()*99)+1);
    }else if(age==='Adults'){
      for(let i=0;i<count;i++) base.push(Math.floor(Math.random()*199)+1);
    }else{
      for(let i=0;i<count;i++) base.push(Math.floor(Math.random()*50)+1);
    }
    return base;
  }

  function renderPuzzle(el, items, showAnswers){
    const sorted = items.slice().sort((a,b)=>a-b);
    const wrapper = document.createElement('div');
    wrapper.className = 'sort-wrap';

    const unsorted = document.createElement('div');
    unsorted.className = 'sort-row';
    unsorted.innerHTML = `<strong>Unsorted:</strong> ${items.join(', ')}`;

    const sortedRow = document.createElement('div');
    sortedRow.className = 'sort-row';
    sortedRow.innerHTML = `<strong>Sorted:</strong> ${showAnswers ? sorted.join(', ') : '__________'}`;

    wrapper.appendChild(unsorted);
    wrapper.appendChild(sortedRow);
    el.innerHTML = '';
    el.appendChild(wrapper);
  }

  function savePng(el, bg){
    const padding = 16;
    const lineHeight = 28;
    const width = 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    ctx.fillStyle = '#111';
    ctx.font = `bold ${lineHeight}px sans-serif`;
    ctx.textBaseline = 'top';
    const rows = el.querySelectorAll('.sort-row');
    let y = padding;
    rows.forEach(row=>{
      ctx.fillText(row.textContent, padding, y);
      y += lineHeight + 8;
    });

    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sorting.png';
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
      let size = parseInt(document.getElementById('size').value,10) || 12;
      if(size < 6) size = 6;
      if(size > 30) size = 30;
      document.getElementById('size').value = size;
      const items = buildItems(size, age);
      window.__sort = {items};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderPuzzle(document.getElementById('gridWrap'), items, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__sort; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderPuzzle(document.getElementById('gridWrap'), last.items, window.__showAnswers);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const wrap = document.getElementById('gridWrap'); if(!wrap.firstChild){alert('Generate first'); return}
      savePng(wrap, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
