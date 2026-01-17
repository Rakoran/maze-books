// Riddles generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function buildRiddleSet(theme, custom, count){
    let riddles = [];
    if(theme && THEMES[theme]) riddles = riddles.concat(THEMES[theme]);
    if(custom){
      const extra = custom.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);
      extra.forEach(w=>{
        riddles.push({riddle:`I am ${w}. What am I?`, answer:w});
      });
    }
    if(riddles.length===0) return [];
    return shuffle(riddles).slice(0, count);
  }

  function renderRiddles(el, items, showAnswers){
    const list = document.createElement('ol');
    list.className = 'riddle-list';
    items.forEach((it, idx)=>{
      const li = document.createElement('li');
      const q = document.createElement('div');
      q.className = 'riddle-q';
      q.textContent = it.riddle;
      li.appendChild(q);
      if(showAnswers){
        const a = document.createElement('div');
        a.className = 'riddle-a';
        a.textContent = `Answer: ${it.answer}`;
        li.appendChild(a);
      }else{
        const line = document.createElement('div');
        line.className = 'riddle-a';
        line.textContent = 'Answer: __________________';
        li.appendChild(line);
      }
      list.appendChild(li);
    });
    el.innerHTML = '';
    el.appendChild(list);
  }

  function savePng(el, bg){
    const padding = 16;
    const lineHeight = 26;
    const width = 720;
    const items = el.querySelectorAll('.riddle-list li');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = padding*2 + items.length * (lineHeight*3);
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    ctx.fillStyle = '#111';
    ctx.textBaseline = 'top';
    let y = padding;
    items.forEach((li, i)=>{
      const q = li.querySelector('.riddle-q').textContent;
      const a = li.querySelector('.riddle-a').textContent;
      ctx.font = `bold ${lineHeight}px sans-serif`;
      ctx.fillText(`${i+1}. ${q}`, padding, y);
      y += lineHeight + 4;
      ctx.font = `${lineHeight-2}px sans-serif`;
      ctx.fillText(a, padding, y);
      y += lineHeight*2;
    });

    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'riddles.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      THEMES = data.riddleThemes || {};
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
      let size = parseInt(document.getElementById('size').value,10) || 6;
      if(size < 3) size = 3;
      if(size > 12) size = 12;
      document.getElementById('size').value = size;
      const items = buildRiddleSet(theme, custom, size);
      if(items.length===0){alert('Add a theme or custom words'); return}
      window.__riddles = {items};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderRiddles(document.getElementById('gridWrap'), items, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__riddles; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderRiddles(document.getElementById('gridWrap'), last.items, window.__showAnswers);
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
