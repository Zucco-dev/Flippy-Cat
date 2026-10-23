
"use strict";

// ========================================
// FLIPPY CAT - MOTOR DO JOGO
// ========================================

const $ = (id) => document.getElementById(id);

const nicknameInput = $("nickname");
const saveNicknameButton = $("saveNickname");
const playButton = $("playButton");
const backButton = $("backButton");
const startButton = $("startButton");

const menu = $("menu");
const logo = $("logo");
const gameScreen = $("gameScreen");
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = $("score");
const levelElement = $("level");
const recordElement = $("record");
const gameMessage = $("gameMessage");
const toast = $("toast");

const STORAGE_KEY = "flippyCatPlayer";

const player = {
    nickname: "",
    level: 1,
    record: 0
};

let state = "ready";
let score = 0;
let bird = {};
let pipes = [];
let animationId = null;
let lastTime = 0;
let elapsed = 0;
let pipeTimer = 0;
let toastTimer = null;

// Configuração da física

const GRAVITY = 0.00085;
const FLAP_FORCE = -0.32;
const PIPE_SPEED = 0.13;
const PIPE_WIDTH = 62;
const PIPE_GAP = 155;
const CAT_RADIUS = 15;

// ========================================
// PERFIL E SALVAMENTO
// ========================================

function loadPlayer() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            const data = JSON.parse(saved);

            player.nickname =
                typeof data.nickname === "string"
                    ? data.nickname.slice(0, 20)
                    : "";

            player.record =
                Number.isSafeInteger(data.record) && data.record >= 0
                    ? data.record
                    : 0;
        }
    } catch (error) {
        console.warn("Não foi possível carregar o perfil.", error);
    }

    updateProgress();
    nicknameInput.value = player.nickname;
}

function savePlayer() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(player)
        );
        return true;
    } catch (error) {
        console.warn("Não foi possível salvar o perfil.", error);
        return false;
    }
}

function updateProgress() {
    player.level = Math.floor(player.record / 5) + 1;

    levelElement.textContent = player.level;
    recordElement.textContent = player.record;
}

function saveNickname() {
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
        showToast("Digite um nickname primeiro! 🐱");
        nicknameInput.focus();
        return;
    }

    player.nickname = nickname;
    nicknameInput.value = nickname;

    if (savePlayer()) {
        showToast("Nickname salvo com sucesso! 💜");
    } else {
        showToast("Não foi possível salvar os dados.");
    }
}

saveNicknameButton.addEventListener("click", saveNickname);

nicknameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        saveNickname();
    }
});

// ========================================
// MENSAGENS
// ========================================

function showToast(message) {
    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function showGameMessage(title, description, buttonText) {
    gameMessage.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = description;

    const button = document.createElement("button");
    button.id = "startButton";
    button.className = "play-button";
    button.textContent = buttonText;

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        startGame();
    });

    gameMessage.append(heading, paragraph, button);
    gameMessage.hidden = false;
}

// ========================================
// MENU
// ========================================

function openGame() {
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
        showToast("Escolha seu nickname antes de jogar!");
        nicknameInput.focus();
        return;
    }

    player.nickname = nickname;
    savePlayer();

    menu.hidden = true;
    logo.hidden = true;
    gameScreen.hidden = false;

    resetGame();
    draw();
}

function backToMenu() {
    stopGame();

    gameScreen.hidden = true;
    menu.hidden = false;
    logo.hidden = false;

    state = "ready";
}

playButton.addEventListener("click", openGame);
backButton.addEventListener("click", backToMenu);

// ========================================
// PREPARAÇÃO DA PARTIDA
// ========================================

function resetGame() {
    stopGame();

    score = 0;
    elapsed = 0;
    pipeTimer = 0;
    pipes = [];

    bird = {
        x: canvas.width * 0.28,
        y: canvas.height * 0.45,
        velocity: 0,
        rotation: 0
    };

    scoreElement.textContent = score;
    state = "ready";

    showGameMessage(
        "Pronto para voar? 🐱",
        "Clique no jogo ou pressione ESPAÇO!",
        "COMEÇAR"
    );

    draw();
}

function startGame() {
    if (state === "running") return;

    stopGame();

    score = 0;
    elapsed = 0;
    pipeTimer = 0;
    pipes = [];

    bird = {
        x: canvas.width * 0.28,
        y: canvas.height * 0.45,
        velocity: FLAP_FORCE,
        rotation: 0
    };

    scoreElement.textContent = score;

    state = "running";
    lastTime = 0;
    gameMessage.hidden = true;

    animationId = requestAnimationFrame(gameLoop);
}

