// Word ladder generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function normalizeWord(w){
    return w.toLowerCase().replace(/[^a-z]/g, '');
  }

  function uniq(list){
    const set = new Set();
    const out = [];
    list.forEach(w=>{
      if(!set.has(w)){set.add(w); out.push(w);}
    });
    return out;
  }

  function buildBuckets(words){
    const buckets = {};
    words.forEach(w=>{
      for(let i=0;i<w.length;i++){
        const key = w.slice(0,i) + '_' + w.slice(i+1);
        if(!buckets[key]) buckets[key] = [];
        buckets[key].push(w);
      }
    });
    return buckets;
  }

  function neighborsOf(word, buckets){
    const set = new Set();
    for(let i=0;i<word.length;i++){
      const key = word.slice(0,i) + '_' + word.slice(i+1);
      const list = buckets[key] || [];
      list.forEach(w=>{if(w !== word) set.add(w);});
    }
    return Array.from(set);
  }

  function findPath(words, minLen, maxLen){
    const buckets = buildBuckets(words);
    const attempts = 40;
    for(let t=0;t<attempts;t++){
      const start = words[Math.floor(Math.random()*words.length)];
      let end = words[Math.floor(Math.random()*words.length)];
      if(end === start) continue;
      const queue = [start];
      const prev = {};
      const seen = new Set([start]);
      let found = false;
      while(queue.length){
        const cur = queue.shift();
        if(cur === end){found = true; break;}
        for(const n of neighborsOf(cur, buckets)){
          if(seen.has(n)) continue;
          seen.add(n);
          prev[n] = cur;
          queue.push(n);
        }
      }
      if(!found) continue;
      const path = [];
      let cur = end;
      while(cur){
        path.push(cur);
        cur = prev[cur];
      }
      path.reverse();
      if(minLen && path.length < minLen) continue;
      if(maxLen && path.length > maxLen) continue;
      return path;
    }
    return null;
  }

  function renderLadder(el, path, showAnswers){
    const list = document.createElement('ol');
    list.className = 'ladder-list';
    const blank = path[0].length;
    path.forEach((w, i)=>{
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'ladder-word';
      if(i === 0 || i === path.length - 1 || showAnswers){
        span.textContent = w.toUpperCase();
      }else{
        span.textContent = '_'.repeat(blank);
        span.classList.add('ladder-blank');
      }
      li.appendChild(span);
      list.appendChild(li);
    });
    el.innerHTML = '';
    el.appendChild(list);
  }

  function savePng(el, bg){
    const padding = 16;
    const lineHeight = 28;
    const width = 480;
    const items = el.querySelectorAll('.ladder-list li');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = padding*2 + items.length * (lineHeight + 6);
    const ctx = canvas.getContext('2d');

    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    ctx.fillStyle = '#111';
    ctx.font = `bold ${lineHeight}px sans-serif`;
    ctx.textBaseline = 'top';
    let y = padding;
    items.forEach((li, i)=>{
      ctx.fillText(`${i+1}. ${li.textContent}`, padding, y);
      y += lineHeight + 6;
    });

    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'word-ladder.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function sizeForAge(age){
    if(age==='3-6') return 3;
    if(age==='6-8') return 3;
    if(age==='9-12') return 4;
    if(age==='13-17') return 5;
    if(age==='Adults') return 5;
    return 4;
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      THEMES = data.ladderThemes || {};
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
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 4;
      if(age){size = sizeForAge(age);}
      size = Math.max(3, Math.min(5, size));
      document.getElementById('size').value = size;
      const custom = document.getElementById('custom').value.trim();
      let words = [];
      if(theme && THEMES[theme]) words = words.concat(THEMES[theme]);
      if(custom){
        words = words.concat(custom.split(/[,;\n]+/).map(normalizeWord).filter(Boolean));
      }
      words = uniq(words.map(normalizeWord)).filter(w=>w.length===size);
      if(words.length < 2){alert('Not enough words of that length. Try another theme or size.'); return}
      const path = findPath(words, 3, 10);
      if(!path){alert('Could not find a ladder. Try another theme or size.'); return}
      window.__ladder = {path};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderLadder(document.getElementById('gridWrap'), path, false);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__ladder; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderLadder(document.getElementById('gridWrap'), last.path, window.__showAnswers);
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
