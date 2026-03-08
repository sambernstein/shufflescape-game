(function () {
  var CELL = 26;
  var GAP = 2;
  var INNER = CELL - GAP;
  var RADIUS = 3;
  var SQUARE_COVERAGE = 0.20;
  var WALKABLE_RATIO = 0.40;

  var BORDER_COLORS = [
    [0, 229, 255],
    [0, 230, 118],
    [255, 145, 0],
    [255, 45, 120],
    [255, 214, 0]
  ];

  var WALKABLE_FILL = 'rgba(180, 180, 220, 0.045)';
  var BLOCKED_FILL = 'rgba(60, 60, 80, 0.025)';
  var BORDER_ALPHA = 0.07;

  var canvas, ctx, dpr;
  var grid, squares;
  var cols, rows;

  function init() {
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    dpr = window.devicePixelRatio || 1;

    resize();
    generate();
    draw();

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
    grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = -1;
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

      if (!regionClear(sr, sc, size)) continue;

      var borderCol = BORDER_COLORS[Math.floor(Math.random() * BORDER_COLORS.length)];
      var cells = [];
      for (var dr = 0; dr < size; dr++) {
        for (var dc = 0; dc < size; dc++) {
          var walkable = Math.random() < WALKABLE_RATIO;
          cells.push({ dr: dr, dc: dc, walkable: walkable });
          grid[sr + dr][sc + dc] = squares.length;
        }
      }

      squares.push({
        r: sr, c: sc, size: size,
        border: borderCol,
        cells: cells
      });
      covered += size * size;
    }
  }

  function regionClear(sr, sc, size) {
    for (var dr = -1; dr <= size; dr++) {
      for (var dc = -1; dc <= size; dc++) {
        var r = sr + dr;
        var c = sc + dc;
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        if (grid[r][c] !== -1) return false;
      }
    }
    return true;
  }

  function rotateSquare(idx) {
    var sq = squares[idx];
    var size = sq.size;

    for (var i = 0; i < sq.cells.length; i++) {
      grid[sq.r + sq.cells[i].dr][sq.c + sq.cells[i].dc] = -1;
    }

    var newCells = [];
    for (var i = 0; i < sq.cells.length; i++) {
      var cell = sq.cells[i];
      newCells.push({
        dr: cell.dc,
        dc: size - 1 - cell.dr,
        walkable: cell.walkable
      });
    }
    sq.cells = newCells;

    for (var i = 0; i < sq.cells.length; i++) {
      grid[sq.r + sq.cells[i].dr][sq.c + sq.cells[i].dc] = idx;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    for (var i = 0; i < squares.length; i++) {
      var sq = squares[i];

      for (var j = 0; j < sq.cells.length; j++) {
        var cell = sq.cells[j];
        var x = (sq.c + cell.dc) * CELL + GAP / 2;
        var y = (sq.r + cell.dr) * CELL + GAP / 2;
        ctx.fillStyle = cell.walkable ? WALKABLE_FILL : BLOCKED_FILL;
        roundRect(ctx, x, y, INNER, INNER, RADIUS);
        ctx.fill();
      }

      var bx = sq.c * CELL;
      var by = sq.r * CELL;
      var bw = sq.size * CELL;
      var rgb = sq.border;
      ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + BORDER_ALPHA + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      roundRect(ctx, bx + 0.5, by + 0.5, bw - 1, bw - 1, 4);
      ctx.stroke();
      ctx.setLineDash([]);
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
    return grid[row][col];
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
    if (isInteractive(e.target)) return;
    var idx = hitTest(e.clientX, e.clientY);
    if (idx >= 0) {
      e.preventDefault();
      rotateSquare(idx);
      draw();
    }
  }

  function handleClick(e) {
    if (isInteractive(e.target)) return;
    var idx = hitTest(e.clientX, e.clientY);
    if (idx >= 0) {
      rotateSquare(idx);
      draw();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