function stopGame() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    lastTime = 0;
}

function flap() {
    if (state !== "running") return;

    bird.velocity = FLAP_FORCE;
}

// ========================================
// CONTROLES
// ========================================

canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    if (state === "ready") {
        startGame();
    } else if (state === "running") {
        flap();
    } else if (state === "over") {
        resetGame();
    }
});

document.addEventListener("keydown", (event) => {
    if (
        event.code !== "Space" ||
        menu.hidden === false ||
        gameScreen.hidden
    ) {
        return;
    }

    event.preventDefault();

    if (state === "ready") {
        startGame();
    } else if (state === "running") {
        flap();
    }
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") {
        endGame();
    }
});

// ========================================
// OBSTÁCULOS
// ========================================

function createPipe() {
    const margin = 65;
    const available = canvas.height - PIPE_GAP - margin * 2;

    const topHeight =
        margin + Math.random() * Math.max(1, available);

    pipes.push({
        x: canvas.width + 10,
        top: topHeight,
        passed: false
    });
}

// ========================================
// ATUALIZAÇÃO DA FÍSICA
// ========================================

function update(delta) {
    elapsed += delta;
    pipeTimer += delta;

    // Gravidade e movimento do gatinho

    bird.velocity += GRAVITY * delta;
    bird.y += bird.velocity * delta;

    bird.rotation = Math.min(
        0.8,
        Math.max(-0.45, bird.velocity * 1.5)
    );

    // Cria obstáculos

    if (pipeTimer >= 1550) {
        createPipe();
        pipeTimer = 0;
    }

    // Move os obstáculos e conta os pontos

    for (const pipe of pipes) {
        pipe.x -= PIPE_SPEED * delta;

        if (
            !pipe.passed &&
            pipe.x + PIPE_WIDTH < bird.x
        ) {
            pipe.passed = true;
            score++;

            scoreElement.textContent = score;

            if (score > player.record) {
                player.record = score;
                updateProgress();
                savePlayer();
            }
        }
    }

    pipes = pipes.filter(
        (pipe) => pipe.x + PIPE_WIDTH > -10
    );

    // Verifica o chão, o teto e os canos

    if (
        bird.y - CAT_RADIUS < 0 ||
        bird.y + CAT_RADIUS > canvas.height
    ) {
        endGame();
        return;
    }

    for (const pipe of pipes) {
        const overlapsX =
            bird.x + CAT_RADIUS > pipe.x &&
            bird.x - CAT_RADIUS < pipe.x + PIPE_WIDTH;

        const hitsPipe =
            bird.y - CAT_RADIUS < pipe.top ||
            bird.y + CAT_RADIUS > pipe.top + PIPE_GAP;

        if (overlapsX && hitsPipe) {
            endGame();
            return;
        }
    }
}

// ========================================
// DESENHO DO CENÁRIO
// ========================================

function drawBackground() {
    const gradient = ctx.createLinearGradient(
        0, 0, 0, canvas.height
    );

    gradient.addColorStop(0, "#281747");
    gradient.addColorStop(1, "#100b1c");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Estrelas decorativas

    for (let i = 0; i < 30; i++) {
        const x = (i * 97 + 25) % canvas.width;
        const y = (i * 67 + 18) % canvas.height;

        ctx.globalAlpha =
            0.35 + Math.sin(elapsed / 350 + i) * 0.2;

        ctx.fillStyle = "#e1caff";
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Nuvens

    drawCloud(55, 100, 0.75);
    drawCloud(280, 185, 0.55);
    drawCloud(125, 350, 0.6);

    // Chão

    ctx.fillStyle = "#382052";
    ctx.fillRect(0, canvas.height - 12, canvas.width, 12);

    ctx.fillStyle = "#a66bff";
    ctx.fillRect(0, canvas.height - 12, canvas.width, 3);
}

function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#7652a0";

    ctx.beginPath();
    ctx.arc(-15, 0, 12, 0, Math.PI * 2);
    ctx.arc(0, -8, 16, 0, Math.PI * 2);
    ctx.arc(16, 0, 12, 0, Math.PI * 2);
    ctx.rect(-15, -2, 31, 14);
    ctx.fill();

    ctx.restore();
}

