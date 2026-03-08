(function () {
  var CELL = 26;
  var GAP = 2;
  var INNER = CELL - GAP;
  var RADIUS = 3;
  var SQUARE_COVERAGE = 0.45;
  var WALKABLE_RATIO = 0.40;

  var BORDER_COLORS = [
    [0, 229, 255],
    [0, 230, 118],
    [255, 145, 0],
    [255, 45, 120],
    [255, 214, 0]
  ];

  var WALKABLE_FILL = 'rgba(180, 180, 220, 0.12)';
  var BLOCKED_FILL = 'rgba(60, 60, 80, 0.08)';
  var BORDER_ALPHA = 0.18;

  var canvas, ctx, dpr;
  var tileStates, squares;
  var cols, rows;
  var animating = false;
  var animSquare = null;
  var animProgress = 0;
  var ANIM_DURATION = 250;

  function init() {
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    dpr = window.devicePixelRatio || 1;

    resize();
    generate();
    draw();
    
    setTimeout(function() {
      canvas.classList.add('loaded');
    }, 100);

    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resize();
        generate();
        draw();
      }, 150);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize);
    }

    if ('onpointerup' in window) {
      document.addEventListener('pointerup', handlePointerUp, { passive: false });
    } else {
      document.addEventListener('click', handleClick);
    }
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / CELL);
    rows = Math.ceil(h / CELL);
  }

  function generate() {
    tileStates = [];
    for (var r = 0; r < rows; r++) {
      tileStates[r] = [];
      for (var c = 0; c < cols; c++) {
        tileStates[r][c] = null;
      }
    }
    squares = [];

    var total = rows * cols;
    var target = Math.floor(total * SQUARE_COVERAGE);
    var covered = 0;
    var attempts = 0;
    var maxAttempts = total * 4;

    while (covered < target && attempts < maxAttempts) {
      attempts++;
      var size = Math.random() < 0.5 ? 2 : 3;
      var sc = Math.floor(Math.random() * (cols - size));
      var sr = Math.floor(Math.random() * (rows - size));

      if (!regionInBounds(sr, sc, size)) continue;

      var borderCol = BORDER_COLORS[Math.floor(Math.random() * BORDER_COLORS.length)];
      var cells = [];
      for (var dr = 0; dr < size; dr++) {
        for (var dc = 0; dc < size; dc++) {
          var r = sr + dr;
          var c = sc + dc;
          var walkable = tileStates[r][c] !== null ? tileStates[r][c] : Math.random() < WALKABLE_RATIO;
          cells.push({ dr: dr, dc: dc });
          tileStates[r][c] = walkable;
        }
      }

      squares.push({
        r: sr, c: sc, size: size,
        border: borderCol
      });
      covered += size * size;
    }
  }

  function regionInBounds(sr, sc, size) {
    return sr >= 0 && sr + size <= rows && sc >= 0 && sc + size <= cols;
  }

  function rotateSquare(idx) {
    if (animating) return;
    
    animating = true;
    animSquare = idx;
    animProgress = 0;
    
    var startTime = Date.now();
    
    function animate() {
      var elapsed = Date.now() - startTime;
      animProgress = Math.min(elapsed / ANIM_DURATION, 1);
      
      if (animProgress < 1) {
        draw();
        requestAnimationFrame(animate);
      } else {
        applyRotation(idx);
        animating = false;
        animSquare = null;
        animProgress = 0;
        draw();
      }
    }
    
    requestAnimationFrame(animate);
  }
  
  function applyRotation(idx) {
    var sq = squares[idx];
    var size = sq.size;
    var tempStates = [];
    
    for (var dr = 0; dr < size; dr++) {
      for (var dc = 0; dc < size; dc++) {
        tempStates.push(tileStates[sq.r + dr][sq.c + dc]);
      }
    }

    for (var dr = 0; dr < size; dr++) {
      for (var dc = 0; dc < size; dc++) {
        var srcIdx = dr * size + dc;
        var newDr = dc;
        var newDc = size - 1 - dr;
        tileStates[sq.r + newDr][sq.c + newDc] = tempStates[srcIdx];
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var state = tileStates[r][c];
        if (state !== null) {
          var x = c * CELL + GAP / 2;
          var y = r * CELL + GAP / 2;
          
          if (animating && animSquare !== null) {
            var sq = squares[animSquare];
            if (r >= sq.r && r < sq.r + sq.size && c >= sq.c && c < sq.c + sq.size) {
              ctx.save();
              var centerX = (sq.c + sq.size / 2) * CELL;
              var centerY = (sq.r + sq.size / 2) * CELL;
              ctx.translate(centerX, centerY);
              ctx.rotate(animProgress * Math.PI / 2);
              ctx.translate(-centerX, -centerY);
            }
          }
          
          ctx.fillStyle = state ? WALKABLE_FILL : BLOCKED_FILL;
          roundRect(ctx, x, y, INNER, INNER, RADIUS);
          ctx.fill();
          
          if (animating && animSquare !== null) {
            var sq = squares[animSquare];
            if (r >= sq.r && r < sq.r + sq.size && c >= sq.c && c < sq.c + sq.size) {
              ctx.restore();
            }
          }
        }
      }
    }

    for (var i = 0; i < squares.length; i++) {
      var sq = squares[i];
      var bx = sq.c * CELL;
      var by = sq.r * CELL;
      var bw = sq.size * CELL;
      var rgb = sq.border;
      
      if (animating && i === animSquare) {
        ctx.save();
        var centerX = (sq.c + sq.size / 2) * CELL;
        var centerY = (sq.r + sq.size / 2) * CELL;
        ctx.translate(centerX, centerY);
        ctx.rotate(animProgress * Math.PI / 2);
        ctx.translate(-centerX, -centerY);
      }
      
      ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + BORDER_ALPHA + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      roundRect(ctx, bx + 0.5, by + 0.5, bw - 1, bw - 1, 4);
      ctx.stroke();
      ctx.setLineDash([]);
      
      if (animating && i === animSquare) {
        ctx.restore();
      }
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function hitTest(clientX, clientY) {
    var col = Math.floor(clientX / CELL);
    var row = Math.floor(clientY / CELL);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return -1;
    
    for (var i = squares.length - 1; i >= 0; i--) {
      var sq = squares[i];
      if (row >= sq.r && row < sq.r + sq.size && 
          col >= sq.c && col < sq.c + sq.size) {
        return i;
      }
    }
    return -1;
  }

  function isInteractive(el) {
    while (el && el !== document.body) {
      var tag = el.tagName;
      if (tag === 'A' || tag === 'BUTTON' || tag === 'VIDEO' ||
          tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.getAttribute && el.getAttribute('role') === 'button') return true;
      el = el.parentElement;
    }
    return false;
  }

  function handlePointerUp(e) {
    if (isInteractive(e.target) || animating) return;
    var idx = hitTest(e.clientX, e.clientY);
    if (idx >= 0) {
      e.preventDefault();
      rotateSquare(idx);
    }
  }

  function handleClick(e) {
    if (isInteractive(e.target) || animating) return;
    var idx = hitTest(e.clientX, e.clientY);
    if (idx >= 0) {
      rotateSquare(idx);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
