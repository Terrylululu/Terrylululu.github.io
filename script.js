const canvas = document.querySelector('#signalCanvas');
const context = canvas.getContext('2d');
const tiltTarget = document.querySelector('[data-tilt]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const pointer = { x: 0, y: 0, active: false };
let width = 0;
let height = 0;
let particles = [];
let animationFrame = 0;

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.max(42, Math.min(92, Math.floor((width * height) / 19000)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.48,
    vy: (Math.random() - 0.5) * 0.48,
    size: Math.random() * 1.8 + 0.8,
  }));
}

function draw() {
  context.clearRect(0, 0, width, height);

  particles.forEach((particle, index) => {
    if (!reduceMotion) {
      particle.x += particle.vx;
      particle.y += particle.vy;
    }

    if (particle.x < -20) particle.x = width + 20;
    if (particle.x > width + 20) particle.x = -20;
    if (particle.y < -20) particle.y = height + 20;
    if (particle.y > height + 20) particle.y = -20;

    if (pointer.active && !reduceMotion) {
      const dx = pointer.x - particle.x;
      const dy = pointer.y - particle.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 180) {
        particle.x -= dx * 0.0025;
        particle.y -= dy * 0.0025;
      }
    }

    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fillStyle = index % 5 === 0 ? 'rgba(255, 207, 90, 0.84)' : 'rgba(46, 231, 255, 0.72)';
    context.fill();
  });

  for (let first = 0; first < particles.length; first += 1) {
    for (let second = first + 1; second < particles.length; second += 1) {
      const a = particles[first];
      const b = particles[second];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < 118) {
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = `rgba(46, 231, 255, ${0.2 - distance / 620})`;
        context.lineWidth = 1;
        context.stroke();
      }
    }
  }

  if (!reduceMotion) {
    animationFrame = requestAnimationFrame(draw);
  }
}

function updateTilt(event) {
  if (!tiltTarget || reduceMotion) return;

  const box = tiltTarget.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - 0.5;
  const y = (event.clientY - box.top) / box.height - 0.5;
  tiltTarget.style.transform = `rotateX(${y * -10}deg) rotateY(${x * 14}deg)`;
}

function resetTilt() {
  if (tiltTarget) tiltTarget.style.transform = 'rotateX(0deg) rotateY(0deg)';
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('pointermove', (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});
window.addEventListener('pointerleave', () => {
  pointer.active = false;
});

if (tiltTarget) {
  tiltTarget.addEventListener('pointermove', updateTilt);
  tiltTarget.addEventListener('pointerleave', resetTilt);
}

resizeCanvas();
cancelAnimationFrame(animationFrame);
draw();