function drawPipe(pipe) {
    const bottomY = pipe.top + PIPE_GAP;
    const bottomHeight = canvas.height - bottomY;

    ctx.fillStyle = "#7537b8";
    ctx.strokeStyle = "#c39aff";
    ctx.lineWidth = 3;

    // Cano superior

    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top - 12);
    ctx.strokeRect(pipe.x, -3, PIPE_WIDTH, pipe.top - 9);

    ctx.fillStyle = "#a66bff";
    ctx.fillRect(pipe.x - 5, pipe.top - 16, PIPE_WIDTH + 10, 16);
    ctx.strokeRect(pipe.x - 5, pipe.top - 16, PIPE_WIDTH + 10, 16);

    // Cano inferior

    ctx.fillStyle = "#7537b8";
    ctx.fillRect(pipe.x, bottomY + 12, PIPE_WIDTH, bottomHeight);
    ctx.strokeRect(
        pipe.x,
        bottomY + 12,
        PIPE_WIDTH,
        bottomHeight
    );

    ctx.fillStyle = "#a66bff";
    ctx.fillRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 16);
    ctx.strokeRect(
        pipe.x - 5,
        bottomY,
        PIPE_WIDTH + 10,
        16
    );

    // Brilhos nos canos

    ctx.fillStyle = "#d6b8ff";
    ctx.fillRect(pipe.x + 9, 0, 4, Math.max(0, pipe.top - 20));
    ctx.fillRect(
        pipe.x + 9,
        bottomY + 20,
        4,
        Math.max(0, bottomHeight - 20)
    );
}

function drawCat() {
    ctx.save();

    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Corpo

    ctx.fillStyle = "#ffc66d";
    ctx.strokeStyle = "#6b3a55";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Orelhas

    ctx.fillStyle = "#ffc66d";

    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(-15, -22);
    ctx.lineTo(-3, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, -13);
    ctx.lineTo(13, -22);
    ctx.lineTo(14, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Interior das orelhas

    ctx.fillStyle = "#f58aaf";

    ctx.beginPath();
    ctx.moveTo(-11, -12);
    ctx.lineTo(-12, -18);
    ctx.lineTo(-6, -14);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(7, -14);
    ctx.lineTo(12, -18);
    ctx.lineTo(12, -10);
    ctx.closePath();
    ctx.fill();

    // Bochechas

    ctx.fillStyle = "#f28eaa";

    ctx.beginPath();
    ctx.arc(-10, 3, 4, 0, Math.PI * 2);
    ctx.arc(10, 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Olhos

    ctx.fillStyle = "#38233e";

    ctx.beginPath();
    ctx.ellipse(-6, -2, 2, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -2, 2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Focinho

    ctx.fillStyle = "#7c4357";

    ctx.beginPath();
    ctx.moveTo(-2, 3);
    ctx.lineTo(2, 3);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();

    // Cauda

    ctx.strokeStyle = "#ffc66d";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(14, 7);
    ctx.quadraticCurveTo(24, 0, 21, -7);
    ctx.stroke();

    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    for (const pipe of pipes) {
        drawPipe(pipe);
    }

    drawCat();
}

// ========================================
// LOOP PRINCIPAL
// ========================================

function gameLoop(timestamp) {
    if (state !== "running") return;

    if (lastTime === 0) {
        lastTime = timestamp;
    }

    // Limita o intervalo para evitar saltos grandes

    const delta = Math.min(timestamp - lastTime, 32);
    lastTime = timestamp;

    update(delta);
    draw();

    if (state === "running") {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ========================================
// FIM DA PARTIDA
// ========================================

function endGame() {
    if (state !== "running") return;

    state = "over";
    stopGame();

    if (score > player.record) {
        player.record = score;
    }

    updateProgress();
    savePlayer();

    draw();

    showGameMessage(
        "Fim de jogo! 🐱",
        `Você fez ${score} ponto(s)! Recorde: ${player.record}.`,
        "JOGAR NOVAMENTE"
    );
}

// ========================================
// ESTRELAS DO MENU
// ========================================

function createStars() {
    const container = $("stars");

    for (let i = 0; i < 55; i++) {
        const star = document.createElement("span");

        star.className = "star";
        star.style.left = Math.random() * 100 + "%";
        star.style.top = Math.random() * 100 + "%";
        star.style.animationDelay = Math.random() * 3 + "s";

        container.appendChild(star);
    }
}

// ========================================
// INICIALIZAÇÃO
// ========================================

loadPlayer();
createStars();
resetGame();
