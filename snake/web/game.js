(() => {
  // ----- Config (MVP) -----
  const GRID_W = 20;
  const GRID_H = 20;
  const INITIAL_LEN = 3;
  const INITIAL_DIR = 'right';
  const TICK_MS = 180; // ~5.5 cells/sec
  const SCORE_PER_FOOD = 10;

  const BEST_KEY = 'snake_best_score';

  // ----- DOM -----
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusEl = document.getElementById('status');

  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');

  // Direction buttons
  document.querySelectorAll('button.dir').forEach((btn) => {
    btn.addEventListener('click', () => {
      setDirection(btn.dataset.dir);
    });
  });

  // ----- State -----
  /** @type {'start'|'playing'|'paused'|'over'} */
  let state = 'start';

  /** @type {{x:number,y:number}[]} head at 0 */
  let snake = [];

  /** @type {{x:number,y:number}} */
  let food = { x: 0, y: 0 };

  /** @type {'up'|'down'|'left'|'right'} */
  let dir = INITIAL_DIR;
  /** queued dir to apply at next tick */
  let nextDir = INITIAL_DIR;

  let score = 0;
  let best = loadBest();

  /** @type {number | null} */
  let timer = null;

  function loadBest() {
    const n = Number(localStorage.getItem(BEST_KEY) || '0');
    return Number.isFinite(n) ? n : 0;
  }

  function saveBest(v) {
    localStorage.setItem(BEST_KEY, String(v));
  }

  function setState(s) {
    state = s;
    statusEl.textContent = s;
  }

  function resetGame() {
    score = 0;
    scoreEl.textContent = String(score);

    dir = INITIAL_DIR;
    nextDir = INITIAL_DIR;

    // Start snake near left-middle
    const startY = Math.floor(GRID_H / 2);
    snake = [];
    for (let i = 0; i < INITIAL_LEN; i++) {
      snake.push({ x: 3 - i, y: startY });
    }

    spawnFood();
    setState('playing');
    render();
  }

  function startLoop() {
    stopLoop();
    timer = window.setInterval(tick, TICK_MS);
  }

  function stopLoop() {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function togglePause() {
    if (state === 'playing') {
      setState('paused');
      stopLoop();
      render();
      return;
    }
    if (state === 'paused') {
      setState('playing');
      startLoop();
      return;
    }
  }

  function isOpposite(a, b) {
    return (
      (a === 'up' && b === 'down') ||
      (a === 'down' && b === 'up') ||
      (a === 'left' && b === 'right') ||
      (a === 'right' && b === 'left')
    );
  }

  function setDirection(d) {
    if (state !== 'playing' && state !== 'paused') return;
    if (isOpposite(d, dir)) return;
    nextDir = d;
  }

  function tick() {
    if (state !== 'playing') return;

    dir = nextDir;

    const head = snake[0];
    const next = { x: head.x, y: head.y };

    if (dir === 'up') next.y -= 1;
    if (dir === 'down') next.y += 1;
    if (dir === 'left') next.x -= 1;
    if (dir === 'right') next.x += 1;

    // Wall collision
    if (next.x < 0 || next.x >= GRID_W || next.y < 0 || next.y >= GRID_H) {
      gameOver();
      return;
    }

    // Self collision
    if (snake.some((p) => p.x === next.x && p.y === next.y)) {
      gameOver();
      return;
    }

    // Move: add head
    snake.unshift(next);

    // Eat
    const ate = next.x === food.x && next.y === food.y;
    if (ate) {
      score += SCORE_PER_FOOD;
      scoreEl.textContent = String(score);

      if (score > best) {
        best = score;
        bestEl.textContent = String(best);
        saveBest(best);
      }

      spawnFood();
      // Do not pop tail => grow
    } else {
      // Normal move => pop tail
      snake.pop();
    }

    render();
  }

  function gameOver() {
    setState('over');
    stopLoop();
    render();
  }

  function spawnFood() {
    const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));

    // safety: avoid infinite loop
    for (let i = 0; i < 5000; i++) {
      const x = Math.floor(Math.random() * GRID_W);
      const y = Math.floor(Math.random() * GRID_H);
      if (!occupied.has(`${x},${y}`)) {
        food = { x, y };
        return;
      }
    }

    // If no place, end game
    gameOver();
  }

  function render() {
    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / GRID_W;
    const cellH = h / GRID_H;

    // background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070a14';
    ctx.fillRect(0, 0, w, h);

    // grid (subtle)
    ctx.strokeStyle = 'rgba(79, 140, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, h);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(w, y * cellH);
      ctx.stroke();
    }

    // food
    drawCell(food.x, food.y, '#4f8cff');

    // snake
    snake.forEach((p, i) => {
      drawCell(p.x, p.y, i === 0 ? '#e6e8ef' : 'rgba(230,232,239,0.75)');
    });

    // overlay for start/paused/over
    if (state !== 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#e6e8ef';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let title = '';
      let subtitle = '';
      if (state === 'start') {
        title = 'Snake MVP';
        subtitle = '点击“开始/重开”或按 Enter';
      } else if (state === 'paused') {
        title = 'Paused';
        subtitle = '点击“暂停/继续”或按 空格';
      } else if (state === 'over') {
        title = 'Game Over';
        subtitle = '点击“开始/重开”再来一局';
      }

      ctx.fillText(title, w / 2, h / 2 - 16);
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(230,232,239,0.85)';
      ctx.fillText(subtitle, w / 2, h / 2 + 18);
    }

    function drawCell(x, y, color) {
      const pad = Math.min(cellW, cellH) * 0.08;
      const rx = x * cellW + pad;
      const ry = y * cellH + pad;
      const rw = cellW - pad * 2;
      const rh = cellH - pad * 2;

      ctx.fillStyle = color;
      roundRect(ctx, rx, ry, rw, rh, 6);
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // ----- Input -----
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setDirection('up');
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDirection('down');
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setDirection('left');
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setDirection('right');

    if (e.key === ' ') {
      e.preventDefault();
      togglePause();
    }

    if (e.key === 'Enter') {
      if (state === 'start' || state === 'over') {
        resetGame();
        startLoop();
      }
    }
  });

  btnStart.addEventListener('click', () => {
    resetGame();
    startLoop();
  });

  btnPause.addEventListener('click', () => {
    togglePause();
  });

  // ----- Init -----
  bestEl.textContent = String(best);
  scoreEl.textContent = '0';
  setState('start');
  render();
})();
