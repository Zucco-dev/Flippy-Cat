"use strict";

// ========================================
// FLIPPY CAT - MOTOR DO JOGO
// ========================================

const $ = (id) => document.getElementById(id);

const nicknameInput = $("nickname");
const saveNicknameButton = $("saveNickname");
const playButton = $("playButton");
const backButton = $("backButton");

const skinsButton = $("skinsButton");
const skinsPanel = $("skinsPanel");
const closeSkinsButton = $("closeSkins");
const skinSelector = $("skinSelector");

const skinPreview = $("skinPreview");
const previewCanvas = $("previewCanvas");
const previewName = $("previewName");
const previewDescription = $("previewDescription");
const equipSkinButton = $("equipSkinButton");

const achievementsButton = $("achievementsButton");
const achievementsPanel = $("achievementsPanel");
const closeAchievementsButton = $("closeAchievements");
const achievementList = $("achievementList");
const achievementCount = $("achievementCount");
const achievementProgressFill = $("achievementProgressFill");

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

const previewCtx = previewCanvas.getContext("2d");

const STORAGE_KEY = "flippyCatPlayer";

// ========================================
// SKINS
// ========================================

const SKINS = [
    {
        id: "classic",
        name: "Clássico",
        emoji: "🐱",
        points: 0,
        body: "#f2a35a",
        dark: "#99552d",
        white: "#fffaf2",
        stripe: "#cf7b3d",
        eye: "#202b83",
        nose: "#713d35",
        cheek: "#ff9cae"
    },
    {
        id: "purple",
        name: "Roxo",
        emoji: "💜",
        points: 15,
        body: "#aa82e8",
        dark: "#563080",
        white: "#f5eaff",
        stripe: "#8057bd",
        eye: "#252080",
        nose: "#563080",
        cheek: "#efb4ff"
    },
    {
        id: "silver",
        name: "Prateado",
        emoji: "🩶",
        points: 30,
        body: "#c6d0df",
        dark: "#596273",
        white: "#ffffff",
        stripe: "#929eaf",
        eye: "#173c91",
        nose: "#596273",
        cheek: "#f3a8bb"
    },
    {
        id: "flame",
        name: "Flamejante",
        emoji: "🔥",
        points: 50,
        body: "#ff914d",
        dark: "#7d2b19",
        white: "#fff0dc",
        stripe: "#d94d25",
        eye: "#54234c",
        nose: "#7d2b19",
        cheek: "#ffb08a"
    },
    {
        id: "gold",
        name: "Dourado",
        emoji: "🌟",
        points: 100,
        body: "#ffd447",
        dark: "#8a5b12",
        white: "#fff8d9",
        stripe: "#dca92e",
        eye: "#34306e",
        nose: "#8a5b12",
        cheek: "#ffb0a6"
    }
];

// ========================================
// CONQUISTAS
// ========================================

const ACHIEVEMENTS = [
    {
        id: "first_flight",
        name: "Primeiro Voo",
        description: "Faça seu primeiro ponto.",
        emoji: "🐾",
        points: 1
    },
    {
        id: "persistent",
        name: "Persistente",
        description: "Alcance 10 pontos em uma partida.",
        emoji: "⭐",
        points: 10
    },
    {
        id: "flying_addict",
        name: "Viciado em Voar",
        description: "Alcance 25 pontos em uma partida.",
        emoji: "🚀",
        points: 25
    },
    {
        id: "sky_master",
        name: "Mestre dos Céus",
        description: "Alcance 50 pontos em uma partida.",
        emoji: "👑",
        points: 50
    },
    {
        id: "flippy_legend",
        name: "Lenda do Flippy Cat",
        description: "Alcance 100 pontos em uma partida.",
        emoji: "🏆",
        points: 100
    }
];

const player = {
    nickname: "",
    level: 1,
    record: 0,
    selectedSkin: "classic"
};

let previewSkinId = null;

let state = "ready";
let score = 0;
let bird = {};
let pipes = [];
let animationId = null;
let lastTime = 0;
let elapsed = 0;
let pipeTimer = 0;
let toastTimer = null;

