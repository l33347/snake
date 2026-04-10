const GRID_W = 20;
const GRID_H = 20;
const INITIAL_LEN = 3;
const INITIAL_DIR = 'right';
const TICK_MS = 180;
const SCORE_PER_FOOD = 10;

const BEST_KEY = 'snake_best_score';

function isOpposite(a, b) {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  );
}

Page({
  data: {
    score: 0,
    best: 0,
    status: 'start',
  },

  // Runtime state
  snake: [],
  food: { x: 0, y: 0 },
  dir: INITIAL_DIR,
  nextDir: INITIAL_DIR,
  timer: null,

  // Canvas
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  cellW: 0,
  cellH: 0,

  onLoad() {
    this.setData({ best: this.loadBest(), score: 0, status: 'start' });
    this.initCanvas();
  },

  onUnload() {
    this.stopLoop();
  },

  loadBest() {
    const v = wx.getStorageSync(BEST_KEY);
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
  },

  saveBest(v) {
    wx.setStorageSync(BEST_KEY, String(v));
  },

  setStatus(s) {
    this.setData({ status: s });
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query
      .select('#board')
      .fields({ node: true, size: true })
      .exec((res) => {
        const { node, width, height } = res[0];
        const dpr = wx.getWindowInfo().pixelRatio || 1;

        this.canvas = node;
        this.ctx = node.getContext('2d');

        // 使用逻辑像素绘制：先把画布像素按 dpr 放大，再 scale 回来
        node.width = width * dpr;
        node.height = height * dpr;
        this.ctx.scale(dpr, dpr);

        this.width = width;
        this.height = height;
        this.cellW = width / GRID_W;
        this.cellH = height / GRID_H;

        this.render();
      });
  },

  onStart() {
    this.resetGame();
    this.startLoop();
  },

  onPause() {
    if (this.data.status === 'playing') {
      this.setStatus('paused');
      this.stopLoop();
      this.render();
      return;
    }
    if (this.data.status === 'paused') {
      this.setStatus('playing');
      this.startLoop();
      return;
    }
  },

  onDir(e) {
    const d = e.currentTarget.dataset.dir;
    if (this.data.status !== 'playing' && this.data.status !== 'paused') return;
    if (isOpposite(d, this.dir)) return;
    this.nextDir = d;
  },

  resetGame() {
    this.setData({ score: 0 });

    this.dir = INITIAL_DIR;
    this.nextDir = INITIAL_DIR;

    const startY = Math.floor(GRID_H / 2);
    this.snake = [];
    for (let i = 0; i < INITIAL_LEN; i++) {
      this.snake.push({ x: 3 - i, y: startY });
    }

    this.spawnFood();
    this.setStatus('playing');
    this.render();
  },

  startLoop() {
    this.stopLoop();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  },

  stopLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  tick() {
    if (this.data.status !== 'playing') return;

    this.dir = this.nextDir;
    const head = this.snake[0];
    const next = { x: head.x, y: head.y };

    if (this.dir === 'up') next.y -= 1;
    if (this.dir === 'down') next.y += 1;
    if (this.dir === 'left') next.x -= 1;
    if (this.dir === 'right') next.x += 1;

    // Wall collision
    if (next.x < 0 || next.x >= GRID_W || next.y < 0 || next.y >= GRID_H) {
      this.gameOver();
      return;
    }

    // Self collision
    if (this.snake.some((p) => p.x === next.x && p.y === next.y)) {
      this.gameOver();
      return;
    }

    // Move
    this.snake.unshift(next);

    // Eat
    const ate = next.x === this.food.x && next.y === this.food.y;
    if (ate) {
      const score = this.data.score + SCORE_PER_FOOD;
      this.setData({ score });

      if (score > this.data.best) {
        this.setData({ best: score });
        this.saveBest(score);
      }

      this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.render();
  },

  gameOver() {
    this.setStatus('over');
    this.stopLoop();
    this.render();
  },

  spawnFood() {
    const occupied = new Set(this.snake.map((p) => `${p.x},${p.y}`));

    for (let i = 0; i < 5000; i++) {
      const x = Math.floor(Math.random() * GRID_W);
      const y = Math.floor(Math.random() * GRID_H);
      if (!occupied.has(`${x},${y}`)) {
        this.food = { x, y };
        return;
      }
    }

    this.gameOver();
  },

  render() {
    const ctx = this.ctx;
    if (!ctx) return;

    // 背景
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#070a14';
    ctx.fillRect(0, 0, this.width, this.height);

    // 网格
    ctx.strokeStyle = 'rgba(79, 140, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellW, 0);
      ctx.lineTo(x * this.cellW, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellH);
      ctx.lineTo(this.width, y * this.cellH);
      ctx.stroke();
    }

    // 食物
    this.drawCell(this.food.x, this.food.y, '#4f8cff');

    // 蛇
    this.snake.forEach((p, i) => {
      this.drawCell(p.x, p.y, i === 0 ? '#e6e8ef' : 'rgba(230,232,239,0.75)');
    });

    // 覆盖层
    if (this.data.status !== 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#e6e8ef';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let title = '';
      let subtitle = '';
      if (this.data.status === 'start') {
        title = 'snake for 老霍';
        subtitle = '点击“开始 / 重开”开始';
      } else if (this.data.status === 'paused') {
        title = 'Paused';
        subtitle = '点击“暂停 / 继续”继续';
      } else if (this.data.status === 'over') {
        title = 'Game Over';
        subtitle = '点击“开始 / 重开”再来一局';
      }

      ctx.fillText(title, this.width / 2, this.height / 2 - 14);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(230,232,239,0.85)';
      ctx.fillText(subtitle, this.width / 2, this.height / 2 + 14);
    }
  },

  drawCell(x, y, color) {
    const ctx = this.ctx;
    const pad = Math.min(this.cellW, this.cellH) * 0.08;
    const rx = x * this.cellW + pad;
    const ry = y * this.cellH + pad;
    const rw = this.cellW - pad * 2;
    const rh = this.cellH - pad * 2;

    ctx.fillStyle = color;
    this.roundRect(ctx, rx, ry, rw, rh, 6);
    ctx.fill();
  },

  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  },
});
