// I-Spy generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  const PALETTES = {
    ocean: [
      {name:'navy', color:'#023e8a'},
      {name:'blue', color:'#0077b6'},
      {name:'aqua', color:'#00b4d8'},
      {name:'sky', color:'#90e0ef'}
    ],
    nature: [
      {name:'forest', color:'#2b9348'},
      {name:'leaf', color:'#55a630'},
      {name:'lime', color:'#80b918'},
      {name:'sun', color:'#aacc00'}
    ],
    space: [
      {name:'violet', color:'#5f0f40'},
      {name:'indigo', color:'#3a0ca3'},
      {name:'blue', color:'#4361ee'},
      {name:'gold', color:'#f9c74f'}
    ],
    classic: [
      {name:'red', color:'#e63946'},
      {name:'blue', color:'#457b9d'},
      {name:'green', color:'#2a9d8f'},
      {name:'orange', color:'#f4a261'}
    ]
  };

  function paletteFor(theme){
    if(PALETTES[theme]) return PALETTES[theme];
    return PALETTES.classic;
  }

  function targetCount(age, size){
    let base = Math.max(4, Math.min(10, Math.floor(size/2) + 2));
    if(age==='3-6') base = Math.max(3, Math.floor(base * 0.7));
    if(age==='6-8') base = Math.max(4, Math.floor(base * 0.8));
    if(age==='13-17') base = Math.floor(base * 1.1);
    if(age==='Adults') base = Math.floor(base * 1.2);
    return Math.max(3, Math.min(12, base));
  }

  function generateScene(size, palette){
    const shapes = ['circle','square','triangle','star'];
    const items = [];
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const type = shapes[Math.floor(Math.random()*shapes.length)];
        const color = palette[Math.floor(Math.random()*palette.length)];
        items.push({r,c,type,colorName:color.name,color:color.color});
      }
    }
    return items;
  }

  function countTargets(items){
    const counts = {};
    items.forEach(it=>{
      const key = `${it.colorName}|${it.type}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  function pickTargets(items, count){
    const counts = countTargets(items);
    const keys = Object.keys(counts);
    const chosen = shuffle(keys).slice(0, Math.min(count, keys.length));
    return chosen.map(k=>{
      const [colorName, type] = k.split('|');
      return {key:k, colorName, type, count:counts[k]};
    });
  }

  function pluralize(n, word){
    if(n === 1) return word;
    if(word.endsWith('s')) return word + 'es';
    return word + 's';
  }

  function drawStar(ctx, x, y, r){
    const spikes = 5;
    const step = Math.PI / spikes;
    ctx.beginPath();
    for(let i=0;i<spikes*2;i++){
      const rad = (i % 2 === 0) ? r : r*0.45;
      const ang = i * step - Math.PI/2;
      ctx.lineTo(x + Math.cos(ang)*rad, y + Math.sin(ang)*rad);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawShape(ctx, it, cell, padding){
    const x = padding + it.c*cell + cell/2;
    const y = padding + it.r*cell + cell/2;
    const r = cell*0.32;
    ctx.fillStyle = it.color;
    if(it.type === 'circle'){
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
    }else if(it.type === 'square'){
      ctx.fillRect(x - r, y - r, r*2, r*2);
    }else if(it.type === 'triangle'){
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
      ctx.fill();
    }else{
      drawStar(ctx, x, y, r);
    }
  }

  function renderScene(canvas, items, size, options){
    const opts = options || {};
    const bg = opts.bg || 'transparent';
    const showAnswers = !!opts.showAnswers;
    const targets = opts.targets || [];
    const targetSet = new Set(targets.map(t=>t.key));
    const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px',10) || 30;
    const padding = 8;
    canvas.width = size*cell + padding*2;
    canvas.height = size*cell + padding*2;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    items.forEach(it=>drawShape(ctx, it, cell, padding));
    if(showAnswers){
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2.5;
      items.forEach(it=>{
        const key = `${it.colorName}|${it.type}`;
        if(!targetSet.has(key)) return;
        const x = padding + it.c*cell + cell/2;
        const y = padding + it.r*cell + cell/2;
        ctx.beginPath();
        ctx.arc(x, y, cell*0.38, 0, Math.PI*2);
        ctx.stroke();
      });
    }
  }

  function renderList(el, targets){
    const list = document.createElement('ul');
    list.className = 'ispy-list';
    targets.forEach(t=>{
      const li = document.createElement('li');
      const label = `${t.count} ${t.colorName} ${pluralize(t.count, t.type)}`;
      li.textContent = label;
      list.appendChild(li);
    });
    el.innerHTML = '';
    el.appendChild(list);
  }

  function savePng(canvas, targets, bg){
    const padding = 16;
    const listHeight = targets.length * 20 + 22;
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height + listHeight + padding;
    const ctx = out.getContext('2d');
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,out.width,out.height);
    }
    ctx.drawImage(canvas, 0, 0);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let y = canvas.height + 8;
    ctx.fillText('Find:', padding, y);
    y += 22;
    ctx.font = '14px sans-serif';
    targets.forEach(t=>{
      const label = `${t.count} ${t.colorName} ${pluralize(t.count, t.type)}`;
      ctx.fillText(label, padding, y);
      y += 20;
    });
    out.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ispy.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function init(){
    const themeSelect = document.getElementById('themeSelect');
    fetch('themes.json').then(r=>r.json()).then(data=>{
      THEMES = data.iSpyThemes || data.themes || {};
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

    const canvas = document.getElementById('ispyCanvas');

    document.getElementById('generate').addEventListener('click',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const theme = themeSelect.value;
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 10;
      size = Math.max(6, Math.min(20, size));
      document.getElementById('size').value = size;
      const palette = paletteFor(theme);
      const items = generateScene(size, palette);
      const targets = pickTargets(items, targetCount(age, size));
      window.__ispy = {items, size, targets};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderScene(canvas, items, size, {showAnswers:false});
      renderList(document.getElementById('listWrap'), targets);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__ispy; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderScene(canvas, last.items, last.size, {showAnswers:window.__showAnswers, targets:last.targets});
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__ispy; if(!last){alert('Generate first'); return}
      renderScene(canvas, last.items, last.size, {showAnswers:window.__showAnswers, targets:last.targets, bg:document.getElementById('bgSelect').value});
      savePng(canvas, last.targets, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const last = window.__ispy; if(!last) return;
      renderScene(canvas, last.items, last.size, {showAnswers:window.__showAnswers, targets:last.targets});
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
