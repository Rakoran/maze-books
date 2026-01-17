// Spot the difference generator for the web UI
(function(){
  let THEMES = {};
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function paletteFor(theme){
    const base = ['#e63946','#457b9d','#2a9d8f','#f4a261','#8ecae6','#ffb703','#b5179e','#6d6875'];
    const ocean = ['#023e8a','#0077b6','#00b4d8','#90e0ef','#48cae4','#0096c7'];
    const nature = ['#2b9348','#55a630','#80b918','#aacc00','#bfd200','#d4d700'];
    const sunset = ['#ff6b6b','#f06595','#cc5de8','#845ef7','#5c7cfa','#4dabf7'];
    if(theme==='ocean') return ocean;
    if(theme==='nature') return nature;
    if(theme==='sunset') return sunset;
    return base;
  }

  function differenceCount(age){
    if(age==='3-6') return 3;
    if(age==='6-8') return 4;
    if(age==='9-12') return 6;
    if(age==='13-17') return 8;
    if(age==='Adults') return 10;
    return 5;
  }

  function buildShapes(size, palette){
    const count = Math.max(8, Math.min(40, Math.floor(size*size*0.35)));
    const cells = [];
    for(let r=0;r<size;r++) for(let c=0;c<size;c++) cells.push({r,c});
    shuffle(cells);
    const shapes = [];
    for(let i=0;i<count;i++){
      const cell = cells[i];
      const cx = cell.c + 0.5 + (Math.random()-0.5)*0.3;
      const cy = cell.r + 0.5 + (Math.random()-0.5)*0.3;
      const type = shuffle(['circle','square','triangle'])[0];
      const sizeScale = 0.25 + Math.random()*0.2;
      const color = palette[Math.floor(Math.random()*palette.length)];
      shapes.push({type, x:cx, y:cy, s:sizeScale, color});
    }
    return shapes;
  }

  function cloneShapes(shapes){
    return shapes.map(s=>({type:s.type,x:s.x,y:s.y,s:s.s,color:s.color}));
  }

  function applyDifferences(shapesA, shapesB, diffs, palette){
    const indices = shuffle(shapesA.map((_,i)=>i)).slice(0, diffs);
    const diffMarks = [];
    indices.forEach(idx=>{
      const a = shapesA[idx];
      const b = shapesB[idx];
      const old = {x:b.x, y:b.y};
      const action = shuffle(['color','size','move','shape'])[0];
      if(action==='color'){
        b.color = palette[(palette.indexOf(b.color)+1) % palette.length];
      }else if(action==='size'){
        b.s = Math.max(0.18, Math.min(0.5, b.s + (Math.random()>0.5?0.1:-0.1)));
      }else if(action==='move'){
        b.x = Math.max(0.2, Math.min(0.8, b.x + (Math.random()-0.5)*0.3));
        b.y = Math.max(0.2, Math.min(0.8, b.y + (Math.random()-0.5)*0.3));
      }else{
        b.type = shuffle(['circle','square','triangle'])[0];
      }
      diffMarks.push({a:{x:a.x,y:a.y}, b:{x:b.x,y:b.y}});
    });
    return diffMarks;
  }

  function drawShape(ctx, shape, cell, padding){
    const x = padding + shape.x*cell;
    const y = padding + shape.y*cell;
    const r = shape.s*cell;
    ctx.fillStyle = shape.color;
    if(shape.type==='circle'){
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
    }else if(shape.type==='square'){
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }else{
      ctx.beginPath();
      ctx.moveTo(x, y-r);
      ctx.lineTo(x+r, y+r);
      ctx.lineTo(x-r, y+r);
      ctx.closePath();
      ctx.fill();
    }
  }

  function renderScene(canvas, shapes, size, options){
    const opts = options || {};
    const showAnswers = !!opts.showAnswers;
    const marks = opts.marks || [];
    const bg = opts.bg || 'transparent';
    const cell = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell') || '30px',10) || 30;
    const padding = 8;
    canvas.width = size*cell + padding*2;
    canvas.height = size*cell + padding*2;
    canvas.className = 'diff-canvas';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    shapes.forEach(s=>drawShape(ctx, s, cell, padding));
    if(showAnswers){
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 3;
      marks.forEach(m=>{
        const x = padding + m.x*cell;
        const y = padding + m.y*cell;
        ctx.beginPath();
        ctx.arc(x, y, cell*0.35, 0, Math.PI*2);
        ctx.stroke();
      });
    }
  }

  function saveCombinedPng(aCanvas, bCanvas, marksA, marksB, bg){
    const padding = 16;
    const width = aCanvas.width + bCanvas.width + padding*3;
    const height = Math.max(aCanvas.height, bCanvas.height) + padding*2 + 18;
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,out.width,out.height);
    }
    ctx.fillStyle = '#111';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('A', padding, padding+12);
    ctx.fillText('B', padding*2 + aCanvas.width, padding+12);
    ctx.drawImage(aCanvas, padding, padding+18);
    ctx.drawImage(bCanvas, padding*2 + aCanvas.width, padding+18);
    out.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'differences.png';
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
    }).catch(()=>{THEMES = {}});

    const canvasA = document.getElementById('canvasA');
    const canvasB = document.getElementById('canvasB');

    document.getElementById('generate').addEventListener('click',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const theme = themeSelect.value;
      const age = document.getElementById('ageSelect').value;
      let size = parseInt(document.getElementById('size').value,10) || 10;
      size = Math.max(6, Math.min(20, size));
      document.getElementById('size').value = size;
      const palette = paletteFor(theme);
      const shapesA = buildShapes(size, palette);
      const shapesB = cloneShapes(shapesA);
      const diffs = differenceCount(age);
      const marks = applyDifferences(shapesA, shapesB, diffs, palette);
      const marksA = marks.map(m=>m.a);
      const marksB = marks.map(m=>m.b);
      window.__diff = {size, shapesA, shapesB, marksA, marksB};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderScene(canvasA, shapesA, size, {showAnswers:false});
      renderScene(canvasB, shapesB, size, {showAnswers:false});
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__diff; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderScene(canvasA, last.shapesA, last.size, {showAnswers:window.__showAnswers, marks:last.marksA});
      renderScene(canvasB, last.shapesB, last.size, {showAnswers:window.__showAnswers, marks:last.marksB});
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__diff; if(!last){alert('Generate first'); return}
      renderScene(canvasA, last.shapesA, last.size, {showAnswers:window.__showAnswers, marks:last.marksA, bg:document.getElementById('bgSelect').value});
      renderScene(canvasB, last.shapesB, last.size, {showAnswers:window.__showAnswers, marks:last.marksB, bg:document.getElementById('bgSelect').value});
      saveCombinedPng(canvasA, canvasB, last.marksA, last.marksB, document.getElementById('bgSelect').value);
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const last = window.__diff; if(!last) return;
      renderScene(canvasA, last.shapesA, last.size, {showAnswers:window.__showAnswers, marks:last.marksA});
      renderScene(canvasB, last.shapesB, last.size, {showAnswers:window.__showAnswers, marks:last.marksB});
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
