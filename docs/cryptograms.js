// Cryptogram generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function buildCipher(){
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let shuffled = letters.slice();
    let tries = 0;
    do{
      shuffled = shuffle(shuffled);
      tries++;
    }while(shuffled.some((ch,i)=>ch===letters[i]) && tries < 50);
    const map = {};
    letters.forEach((ch,i)=>{map[ch]=shuffled[i]});
    return map;
  }

  function buildHints(map, count){
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const inverse = {};
    letters.forEach(ch=>{inverse[map[ch]] = ch});
    const picks = shuffle(letters.slice()).slice(0, Math.max(1, count));
    return picks.map(cipher=>({cipher, plain: inverse[cipher]}));
  }

  function encode(text, map){
    return text.toUpperCase().replace(/[A-Z]/g, ch=>map[ch] || ch);
  }

  function parseCustom(text){
    return text.split(/[\n;]+/).map(s=>s.trim()).filter(Boolean);
  }

  function pickPhrases(theme, custom, count){
    let pool = [];
    if(theme && THEMES[theme]) pool = pool.concat(THEMES[theme]);
    if(custom){
      pool = pool.concat(parseCustom(custom));
    }
    if(pool.length===0) return [];
    return shuffle(pool).slice(0, count);
  }

  function renderList(el, items, showAnswers){
    const list = document.createElement('ol');
    list.className = 'crypto-list';
    items.forEach(it=>{
      const li = document.createElement('li');
      const q = document.createElement('div');
      q.className = 'crypto-q';
      q.textContent = it.cipher;
      li.appendChild(q);
      const a = document.createElement('div');
      a.className = 'crypto-a';
      a.textContent = showAnswers ? `Answer: ${it.plain}` : 'Answer: __________________________';
      li.appendChild(a);
      list.appendChild(li);
    });
    el.innerHTML = '';
    el.appendChild(list);
  }

  function renderHints(el, hints){
    const wrap = document.createElement('div');
    wrap.className = 'crypto-hints';
    const title = document.createElement('div');
    title.className = 'crypto-hints-title';
    title.textContent = 'Hints';
    wrap.appendChild(title);
    const line = document.createElement('div');
    line.className = 'crypto-hints-line';
    line.textContent = hints.map(h=>`${h.cipher} = ${h.plain}`).join('   ');
    wrap.appendChild(line);
    el.innerHTML = '';
    el.appendChild(wrap);
  }

  function hintCount(age){
    if(age==='3-6') return 6;
    if(age==='6-8') return 5;
    if(age==='9-12') return 4;
    if(age==='13-17') return 3;
    if(age==='Adults') return 2;
    return 3;
  }

  function savePng(el, bg){
    const padding = 16;
    const lineHeight = 26;
    const width = 760;
    const items = el.querySelectorAll('.crypto-list li');
    const hintLine = document.getElementById('hintWrap').textContent || '';
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = padding*2 + items.length * (lineHeight*3) + lineHeight*2;
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    ctx.fillStyle = '#111';
    ctx.textBaseline = 'top';
    let y = padding;
    items.forEach((li, i)=>{
      const q = li.querySelector('.crypto-q').textContent;
      const a = li.querySelector('.crypto-a').textContent;
      ctx.font = `bold ${lineHeight}px sans-serif`;
      ctx.fillText(`${i+1}. ${q}`, padding, y);
      y += lineHeight + 4;
      ctx.font = `${lineHeight-2}px sans-serif`;
      ctx.fillText(a, padding, y);
      y += lineHeight*2;
    });
    if(hintLine.trim()){
      ctx.font = `bold ${lineHeight}px sans-serif`;
      ctx.fillText(hintLine, padding, y);
    }

    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cryptograms.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      THEMES = data.cryptogramThemes || {};
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
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 3;
      size = Math.max(1, Math.min(8, size));
      document.getElementById('size').value = size;
      const phrases = pickPhrases(theme, custom, size);
      if(phrases.length===0){alert('Add a theme or custom phrases'); return}
      const cipher = buildCipher();
      const hints = buildHints(cipher, hintCount(age));
      const items = phrases.map(p=>({plain:p, cipher:encode(p, cipher)}));
      window.__crypt = {items, hints};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderList(document.getElementById('gridWrap'), items, false);
      renderHints(document.getElementById('hintWrap'), hints);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__crypt; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderList(document.getElementById('gridWrap'), last.items, window.__showAnswers);
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