// Guarda as conquistas que já foram avisadas nesta sessão.
let notifiedAchievements = [];

const GRAVITY = 0.00085;
const FLAP_FORCE = -0.32;
const PIPE_SPEED = 0.13;
const PIPE_WIDTH = 62;
const PIPE_GAP = 155;

// Área de colisão ajustada ao tamanho do gato.
const CAT_HALF_WIDTH = 32;
const CAT_HALF_HEIGHT = 29;

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

            player.selectedSkin =
                SKINS.some(skin => skin.id === data.selectedSkin)
                    ? data.selectedSkin
                    : "classic";
        }
    } catch (error) {
        console.warn("Não foi possível carregar o perfil.", error);
    }

    const selectedSkin = SKINS.find(
        skin => skin.id === player.selectedSkin
    );

    if (!selectedSkin || player.record < selectedSkin.points) {
        player.selectedSkin = "classic";
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

    renderSkins();
    renderAchievements();
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
// PAINEL DE SKINS
// ========================================

function openSkins() {
    menu.hidden = true;
    achievementsPanel.hidden = true;
    skinsPanel.hidden = false;

    previewSkinId = null;
    skinPreview.hidden = true;

    renderSkins();
}

function closeSkins() {
    skinsPanel.hidden = true;
    menu.hidden = false;

    previewSkinId = null;
    skinPreview.hidden = true;
}

skinsButton.addEventListener("click", openSkins);
closeSkinsButton.addEventListener("click", closeSkins);

// ========================================
// LISTA DE SKINS
// ========================================

function renderSkins() {
    skinSelector.innerHTML = "";

    SKINS.forEach(skin => {
        const unlocked = player.record >= skin.points;
        const selected = player.selectedSkin === skin.id;

        const button = document.createElement("button");

        button.type = "button";
        button.className = "skin-option";

        if (selected) {
            button.classList.add("selected");
        }

        if (!unlocked) {
            button.classList.add("locked");
        }

        const emoji = document.createElement("span");
        emoji.className = "skin-emoji";
        emoji.textContent = unlocked ? skin.emoji : "🔒";

        const name = document.createElement("span");
        name.className = "skin-name";
        name.textContent = skin.name;

        const status = document.createElement("small");
        status.className = "skin-status";

        if (!unlocked) {
            status.textContent = `${skin.points} pontos`;
        } else if (selected) {
            status.textContent = "✓ Equipada";
        } else {
            status.textContent = "Disponível";
        }

        button.append(emoji, name, status);

        button.addEventListener("click", () => {
            showSkinPreview(skin.id);
        });

        skinSelector.appendChild(button);
    });
}

// ========================================
// PRÉVIA DAS SKINS
// ========================================

function showSkinPreview(skinId) {
    const skin = SKINS.find(item => item.id === skinId);

    if (!skin) return;

    previewSkinId = skinId;

    const unlocked = player.record >= skin.points;
    const selected = player.selectedSkin === skin.id;

    skinPreview.hidden = false;
    previewName.textContent = `Gato ${skin.name}`;

    previewCtx.clearRect(
        0,
        0,
        previewCanvas.width,
        previewCanvas.height
    );

    const gradient = previewCtx.createLinearGradient(
        0, 0, 0, previewCanvas.height
    );

    gradient.addColorStop(0, "#3a2257");
    gradient.addColorStop(1, "#170e25");

    previewCtx.fillStyle = gradient;
    previewCtx.fillRect(
        0,
        0,
        previewCanvas.width,
        previewCanvas.height
    );

    previewCtx.fillStyle = "#e5ceff";

    for (let i = 0; i < 12; i++) {
        const x = (i * 37 + 17) % 230;
        const y = (i * 23 + 12) % 155;

        previewCtx.beginPath();
        previewCtx.arc(x, y, 1.5, 0, Math.PI * 2);
        previewCtx.fill();
    }

    drawCatCharacter(
        previewCtx,
        120,
        91,
        skin,
        1.05,
        -0.08
    );

    if (!unlocked) {
        const remaining = skin.points - player.record;

        previewDescription.textContent =
            `Essa skin está bloqueada. Faltam ${remaining} ponto(s) para desbloquear.`;

        equipSkinButton.textContent = "SKIN BLOQUEADA";
        equipSkinButton.disabled = true;
    } else if (selected && skin.id !== "classic") {
        previewDescription.textContent =
            "Essa é a skin que você está usando atualmente.";

        equipSkinButton.textContent = "DESEQUIPAR";
        equipSkinButton.disabled = false;
    } else if (selected) {
        previewDescription.textContent =
            "Essa é a aparência clássica do seu gatinho.";

        equipSkinButton.textContent = "SKIN PADRÃO";
        equipSkinButton.disabled = true;
    } else {
        previewDescription.textContent =
            `Skin disponível! Desbloqueada com ${skin.points} pontos.`;

        equipSkinButton.textContent = "EQUIPAR";
        equipSkinButton.disabled = false;
    }

    renderSkins();
}

// ========================================
// EQUIPAR E DESEQUIPAR
// ========================================

equipSkinButton.addEventListener("click", () => {
    if (!previewSkinId) return;

    const skin = SKINS.find(
        item => item.id === previewSkinId
    );

    if (!skin || player.record < skin.points) return;

    if (
        player.selectedSkin === skin.id &&
        skin.id !== "classic"
    ) {
        player.selectedSkin = "classic";

        savePlayer();
        showToast("Skin desequipada! Voltou ao clássico. 🐱");
    } else {
        player.selectedSkin = skin.id;

        savePlayer();
        showToast(`${skin.name} equipada! 💜`);
    }

    showSkinPreview(previewSkinId);
    draw();
});

// ========================================
// PAINEL DE CONQUISTAS
// ========================================

function openAchievements() {
    menu.hidden = true;
    skinsPanel.hidden = true;
    achievementsPanel.hidden = false;

    renderAchievements();
}

function closeAchievements() {
    achievementsPanel.hidden = true;
    menu.hidden = false;
}

achievementsButton.addEventListener("click", openAchievements);
closeAchievementsButton.addEventListener("click", closeAchievements);

function renderAchievements() {
    if (!achievementList) return;

    achievementList.innerHTML = "";

    let unlockedCount = 0;

    ACHIEVEMENTS.forEach(achievement => {
        const unlocked = player.record >= achievement.points;

        if (unlocked) {
            unlockedCount++;
        }

        const item = document.createElement("div");
        item.className = "achievement-item";

        if (unlocked) {
            item.classList.add("unlocked");
        }

        const icon = document.createElement("div");
        icon.className = "achievement-icon";
        icon.textContent = unlocked ? achievement.emoji : "🔒";

        const info = document.createElement("div");
        info.className = "achievement-info";

        const name = document.createElement("h3");
        name.textContent = achievement.name;

        const description = document.createElement("p");
        description.textContent = achievement.description;

        info.append(name, description);

        const status = document.createElement("div");
        status.className = "achievement-status";
        status.textContent = unlocked ? "DESBLOQUEADA" : `${achievement.points} PTS`;

        item.append(icon, info, status);

        achievementList.appendChild(item);
    });

    achievementCount.textContent =
        `${unlockedCount}/${ACHIEVEMENTS.length}`;

    const percentage =
        (unlockedCount / ACHIEVEMENTS.length) * 100;

    achievementProgressFill.style.width = `${percentage}%`;
}

function checkAchievements(previousRecord, newRecord) {
    ACHIEVEMENTS.forEach(achievement => {
        const reachedNow =
            previousRecord < achievement.points &&
            newRecord >= achievement.points;

        if (
            reachedNow &&
            !notifiedAchievements.includes(achievement.id)
        ) {
            notifiedAchievements.push(achievement.id);

            showToast(
                `🏆 Conquista desbloqueada: ${achievement.name}!`
            );
        }
    });

    renderAchievements();
}

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
    skinsPanel.hidden = true;
    achievementsPanel.hidden = true;
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

    bird.velocity += GRAVITY * delta;
    bird.y += bird.velocity * delta;

    bird.rotation = Math.min(
        0.8,
        Math.max(-0.45, bird.velocity * 1.5)
    );

    if (pipeTimer >= 1550) {
        createPipe();
        pipeTimer = 0;
    }

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
                const previousRecord = player.record;

                player.record = score;

                updateProgress();
                savePlayer();

                checkAchievements(previousRecord, player.record);
            }
        }
    }

    pipes = pipes.filter(
        pipe => pipe.x + PIPE_WIDTH > -10
    );

    if (
        bird.y - CAT_HALF_HEIGHT < 0 ||
        bird.y + CAT_HALF_HEIGHT > canvas.height
    ) {
        endGame();
        return;
    }

    for (const pipe of pipes) {
        const overlapsX =
            bird.x + CAT_HALF_WIDTH > pipe.x &&
            bird.x - CAT_HALF_WIDTH < pipe.x + PIPE_WIDTH;

        const hitsPipe =
            bird.y - CAT_HALF_HEIGHT < pipe.top ||
            bird.y + CAT_HALF_HEIGHT > pipe.top + PIPE_GAP;

        if (overlapsX && hitsPipe) {
            endGame();
            return;
        }
    }
}

