const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverDiv = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const startBtn = document.getElementById('start-btn');
const flapBtn = document.getElementById('flap-btn');

// Responsive canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game variables
let bird = { x: 120, y: 200, radius: 22, velocity: 0, gravity: 0.16, lift: -9, maxFall: 3.5 };
let walls = [];
let wallWidth = 80;
let gapHeight = 240;
let wallSpeed = 2.31; // 10% faster than before
let frame = 0;
let gameActive = false;
let gameStarted = false;
let score = 0;
let leaves = [];
let darkMode = false;
let upPressed = false;

function resetGame() {
    bird = { x: 120, y: canvas.height / 2, radius: 22, velocity: 0, gravity: 0.16, lift: -9, maxFall: 3.5 };
    walls = [];
    frame = 0;
    score = 0;
    gameActive = false;
    gameStarted = false;
    gameOverDiv.classList.add('hidden');
    leaves = [];
    startBtn.classList.remove('hidden');
}

function drawBird() {
    ctx.save();
    // Body
    ctx.beginPath();
    ctx.ellipse(bird.x, bird.y, bird.radius, bird.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = darkMode ? '#ffeb3b' : '#ffde59';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.closePath();
    // Wing (flap animation)
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(Math.sin(frame / 5) * 0.3);
    ctx.beginPath();
    ctx.ellipse(-8, 0, bird.radius * 0.7, bird.radius * 0.3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = darkMode ? '#c2b280' : '#f7c873';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();
    // Tail
    ctx.save();
    ctx.translate(bird.x - bird.radius + 4, bird.y);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fillStyle = darkMode ? '#b8860b' : '#e6b800';
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.restore();
    // Beak
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bird.x + bird.radius, bird.y - 4);
    ctx.lineTo(bird.x + bird.radius + 12, bird.y);
    ctx.lineTo(bird.x + bird.radius, bird.y + 4);
    ctx.closePath();
    ctx.fillStyle = '#ff9800';
    ctx.fill();
    ctx.restore();
    // Eye
    ctx.beginPath();
    ctx.arc(bird.x + 8, bird.y - 7, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bird.x + 10, bird.y - 7, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.restore();
}

function drawWalls() {
    ctx.save();
    ctx.fillStyle = darkMode ? '#222' : '#2ecc40';
    walls.forEach(wall => {
        // Top wall
        ctx.fillRect(wall.x, 0, wallWidth, wall.gapY);
        // Bottom wall
        ctx.fillRect(wall.x, wall.gapY + gapHeight, wallWidth, canvas.height - wall.gapY - gapHeight);
    });
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.font = 'bold 2.5rem Segoe UI, Arial';
    ctx.fillStyle = darkMode ? '#fff' : '#222';
    ctx.fillText(`Score: ${score}`, 30, 60);
    ctx.restore();
}

function drawLeaves() {
    leaves.forEach(leaf => {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(leaf.x, leaf.y, leaf.size, leaf.size / 2, leaf.angle, 0, Math.PI * 2);
        ctx.fillStyle = leaf.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.restore();
    });
}

function updateLeaves() {
    // Add new leaves
    if (Math.random() < 0.08) {
        leaves.push({
            x: Math.random() * canvas.width,
            y: -20,
            size: 18 + Math.random() * 12,
            angle: Math.random() * Math.PI,
            speed: 1.5 + Math.random() * 1.5,
            sway: Math.random() * 2 + 1,
            swayDir: Math.random() > 0.5 ? 1 : -1,
            color: `hsl(${90 + Math.random() * 60}, 60%, 55%)`
        });
    }
    // Update leaves
    leaves.forEach(leaf => {
        leaf.y += leaf.speed;
        leaf.x += Math.sin(leaf.angle) * leaf.sway * leaf.swayDir;
        leaf.angle += 0.03 * leaf.swayDir;
    });
    // Remove leaves out of screen
    leaves = leaves.filter(leaf => leaf.y < canvas.height + 30);
}

let wallDistance = 520; // much larger initial distance between walls
function updateWalls() {
    // Gradually decrease wall distance as score increases
    if (score > 120) wallDistance = 220;
    else if (score > 80) wallDistance = 300;
    else if (score > 40) wallDistance = 400;
    else wallDistance = 520;
    if (walls.length === 0 || (canvas.width - walls[walls.length - 1].x) > wallDistance) {
        let gapY = 80 + Math.random() * (canvas.height - gapHeight - 160);
        walls.push({ x: canvas.width, gapY });
    }
    walls.forEach(wall => wall.x -= wallSpeed);
    walls = walls.filter(wall => wall.x + wallWidth > 0);
}

function checkCollision() {
    // Wall collision
    for (let wall of walls) {
        if (
            bird.x + bird.radius > wall.x &&
            bird.x - bird.radius < wall.x + wallWidth
        ) {
            if (
                bird.y - bird.radius < wall.gapY ||
                bird.y + bird.radius > wall.gapY + gapHeight
            ) {
                return true;
            }
        }
    }
    // Top/bottom collision
    if (bird.y - bird.radius < 0 || bird.y + bird.radius > canvas.height) {
        return true;
    }
    return false;
}

function updateBird() {
    if (upPressed) {
        bird.velocity += bird.lift * 0.09;
    }
    bird.velocity += bird.gravity;
    bird.velocity *= 0.97;
    // Cap max fall speed
    if (bird.velocity > bird.maxFall) bird.velocity = bird.maxFall;
    if (bird.velocity < -8) bird.velocity = -8;
    bird.y += bird.velocity;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateLeaves();
    drawLeaves();
    if (gameActive) {
        updateWalls();
        updateBird();
        if (checkCollision()) {
            gameActive = false;
            gameOverDiv.classList.remove('hidden');
        }
        // Score
        walls.forEach(wall => {
            if (!wall.passed && wall.x + wallWidth < bird.x) {
                score++;
                wall.passed = true;
            }
        });
    }
    drawWalls();
    drawBird();
    drawScore();
    frame++;
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
    if (e.code === 'ArrowUp' && gameActive) {
        upPressed = true;
    }
});
document.addEventListener('keyup', e => {
    if (e.code === 'ArrowUp') {
        upPressed = false;
    }
});

// Touch controls for mobile FLAP button
flapBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (gameActive) upPressed = true;
});
flapBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    upPressed = false;
});
// Mouse fallback for FLAP button (for testing on desktop)
flapBtn.addEventListener('mousedown', function(e) {
    if (gameActive) upPressed = true;
});
flapBtn.addEventListener('mouseup', function(e) {
    upPressed = false;
});

startBtn.addEventListener('click', () => {
    if (!gameStarted) {
        gameActive = true;
        gameStarted = true;
        startBtn.classList.add('hidden');
    }
});
restartBtn.addEventListener('click', () => {
    resetGame();
});

darkModeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
});

// Start game
resetGame();
gameLoop();
