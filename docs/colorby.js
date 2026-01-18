// Color by Number generator for the web UI
(function(){
  let AGE_PRESETS = {};

  function applyBackground(value){
    document.documentElement.style.setProperty('--puzzle-bg', value || 'transparent');
  }

  function paletteFor(age){
    const base = [
      {n:1, color:'#e63946'},
      {n:2, color:'#457b9d'},
      {n:3, color:'#2a9d8f'},
      {n:4, color:'#f4a261'},
      {n:5, color:'#f9c74f'},
      {n:6, color:'#5f0f40'}
    ];
    if(age==='3-6') return base.slice(0,3);
    if(age==='6-8') return base.slice(0,4);
    if(age==='9-12') return base.slice(0,5);
    if(age==='13-17') return base.slice(0,6);
    if(age==='Adults') return base.slice(0,6);
    return base.slice(0,4);
  }

  function generateGrid(size, palette){
    const grid = Array.from({length:size},()=>Array(size).fill(0));
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const pick = palette[Math.floor(Math.random()*palette.length)];
        grid[r][c] = pick.n;
      }
    }
    return grid;
  }

  function loadImageFromFile(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = function(){
        const img = new Image();
        img.onload = ()=>resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function drawImageToGrid(img, size){
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,size,size);
    // cover-fit to square
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    return ctx.getImageData(0,0,size,size);
  }

  function quantizeColors(imageData, colorCount){
    const data = imageData.data;
    const pixels = [];
    for(let i=0;i<data.length;i+=4){
      pixels.push([data[i], data[i+1], data[i+2]]);
    }
    // initialize centroids by sampling
    const centroids = [];
    for(let i=0;i<colorCount;i++){
      const idx = Math.floor(Math.random()*pixels.length);
      centroids.push(pixels[idx].slice());
    }
    for(let iter=0; iter<6; iter++){
      const sums = Array.from({length:colorCount},()=>[0,0,0,0]);
      for(const p of pixels){
        let best = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for(let k=0;k<centroids.length;k++){
          const c = centroids[k];
          const dr = p[0]-c[0], dg = p[1]-c[1], db = p[2]-c[2];
          const d = dr*dr + dg*dg + db*db;
          if(d < bestDist){bestDist = d; best = k;}
        }
        sums[best][0] += p[0];
        sums[best][1] += p[1];
        sums[best][2] += p[2];
        sums[best][3] += 1;
      }
      for(let k=0;k<centroids.length;k++){
        if(sums[k][3] === 0) continue;
        centroids[k][0] = Math.round(sums[k][0] / sums[k][3]);
        centroids[k][1] = Math.round(sums[k][1] / sums[k][3]);
        centroids[k][2] = Math.round(sums[k][2] / sums[k][3]);
      }
    }
    const palette = centroids.map((c, i)=>({
      n: i+1,
      color: `rgb(${c[0]},${c[1]},${c[2]})`,
      rgb: c
    }));
    const grid = [];
    const size = Math.sqrt(pixels.length);
    for(let r=0;r<size;r++){
      const row = [];
      for(let c=0;c<size;c++){
        const p = pixels[r*size + c];
        let best = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for(let k=0;k<palette.length;k++){
          const d0 = p[0]-palette[k].rgb[0];
          const d1 = p[1]-palette[k].rgb[1];
          const d2 = p[2]-palette[k].rgb[2];
          const d = d0*d0 + d1*d1 + d2*d2;
          if(d < bestDist){bestDist = d; best = k;}
        }
        row.push(palette[best].n);
      }
      grid.push(row);
    }
    return {grid, palette: palette.map(p=>({n:p.n, color:p.color}))};
  }

  function autoGridSize(img){
    const base = Math.round(Math.min(img.width, img.height) / 8);
    return Math.max(30, Math.min(100, base));
  }

  function labelRegions(grid){
    const n = grid.length;
    const labels = Array.from({length:n},()=>Array(n).fill(-1));
    const regions = [];
    let id = 0;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(labels[r][c] !== -1) continue;
        const val = grid[r][c];
        const queue = [{r,c}];
        labels[r][c] = id;
        const cells = [];
        let sumR = 0, sumC = 0;
        while(queue.length){
          const cur = queue.pop();
          cells.push(cur);
          sumR += cur.r;
          sumC += cur.c;
          const nbrs = [
            {r:cur.r+1,c:cur.c},
            {r:cur.r-1,c:cur.c},
            {r:cur.r,c:cur.c+1},
            {r:cur.r,c:cur.c-1}
          ];
          for(const n0 of nbrs){
            if(n0.r<0||n0.c<0||n0.r>=n||n0.c>=n) continue;
            if(labels[n0.r][n0.c] !== -1) continue;
            if(grid[n0.r][n0.c] !== val) continue;
            labels[n0.r][n0.c] = id;
            queue.push(n0);
          }
        }
        const centroid = {r: sumR / cells.length, c: sumC / cells.length};
        regions.push({id, value: val, cells, centroid});
        id++;
      }
    }
    return {labels, regions};
  }

  function buildEdgeMap(imageData, size){
    const data = imageData.data;
    const gray = new Float32Array(size * size);
    for(let i=0;i<size*size;i++){
      const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
      gray[i] = 0.2126*r + 0.7152*g + 0.0722*b;
    }
    const edges = new Uint8ClampedArray(size * size);
    const threshold = 32;
    for(let r=1;r<size-1;r++){
      for(let c=1;c<size-1;c++){
        const idx = r*size + c;
        const gx =
          -gray[idx - size - 1] + gray[idx - size + 1] +
          -2*gray[idx - 1] + 2*gray[idx + 1] +
          -gray[idx + size - 1] + gray[idx + size + 1];
        const gy =
          -gray[idx - size - 1] - 2*gray[idx - size] - gray[idx - size + 1] +
           gray[idx + size - 1] + 2*gray[idx + size] + gray[idx + size + 1];
        const mag = Math.sqrt(gx*gx + gy*gy);
        edges[idx] = mag > threshold ? 1 : 0;
      }
    }
    return edges;
  }

  function renderCartoon(canvas, grid, palette, edges, showAnswers, bg){
    const size = grid.length;
    const cell = Math.max(6, Math.min(14, Math.floor(900 / size)));
    const padding = 8;
    canvas.width = size * cell + padding*2;
    canvas.height = size * cell + padding*2;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    if(showAnswers){
      const img = document.createElement('canvas');
      img.width = size;
      img.height = size;
      const ictx = img.getContext('2d');
      const imageData = ictx.createImageData(size, size);
      for(let r=0;r<size;r++){
        for(let c=0;c<size;c++){
          const val = grid[r][c];
          const color = palette.find(p=>p.n===val).color;
          const rgb = color.match(/\d+/g).map(Number);
          const idx = (r*size + c) * 4;
          imageData.data[idx] = rgb[0];
          imageData.data[idx+1] = rgb[1];
          imageData.data[idx+2] = rgb[2];
          imageData.data[idx+3] = 255;
        }
      }
      ictx.putImageData(imageData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, padding, padding, size*cell, size*cell);
    }
    // edge overlay
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.2;
    if(edges){
      for(let r=0;r<size;r++){
        for(let c=0;c<size;c++){
          const idx = r*size + c;
          if(!edges[idx]) continue;
          const x = padding + c*cell;
          const y = padding + r*cell;
          ctx.strokeRect(x, y, cell, cell);
        }
      }
    }
    // numbers at region centroids
    const {regions} = labelRegions(grid);
    const fontSize = Math.max(8, Math.floor(cell*0.6));
    ctx.fillStyle = '#111';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    regions.forEach(reg=>{
      const x = padding + (reg.centroid.c + 0.5) * cell;
      const y = padding + (reg.centroid.r + 0.5) * cell;
      ctx.fillText(String(reg.value), x, y);
    });
  }

  function renderLegend(el, palette){
    const wrap = document.createElement('div');
    wrap.className = 'colorby-legend';
    palette.forEach(p=>{
      const item = document.createElement('div');
      item.className = 'colorby-item';
      const swatch = document.createElement('span');
      swatch.className = 'colorby-swatch';
      swatch.style.background = p.color;
      const label = document.createElement('span');
      label.textContent = `${p.n}`;
      item.appendChild(swatch);
      item.appendChild(label);
      wrap.appendChild(item);
    });
    el.innerHTML = '';
    el.appendChild(wrap);
  }

  function savePng(grid, palette, showAnswers, bg){
    const size = grid.length;
    const cell = Math.max(6, Math.min(14, Math.floor(900 / size)));
    const padding = 8;
    const legendHeight = 28 + Math.ceil(palette.length/6) * 22;
    const canvas = document.createElement('canvas');
    canvas.width = size*cell + padding*2;
    canvas.height = size*cell + padding*2 + legendHeight;
    const ctx = canvas.getContext('2d');
    if(bg && bg !== 'transparent'){
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    // draw puzzle
    const temp = document.createElement('canvas');
    renderCartoon(temp, grid, palette, window.__colorby ? window.__colorby.edges : null, showAnswers, bg);
    ctx.drawImage(temp, 0, 0);
    let lx = padding;
    let ly = padding + size*cell + 10;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111';
    ctx.fillText('Legend:', lx, ly);
    ly += 18;
    ctx.font = '12px sans-serif';
    palette.forEach((p, i)=>{
      const sw = 14;
      const row = Math.floor(i/6);
      const col = i % 6;
      const x = padding + col * 80;
      const y = ly + row * 22;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, sw, sw);
      ctx.strokeStyle = '#111';
      ctx.strokeRect(x, y, sw, sw);
      ctx.fillStyle = '#111';
      ctx.fillText(String(p.n), x + sw + 6, y + 1);
    });
    canvas.toBlob(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'color-by-number.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function init(){
    fetch('themes.json').then(r=>r.json()).then(data=>{
      AGE_PRESETS = data.agePresets || {};
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
      const file = document.getElementById('imageInput').files[0];
      if(file){
        const colorCount = 8;
        loadImageFromFile(file).then(img=>{
          const autoSize = autoGridSize(img);
          document.getElementById('size').value = autoSize;
          const imgData = drawImageToGrid(img, autoSize);
          const out = quantizeColors(imgData, colorCount);
          const edges = buildEdgeMap(imgData, autoSize);
          window.__colorby = {grid: out.grid, palette: out.palette, edges, mode:'image'};
          window.__showAnswers = false;
          document.getElementById('toggleAnswers').textContent = 'Show Answers';
          renderCartoon(document.getElementById('colorbyCanvas'), out.grid, out.palette, edges, false, document.getElementById('bgSelect').value);
          renderLegend(document.getElementById('legendWrap'), out.palette);
        }).catch(()=>{
          alert('Could not load image.');
        });
        return;
      }
      let size = parseInt(document.getElementById('size').value,10) || 10;
      size = Math.max(6, Math.min(20, size));
      document.getElementById('size').value = size;
      const palette = paletteFor(age);
      const grid = generateGrid(size, palette);
      window.__colorby = {grid, palette};
      window.__showAnswers = false;
      document.getElementById('toggleAnswers').textContent = 'Show Answers';
      renderCartoon(document.getElementById('colorbyCanvas'), grid, palette, null, false, document.getElementById('bgSelect').value);
      renderLegend(document.getElementById('legendWrap'), palette);
    });

    document.getElementById('toggleAnswers').addEventListener('click',()=>{
      const last = window.__colorby; if(!last){alert('Generate first'); return}
      window.__showAnswers = !window.__showAnswers;
      renderCartoon(document.getElementById('colorbyCanvas'), last.grid, last.palette, last.edges || null, window.__showAnswers, document.getElementById('bgSelect').value);
      document.getElementById('toggleAnswers').textContent = window.__showAnswers ? 'Hide Answers' : 'Show Answers';
    });

    document.getElementById('savePng').addEventListener('click',()=>{
      const last = window.__colorby; if(!last){alert('Generate first'); return}
      savePng(last.grid, last.palette, window.__showAnswers, document.getElementById('bgSelect').value);
    });

    document.getElementById('savePdf').addEventListener('click',()=>{
      const last = window.__colorby; if(!last){alert('Generate first'); return}
      const temp = document.createElement('canvas');
      renderCartoon(temp, last.grid, last.palette, last.edges || null, window.__showAnswers, document.getElementById('bgSelect').value);
      const dataUrl = temp.toDataURL('image/png');
      const w = window.open('');
      w.document.write('<img style="width:100%" src="'+dataUrl+'">');
      w.document.close();
      w.focus();
      w.print();
      w.close();
    });

    document.getElementById('bgSelect').addEventListener('change',()=>{
      applyBackground(document.getElementById('bgSelect').value);
      const last = window.__colorby; if(!last) return;
      renderCartoon(document.getElementById('colorbyCanvas'), last.grid, last.palette, last.edges || null, window.__showAnswers, document.getElementById('bgSelect').value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