// ========================================
// CENÁRIO
// ========================================

function drawBackground() {
    const gradient = ctx.createLinearGradient(
        0, 0, 0, canvas.height
    );

    gradient.addColorStop(0, "#281747");
    gradient.addColorStop(1, "#100b1c");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    drawCloud(55, 100, 0.75);
    drawCloud(280, 185, 0.55);
    drawCloud(125, 350, 0.6);

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

    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top - 12);
    ctx.strokeRect(pipe.x, -3, PIPE_WIDTH, pipe.top - 9);

    ctx.fillStyle = "#a66bff";
    ctx.fillRect(pipe.x - 5, pipe.top - 16, PIPE_WIDTH + 10, 16);
    ctx.strokeRect(pipe.x - 5, pipe.top - 16, PIPE_WIDTH + 10, 16);

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

    ctx.fillStyle = "#d6b8ff";
    ctx.fillRect(pipe.x + 9, 0, 4, Math.max(0, pipe.top - 20));

    ctx.fillRect(
        pipe.x + 9,
        bottomY + 20,
        4,
        Math.max(0, bottomHeight - 20)
    );
}

// ========================================
// DESENHO DO GATO
// ========================================

function drawCatCharacter(target, x, y, skin, scale = 1, rotation = 0) {
    target.save();

    target.translate(x, y);
    target.rotate(rotation);

    // O gato continua olhando para a direita.
    target.scale(-scale, scale);

    target.lineJoin = "round";
    target.lineCap = "round";

    // CAUDA MAIS CURTA
    target.lineWidth = 7;
    target.strokeStyle = skin.dark;

    target.beginPath();
    target.moveTo(27, 5);
    target.bezierCurveTo(39, 1, 43, -10, 43, -20);
    target.bezierCurveTo(43, -29, 50, -34, 54, -38);
    target.stroke();

    target.lineWidth = 4.5;
    target.strokeStyle = skin.body;

    target.beginPath();
    target.moveTo(27, 5);
    target.bezierCurveTo(39, 1, 43, -10, 43, -20);
    target.bezierCurveTo(43, -29, 50, -34, 54, -38);
    target.stroke();

    // PONTA DA CAUDA
    target.fillStyle = skin.white;
    target.beginPath();
    target.arc(54, -38, 3, 0, Math.PI * 2);
    target.fill();

    // CORPO MAIS FINO
    target.fillStyle = skin.body;
    target.strokeStyle = skin.dark;
    target.lineWidth = 2.5;

    target.beginPath();
    target.ellipse(12, 8, 27, 19, -0.12, 0, Math.PI * 2);
    target.fill();
    target.stroke();

    // BARRIGA MENOR
    target.fillStyle = skin.white;

    target.beginPath();
    target.ellipse(14, 19, 15, 5, -0.12, 0, Math.PI * 2);
    target.fill();

    // LISTRAS DO CORPO
    target.strokeStyle = skin.stripe;
    target.lineWidth = 3;

    target.beginPath();
    target.moveTo(-4, -7);
    target.quadraticCurveTo(1, 1, -4, 7);

    target.moveTo(13, -10);
    target.quadraticCurveTo(18, -2, 13, 4);

    target.moveTo(27, -3);
    target.quadraticCurveTo(31, 4, 27, 8);
    target.stroke();

    // PATAS TRASEIRAS MENORES
    target.fillStyle = skin.body;
    target.strokeStyle = skin.dark;
    target.lineWidth = 2.5;

    target.beginPath();
    target.ellipse(29, 20, 8, 10, -0.5, 0, Math.PI * 2);
    target.fill();
    target.stroke();

    target.beginPath();
    target.ellipse(38, 25, 6, 7, -0.5, 0, Math.PI * 2);
    target.fill();
    target.stroke();

    // PONTA BRANCA DA PATA
    target.fillStyle = skin.white;

    target.beginPath();
    target.ellipse(38, 29, 4, 3, -0.5, 0, Math.PI * 2);
    target.fill();

    // PATA DIANTEIRA
    target.fillStyle = skin.body;
    target.strokeStyle = skin.dark;

    target.beginPath();
    target.moveTo(-15, 5);
    target.quadraticCurveTo(-31, 9, -29, 20);
    target.quadraticCurveTo(-26, 28, -14, 26);
    target.quadraticCurveTo(-3, 23, -1, 15);
    target.closePath();
    target.fill();
    target.stroke();

    // PATINHA BRANCA
    target.fillStyle = skin.white;

    target.beginPath();
    target.ellipse(-23, 20, 7, 5, 0.3, 0, Math.PI * 2);
    target.fill();

    target.strokeStyle = skin.dark;
    target.lineWidth = 1.2;

    target.beginPath();
    target.moveTo(-26, 18);
    target.quadraticCurveTo(-29, 22, -25, 24);

    target.moveTo(-21, 18);
    target.quadraticCurveTo(-24, 23, -20, 25);
    target.stroke();

    // CABEÇA MAIS FINA
    target.fillStyle = skin.body;
    target.strokeStyle = skin.dark;
    target.lineWidth = 2.8;

    target.beginPath();
    target.ellipse(-15, -17, 23, 25, -0.08, 0, Math.PI * 2);
    target.fill();
    target.stroke();

    // ORELHA ESQUERDA
    target.fillStyle = skin.body;

    target.beginPath();
    target.moveTo(-35, -34);
    target.lineTo(-34, -53);
    target.quadraticCurveTo(-33, -58, -28, -52);
    target.lineTo(-17, -36);
    target.closePath();
    target.fill();
    target.stroke();

    // ORELHA DIREITA
    target.beginPath();
    target.moveTo(-13, -37);
    target.lineTo(-5, -55);
    target.quadraticCurveTo(0, -60, 4, -52);
    target.lineTo(5, -35);
    target.closePath();
    target.fill();
    target.stroke();

    // INTERIOR DAS ORELHAS
    target.fillStyle = skin.cheek;

    target.beginPath();
    target.moveTo(-31, -39);
    target.lineTo(-31, -50);
    target.lineTo(-23, -38);
    target.closePath();
    target.fill();

    target.beginPath();
    target.moveTo(-9, -39);
    target.lineTo(-5, -51);
    target.lineTo(0, -38);
    target.closePath();
    target.fill();

    // LISTRAS DA TESTA
    target.strokeStyle = skin.stripe;
    target.lineWidth = 3.5;

    target.beginPath();
    target.moveTo(-18, -36);
    target.lineTo(-15, -30);

    target.moveTo(-5, -36);
    target.lineTo(-2, -30);
    target.stroke();

    // MANCHA BRANCA MAIS BAIXA
    target.fillStyle = skin.white;

    target.beginPath();
    target.moveTo(-37, -13);
    target.bezierCurveTo(-40, -5, -34, 5, -25, 7);
    target.bezierCurveTo(-17, 10, -8, 6, -6, -1);
    target.bezierCurveTo(-5, -7, -10, -14, -18, -16);
    target.bezierCurveTo(-26, -18, -33, -17, -37, -13);
    target.fill();

    // OLHOS
    target.fillStyle = skin.eye;

    target.beginPath();
    target.ellipse(-28, -22, 6.5, 8, -0.1, 0, Math.PI * 2);
    target.ellipse(-10, -22, 6.5, 8, -0.1, 0, Math.PI * 2);
    target.fill();

    // BRILHO DOS OLHOS
    target.fillStyle = "#ffffff";

    target.beginPath();
    target.arc(-30, -25, 2.3, 0, Math.PI * 2);
    target.arc(-12, -25, 2.3, 0, Math.PI * 2);
    target.fill();

    // FOCINHO
    target.fillStyle = skin.white;

    target.beginPath();
    target.ellipse(-19, -5, 8, 5, 0, 0, Math.PI * 2);
    target.fill();

    // NARIZ
    target.fillStyle = skin.nose;

    target.beginPath();
    target.moveTo(-22, -9);
    target.quadraticCurveTo(-19, -12, -16, -9);
    target.quadraticCurveTo(-18, -5, -21, -7);
    target.closePath();
    target.fill();

    // BOCA
    target.strokeStyle = skin.dark;
    target.lineWidth = 1.5;

    target.beginPath();
    target.moveTo(-19, -5);
    target.lineTo(-19, -2);
    target.quadraticCurveTo(-23, 1, -25, -2);

    target.moveTo(-19, -2);
    target.quadraticCurveTo(-15, 1, -12, -2);
    target.stroke();

    // LÍNGUA
    target.fillStyle = "#ff6f91";

    target.beginPath();
    target.ellipse(-19, 1, 2.3, 3, 0, 0, Math.PI * 2);
    target.fill();

    // BOCHECHAS
    target.globalAlpha = 0.8;
    target.fillStyle = skin.cheek;

    target.beginPath();
    target.ellipse(-34, -5, 3, 2.3, 0, 0, Math.PI * 2);
    target.ellipse(-5, -5, 3, 2.3, 0, 0, Math.PI * 2);
    target.fill();

    target.globalAlpha = 1;

    // BIGODES
    target.strokeStyle = skin.dark;
    target.lineWidth = 1;

    target.beginPath();
    target.moveTo(-34, -3);
    target.lineTo(-41, -5);

    target.moveTo(-34, 1);
    target.lineTo(-40, 3);

    target.moveTo(-5, -3);
    target.lineTo(1, -5);
    target.stroke();

    // DETALHES DA SKIN DOURADA
    if (skin.id === "gold") {
        target.fillStyle = "#fff4b0";

        target.beginPath();
        target.arc(25, -24, 2, 0, Math.PI * 2);
        target.arc(-42, -39, 1.7, 0, Math.PI * 2);
        target.fill();
    }

    // DETALHE DA SKIN FLAMEJANTE
    if (skin.id === "flame") {
        target.fillStyle = "#ffd166";

        target.beginPath();
        target.moveTo(25, -3);
        target.quadraticCurveTo(35, -12, 30, -20);
        target.quadraticCurveTo(40, -10, 34, 1);
        target.fill();
    }

    target.restore();
}

function drawCat() {
    const skin = SKINS.find(
        item => item.id === player.selectedSkin
    ) || SKINS[0];

    drawCatCharacter(
        ctx,
        bird.x,
        bird.y,
        skin,
        0.78,
        bird.rotation
    );
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
        const previousRecord = player.record;
        player.record = score;

        checkAchievements(previousRecord, player.record);
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