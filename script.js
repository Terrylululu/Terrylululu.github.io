(() => {
  const canvas = document.querySelector('#gameCanvas');
  const context = canvas.getContext('2d');
  const scoreValue = document.querySelector('#scoreValue');
  const levelValue = document.querySelector('#levelValue');
  const birdsValue = document.querySelector('#birdsValue');
  const pigsValue = document.querySelector('#pigsValue');
  const statusText = document.querySelector('#statusText');
  const powerFill = document.querySelector('#powerFill');
  const resetButton = document.querySelector('#resetButton');
  const nextButton = document.querySelector('#nextButton');
  const levelList = document.querySelector('#levelList');
  const bubbleOverlay = document.querySelector('#bubbleOverlay');
  const bubbleFrame = document.querySelector('#bubbleFrame');
  const bubbleTitle = document.querySelector('#bubbleTitle');
  const bubbleCloseButton = document.querySelector('#bubbleCloseButton');

  const worldWidth = 1280;
  const worldHeight = 720;
  const slingAnchor = { x: 215, y: 505 };
  const maxPull = 128;

  if (!window.Matter) {
    statusText.textContent = '物理引擎加载失败';
    drawLoadingError();
    return;
  }

  const { Engine, Composite, Bodies, Body, Events, Vector } = window.Matter;

  const levels = [
    {
      name: '双层堡垒',
      birds: 4,
      pigs: [
        { x: 903, y: 612, r: 23, hp: 75 },
        { x: 1032, y: 520, r: 24, hp: 82 },
        { x: 1132, y: 610, r: 23, hp: 75 },
      ],
      blocks: [
        { x: 850, y: 628, w: 28, h: 122, material: 'wood' },
        { x: 950, y: 628, w: 28, h: 122, material: 'wood' },
        { x: 900, y: 560, w: 132, h: 24, material: 'glass' },
        { x: 995, y: 626, w: 28, h: 126, material: 'stone' },
        { x: 1087, y: 626, w: 28, h: 126, material: 'stone' },
        { x: 1040, y: 555, w: 130, h: 24, material: 'wood' },
        { x: 1180, y: 620, w: 28, h: 138, material: 'wood' },
        { x: 1110, y: 486, w: 164, h: 24, material: 'glass' },
        { x: 1110, y: 456, w: 70, h: 20, material: 'stone' },
      ],
    },
    {
      name: '山坡终局',
      birds: 4,
      pigs: [
        { x: 860, y: 588, r: 24, hp: 80 },
        { x: 1012, y: 506, r: 25, hp: 90 },
        { x: 1150, y: 608, r: 24, hp: 82 },
      ],
      blocks: [
        { x: 790, y: 626, w: 30, h: 138, material: 'stone' },
        { x: 926, y: 626, w: 30, h: 138, material: 'stone' },
        { x: 858, y: 550, w: 166, h: 24, material: 'wood' },
        { x: 984, y: 610, w: 30, h: 170, material: 'glass' },
        { x: 1102, y: 610, w: 30, h: 170, material: 'glass' },
        { x: 1042, y: 518, w: 164, h: 24, material: 'stone' },
        { x: 1136, y: 624, w: 30, h: 136, material: 'wood' },
        { x: 1210, y: 624, w: 30, h: 136, material: 'wood' },
        { x: 1172, y: 550, w: 118, h: 24, material: 'wood' },
      ],
    },
  ];

  const materialOptions = {
    wood: { density: 0.003, friction: 0.72, restitution: 0.12 },
    glass: { density: 0.002, friction: 0.35, restitution: 0.08 },
    stone: { density: 0.006, friction: 0.86, restitution: 0.04 },
  };

  let engine;
  let activeBird = null;
  let currentLevel = 0;
  let birdsInReserve = 0;
  let score = 0;
  let pigs = [];
  let gameState = 'ready';
  let dragging = false;
  let launchedAt = 0;
  let settleStartedAt = 0;
  let lastTime = 0;
  let pullRatio = 0;
  let bubbleOpenedForLevel = -1;

  function createEngine() {
    engine = Engine.create();
    engine.gravity.y = 1.08;
    Events.on(engine, 'collisionStart', handleCollisions);
  }

  function makeRectangle(x, y, width, height, material = 'wood', options = {}) {
    const body = Bodies.rectangle(x, y, width, height, {
      ...materialOptions[material],
      ...options,
    });
    body.plugin = {
      kind: options.isStatic ? 'ground' : 'block',
      material,
      width,
      height,
    };
    return body;
  }

  function makePig({ x, y, r, hp }) {
    const pig = Bodies.circle(x, y, r, {
      density: 0.0045,
      friction: 0.8,
      restitution: 0.18,
    });
    pig.plugin = { kind: 'pig', radius: r, hp, maxHp: hp, hitFlash: 0 };
    return pig;
  }

  function makeBird() {
    const bird = Bodies.circle(slingAnchor.x, slingAnchor.y, 24, {
      density: 0.006,
      friction: 0.72,
      frictionAir: 0.012,
      restitution: 0.22,
    });
    bird.plugin = { kind: 'bird', radius: 24 };
    Body.setStatic(bird, true);
    return bird;
  }

  function resetLevel(index = currentLevel, keepScore = false) {
    closeBubblePanel();
    currentLevel = (index + levels.length) % levels.length;
    createEngine();
    pigs = [];
    if (!keepScore) score = 0;
    gameState = 'ready';
    dragging = false;
    pullRatio = 0;
    settleStartedAt = 0;
    bubbleOpenedForLevel = -1;
    const level = levels[currentLevel];

    const ground = makeRectangle(worldWidth / 2, 690, 1450, 76, 'wood', {
      isStatic: true,
      friction: 1,
      restitution: 0,
    });
    const leftWall = makeRectangle(-40, worldHeight / 2, 80, worldHeight, 'stone', { isStatic: true });
    Composite.add(engine.world, [ground, leftWall]);

    const blocks = level.blocks.map((block) => makeRectangle(block.x, block.y, block.w, block.h, block.material));
    pigs = level.pigs.map(makePig);
    Composite.add(engine.world, [...blocks, ...pigs]);

    birdsInReserve = level.birds;
    activeBird = null;
    launchNextBird();
    renderLevelButtons();
    updateHud();
  }

  function launchNextBird() {
    if (birdsInReserve <= 0) {
      activeBird = null;
      gameState = pigs.length === 0 ? 'won' : 'ended';
      updateHud();
      return;
    }

    birdsInReserve -= 1;
    activeBird = makeBird();
    Composite.add(engine.world, activeBird);
    gameState = 'ready';
    launchedAt = 0;
    settleStartedAt = 0;
    pullRatio = 0;
    updateHud();
  }

  function handleCollisions(event) {
    event.pairs.forEach((pair) => {
      const impact = Vector.magnitude(Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity));
      if (impact < 2.2) return;

      [pair.bodyA, pair.bodyB].forEach((body) => {
        if (body.plugin?.kind === 'pig') {
          damagePig(body, impact * 22);
        }

        if (body.plugin?.kind === 'block' && impact > 4.8) {
          score += Math.round(impact * 2);
        }
      });
    });
  }

  function damagePig(pig, amount) {
    if (!pigs.includes(pig)) return;

    pig.plugin.hp -= amount;
    pig.plugin.hitFlash = 12;

    if (pig.plugin.hp <= 0) {
      score += 1000 + Math.max(0, birdsInReserve) * 120;
      Composite.remove(engine.world, pig);
      pigs = pigs.filter((target) => target !== pig);
      if (pigs.length === 0) {
        gameState = 'won';
        statusText.textContent = currentLevel === levels.length - 1 ? '全部通关' : '关卡完成';
        openBubblePanel();
      }
    }

    updateHud();
  }

  function getPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * worldWidth,
      y: ((event.clientY - rect.top) / rect.height) * worldHeight,
    };
  }

  function clampToSling(point) {
    const dx = point.x - slingAnchor.x;
    const dy = point.y - slingAnchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= maxPull) return point;

    const ratio = maxPull / distance;
    return {
      x: slingAnchor.x + dx * ratio,
      y: slingAnchor.y + dy * ratio,
    };
  }

  function startDrag(event) {
    if (!activeBird || gameState !== 'ready') return;

    const point = getPointerPosition(event);
    const distance = Math.hypot(point.x - activeBird.position.x, point.y - activeBird.position.y);
    if (distance > 72) return;

    dragging = true;
    gameState = 'dragging';
    canvas.setPointerCapture(event.pointerId);
    updateDrag(event);
  }

  function updateDrag(event) {
    if (!dragging || !activeBird) return;

    const point = clampToSling(getPointerPosition(event));
    Body.setPosition(activeBird, point);
    Body.setVelocity(activeBird, { x: 0, y: 0 });
    Body.setAngularVelocity(activeBird, 0);

    pullRatio = Math.min(1, Math.hypot(point.x - slingAnchor.x, point.y - slingAnchor.y) / maxPull);
    updateHud();
  }

  function releaseDrag(event) {
    if (!dragging || !activeBird) return;

    dragging = false;
    canvas.releasePointerCapture(event.pointerId);

    if (pullRatio < 0.08) {
      Body.setPosition(activeBird, slingAnchor);
      gameState = 'ready';
      pullRatio = 0;
      updateHud();
      return;
    }

    const velocity = {
      x: (slingAnchor.x - activeBird.position.x) * 0.19,
      y: (slingAnchor.y - activeBird.position.y) * 0.19,
    };
    Body.setStatic(activeBird, false);
    Body.setVelocity(activeBird, velocity);
    Body.setAngularVelocity(activeBird, velocity.x * 0.018);
    gameState = 'launched';
    launchedAt = performance.now();
    settleStartedAt = 0;
    pullRatio = 0;
    updateHud();
  }

  function updateHud() {
    const availableBirds = birdsInReserve + (activeBird ? 1 : 0);
    scoreValue.textContent = score.toLocaleString('zh-CN');
    levelValue.textContent = `${currentLevel + 1}/${levels.length}`;
    birdsValue.textContent = availableBirds;
    pigsValue.textContent = pigs.length;
    powerFill.style.width = `${Math.round(pullRatio * 100)}%`;

    if (gameState === 'ready') statusText.textContent = '准备发射';
    if (gameState === 'dragging') statusText.textContent = '蓄力中';
    if (gameState === 'launched') statusText.textContent = '飞行中';
    if (gameState === 'ended') statusText.textContent = '本关未完成';
    if (gameState === 'won') statusText.textContent = currentLevel === levels.length - 1 ? '全部通关' : '关卡完成';
  }

  function renderLevelButtons() {
    levelList.innerHTML = '';
    levels.forEach((level, index) => {
      const button = document.createElement('button');
      button.className = 'level-chip';
      button.type = 'button';
      button.setAttribute('aria-current', String(index === currentLevel));
      button.innerHTML = `<span>${index + 1}. ${level.name}</span><small>${level.birds} 只</small>`;
      button.addEventListener('click', () => resetLevel(index));
      levelList.append(button);
    });
  }

  function openBubblePanel() {
    if (!bubbleOverlay || !bubbleFrame || bubbleOpenedForLevel === currentLevel) return;

    const levelIndex = currentLevel;
    bubbleOpenedForLevel = currentLevel;

    if (bubbleTitle) {
      bubbleTitle.textContent = currentLevel === levels.length - 1 ? '全部通关气泡特效' : '过关气泡特效';
    }

    window.setTimeout(() => {
      if (bubbleOpenedForLevel !== levelIndex) return;

      bubbleFrame.src = `bubble-demo/index.html?level=${currentLevel + 1}`;
      bubbleOverlay.classList.add('is-open');
      bubbleOverlay.setAttribute('aria-hidden', 'false');
      bubbleCloseButton?.focus();
    }, 650);
  }

  function closeBubblePanel() {
    if (!bubbleOverlay) return;

    bubbleOverlay.classList.remove('is-open');
    bubbleOverlay.setAttribute('aria-hidden', 'true');
  }

  function updateGame(time) {
    const delta = Math.min(1000 / 30, time - lastTime || 1000 / 60);
    lastTime = time;
    Engine.update(engine, delta);

    pigs.forEach((pig) => {
      if (pig.plugin.hitFlash > 0) pig.plugin.hitFlash -= 1;
      if (pig.position.y > worldHeight + 120) damagePig(pig, 999);
    });

    if (activeBird && gameState === 'launched') {
      const outOfBounds = activeBird.position.x > worldWidth + 180 || activeBird.position.y > worldHeight + 160 || activeBird.position.x < -120;
      const slowEnough = performance.now() - launchedAt > 1200 && activeBird.speed < 0.28;

      if (outOfBounds || slowEnough) {
        if (!settleStartedAt) settleStartedAt = performance.now();
        if (performance.now() - settleStartedAt > 520) {
          Composite.remove(engine.world, activeBird);
          activeBird = null;
          if (pigs.length > 0) launchNextBird();
          updateHud();
        }
      } else {
        settleStartedAt = 0;
      }
    }

    drawScene();
    requestAnimationFrame(updateGame);
  }

  function drawScene() {
    context.clearRect(0, 0, worldWidth, worldHeight);
    drawBackdrop();
    drawSling(false);

    Composite.allBodies(engine.world).forEach((body) => {
      if (body.plugin?.kind === 'ground') return;
      if (body.plugin?.kind === 'bird') drawBird(body);
      if (body.plugin?.kind === 'pig') drawPig(body);
      if (body.plugin?.kind === 'block') drawBlock(body);
    });

    drawSling(true);
    if (dragging && activeBird) drawAimLine();
    drawGroundDetails();
  }

  function drawBackdrop() {
    const gradient = context.createLinearGradient(0, 0, 0, worldHeight);
    gradient.addColorStop(0, '#7bd5ff');
    gradient.addColorStop(0.56, '#edfbff');
    gradient.addColorStop(0.58, '#8bdd62');
    gradient.addColorStop(1, '#35a94a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, worldWidth, worldHeight);

    drawCloud(140, 118, 1.08);
    drawCloud(430, 86, 0.82);
    drawCloud(1120, 132, 1);

    context.fillStyle = '#72c253';
    context.beginPath();
    context.moveTo(0, 575);
    context.quadraticCurveTo(210, 510, 420, 590);
    context.quadraticCurveTo(620, 650, 820, 574);
    context.quadraticCurveTo(1040, 500, 1280, 585);
    context.lineTo(1280, 720);
    context.lineTo(0, 720);
    context.closePath();
    context.fill();
  }

  function drawCloud(x, y, scale) {
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.fillStyle = 'rgba(255, 255, 255, 0.82)';
    context.beginPath();
    context.arc(0, 18, 28, 0, Math.PI * 2);
    context.arc(34, 4, 36, 0, Math.PI * 2);
    context.arc(75, 18, 30, 0, Math.PI * 2);
    context.arc(38, 26, 48, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawSling(front) {
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = front ? '#5f3218' : '#7a421f';
    context.lineWidth = front ? 18 : 22;

    if (!front) {
      context.beginPath();
      context.moveTo(180, 675);
      context.lineTo(210, 480);
      context.lineTo(248, 675);
      context.stroke();
    }

    if (activeBird && (gameState === 'ready' || gameState === 'dragging')) {
      context.strokeStyle = '#3d2421';
      context.lineWidth = front ? 7 : 9;
      context.beginPath();
      context.moveTo(front ? 232 : 198, 488);
      context.lineTo(activeBird.position.x, activeBird.position.y);
      context.stroke();
    }

    context.restore();
  }

  function drawGroundDetails() {
    context.save();
    context.fillStyle = '#2c8d3c';
    for (let x = 22; x < worldWidth; x += 44) {
      context.beginPath();
      context.moveTo(x, 688);
      context.lineTo(x + 7, 666);
      context.lineTo(x + 14, 688);
      context.fill();
    }
    context.fillStyle = '#7f512f';
    context.fillRect(0, 688, worldWidth, 32);
    context.fillStyle = 'rgba(75, 39, 19, 0.22)';
    for (let x = 0; x < worldWidth; x += 60) {
      context.fillRect(x, 704, 32, 4);
    }
    context.restore();
  }

  function drawBlock(body) {
    const { width, height, material } = body.plugin;
    const colors = {
      wood: ['#bd7239', '#7b421f'],
      glass: ['#8eddf2', '#2e9db9'],
      stone: ['#9aa6b2', '#56616f'],
    };
    const [fill, stroke] = colors[material];

    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(-width / 2, -height / 2, width, height, 6);
    context.fill();
    context.stroke();

    if (material === 'wood') {
      context.strokeStyle = 'rgba(255, 235, 190, 0.34)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-width / 2 + 8, -height / 2 + 10);
      context.lineTo(width / 2 - 8, height / 2 - 12);
      context.stroke();
    }

    if (material === 'glass') {
      context.fillStyle = 'rgba(255, 255, 255, 0.28)';
      context.fillRect(-width / 2 + 6, -height / 2 + 6, Math.max(6, width * 0.18), Math.max(8, height - 12));
    }

    context.restore();
  }

  function drawBird(body) {
    const radius = body.plugin.radius;
    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);

    context.fillStyle = '#bb1d1d';
    context.beginPath();
    context.moveTo(-radius - 18, -2);
    context.lineTo(-radius - 36, -14);
    context.lineTo(-radius - 24, 4);
    context.lineTo(-radius - 38, 17);
    context.closePath();
    context.fill();

    context.fillStyle = '#ec2c2c';
    context.strokeStyle = '#8d1717';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = '#f7d7bb';
    context.beginPath();
    context.arc(-2, 12, radius * 0.58, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#ffd44d';
    context.strokeStyle = '#b66b00';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(radius - 4, -3);
    context.lineTo(radius + 23, 7);
    context.lineTo(radius - 2, 17);
    context.closePath();
    context.fill();
    context.stroke();

    drawEye(-5, -8, -3);
    drawEye(12, -8, 3);
    context.strokeStyle = '#2a1515';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(-15, -20);
    context.lineTo(1, -13);
    context.moveTo(6, -13);
    context.lineTo(23, -20);
    context.stroke();
    context.restore();
  }

  function drawPig(body) {
    const radius = body.plugin.radius;
    const health = Math.max(0, body.plugin.hp / body.plugin.maxHp);
    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);

    context.fillStyle = body.plugin.hitFlash > 0 ? '#b6ff6f' : '#74c94c';
    context.strokeStyle = '#357b2d';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(-radius * 0.48, -radius * 0.8, radius * 0.28, 0, Math.PI * 2);
    context.arc(radius * 0.48, -radius * 0.8, radius * 0.28, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    drawEye(-8, -9, -1);
    drawEye(11, -9, 1);

    context.fillStyle = '#a9e881';
    context.strokeStyle = '#357b2d';
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(2, 7, radius * 0.45, radius * 0.3, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = '#357b2d';
    context.beginPath();
    context.arc(-5, 7, 3, 0, Math.PI * 2);
    context.arc(9, 7, 3, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = 'rgba(53, 123, 45, 0.55)';
    context.fillRect(-radius, radius + 8, radius * 2 * health, 5);
    context.restore();
  }

  function drawEye(x, y, offset) {
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#111827';
    context.beginPath();
    context.arc(x + offset, y + 1, 3, 0, Math.PI * 2);
    context.fill();
  }

  function drawAimLine() {
    const velocity = {
      x: (slingAnchor.x - activeBird.position.x) * 0.19,
      y: (slingAnchor.y - activeBird.position.y) * 0.19,
    };
    let x = activeBird.position.x;
    let y = activeBird.position.y;
    let vx = velocity.x;
    let vy = velocity.y;

    context.save();
    context.fillStyle = 'rgba(31, 41, 55, 0.35)';
    for (let i = 0; i < 18; i += 1) {
      x += vx * 3.2;
      y += vy * 3.2;
      vy += engine.gravity.y * 1.8;
      if (y > 686) break;
      context.beginPath();
      context.arc(x, y, Math.max(2, 6 - i * 0.18), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawLoadingError() {
    context.fillStyle = '#7bd5ff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#1f2937';
    context.font = '700 28px system-ui';
    context.fillText('Matter.js 没有加载成功，请联网后刷新页面。', 80, 120);
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = worldWidth * ratio;
    canvas.height = worldHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  canvas.addEventListener('pointerdown', startDrag);
  canvas.addEventListener('pointermove', updateDrag);
  canvas.addEventListener('pointerup', releaseDrag);
  canvas.addEventListener('pointercancel', releaseDrag);
  resetButton.addEventListener('click', () => resetLevel(currentLevel));
  nextButton.addEventListener('click', () => resetLevel(currentLevel + 1, true));
  bubbleCloseButton?.addEventListener('click', closeBubblePanel);
  bubbleOverlay?.addEventListener('click', (event) => {
    if (event.target === bubbleOverlay) closeBubblePanel();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeBubblePanel();
  });
  window.addEventListener('resize', resizeCanvas);

  resizeCanvas();
  resetLevel(0);
  requestAnimationFrame(updateGame);
})();