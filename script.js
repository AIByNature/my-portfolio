const tabs = [...document.querySelectorAll(".nav-tab")];
const pages = [...document.querySelectorAll(".page")];
const nav = document.getElementById("navTabs");
const menuToggle = document.getElementById("menuToggle");
const navBackdrop = document.getElementById("navBackdrop");

// Update this list as your experience grows. Use only the three honest status labels.
const skillsGrowthData = [
  {
    name: "Canva and Digital Design",
    status: "Comfortable",
    icon: "✳",
    abilities: ["Visual layouts and graphic design", "Presentation design", "Creative digital materials"]
  },
  {
    name: "Documentation and Technical Writing",
    status: "Comfortable",
    icon: "▤",
    abilities: ["Organizing information", "Preparing reports", "Technical and project documentation"]
  },
  {
    name: "Hardware Setup and Computer Maintenance",
    status: "Developing",
    icon: "⌘",
    abilities: ["Computer assembly and disassembly", "Hardware inspection and peripheral setup", "Computer deployment and basic maintenance during OJT"]
  },
  {
    name: "Microsoft Office",
    status: "Comfortable",
    icon: "▧",
    abilities: ["Document preparation", "Presentations and spreadsheets", "Administrative tasks"]
  },
  {
    name: "Multimedia and Game Asset Creation",
    status: "Developing",
    icon: "◇",
    abilities: ["Digital illustrations and visual assets", "UI layouts", "Creative assets for multimedia and game projects"]
  }
];

function renderSkillsGrowthMap() {
  const map = document.getElementById("skillsGrowthMap");
  if (!map) return;

  const statusClass = {
    "Comfortable": "comfortable",
    "Developing": "developing",
    "Currently Learning": "learning"
  };

  map.replaceChildren(...skillsGrowthData.map((skill, index) => {
    const card = document.createElement("article");
    card.className = "growth-skill";

    const heading = document.createElement("div");
    heading.className = "growth-skill-heading";

    const icon = document.createElement("span");
    icon.className = "growth-skill-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = skill.icon;

    const name = document.createElement("h3");
    name.className = "growth-skill-name";
    name.textContent = skill.name;

    const status = document.createElement("span");
    status.className = `growth-skill-status ${statusClass[skill.status] || "developing"}`;
    status.textContent = skill.status;

    heading.append(icon, name, status);

    const details = document.createElement("ul");
    details.className = "growth-skill-details";
    details.id = `growth-skill-details-${index}`;
    skill.abilities.forEach(ability => {
      const item = document.createElement("li");
      item.textContent = ability;
      details.append(item);
    });

    card.append(heading, details);
    return card;
  }));
}

renderSkillsGrowthMap();

const skillsViewport = document.getElementById("skillsCarouselViewport");
const skillsTrack = document.getElementById("skillsGrowthMap");
const skillsPrevious = document.getElementById("skillsPrevious");
const skillsNext = document.getElementById("skillsNext");
const skillsCounter = document.getElementById("skillsCounter");
const skillsPagination = document.getElementById("skillsPagination");
let activeSkillIndex = 0;
let skillScrollFrame = 0;

function getSkillsCarouselBounds() {
  const cards = [...skillsTrack.children];
  const gap = Number.parseFloat(getComputedStyle(skillsTrack).columnGap) || 0;
  const cardWidth = cards[0]?.getBoundingClientRect().width || 0;
  const visibleCount = skillsViewport.clientWidth && cardWidth
    ? Math.max(1, Math.floor((skillsViewport.clientWidth + gap) / (cardWidth + gap)))
    : 1;
  return { cards, maxStart: Math.max(0, cards.length - visibleCount) };
}

function buildSkillsPagination(maxStart) {
  const positions = maxStart + 1;
  if (skillsPagination.children.length === positions) return;
  skillsPagination.replaceChildren(...Array.from({ length: positions }, (_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "skills-carousel-dot";
    dot.setAttribute("aria-label", `Show skills starting with ${skillsGrowthData[index].name}`);
    dot.addEventListener("click", () => goToSkill(index));
    return dot;
  }));
}

function updateSkillsCarousel() {
  if (!skillsViewport || !skillsTrack || !skillsTrack.children.length) return;
  const { cards, maxStart } = getSkillsCarouselBounds();
  buildSkillsPagination(maxStart);
  const viewportLeft = skillsViewport.getBoundingClientRect().left;
  activeSkillIndex = cards.reduce((closestIndex, card, index) => {
    const closestDistance = Math.abs(cards[closestIndex].getBoundingClientRect().left - viewportLeft);
    const distance = Math.abs(card.getBoundingClientRect().left - viewportLeft);
    return distance < closestDistance ? index : closestIndex;
  }, 0);
  activeSkillIndex = Math.min(activeSkillIndex, maxStart);

  skillsCounter.textContent = `${String(activeSkillIndex + 1).padStart(2, "0")} / ${String(maxStart + 1).padStart(2, "0")}`;
  skillsPrevious.disabled = activeSkillIndex === 0;
  skillsNext.disabled = activeSkillIndex === maxStart;
  [...skillsPagination.children].forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeSkillIndex);
    dot.setAttribute("aria-current", String(index === activeSkillIndex));
  });
}

function goToSkill(index) {
  const { cards, maxStart } = getSkillsCarouselBounds();
  index = Math.max(0, Math.min(index, maxStart));
  const card = skillsTrack?.children[index];
  if (!card || !skillsViewport) return;
  const left = skillsViewport.scrollLeft + card.getBoundingClientRect().left - skillsViewport.getBoundingClientRect().left;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  skillsViewport.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
}

buildSkillsPagination(getSkillsCarouselBounds().maxStart);

skillsPrevious.addEventListener("click", () => goToSkill(activeSkillIndex - 1));
skillsNext.addEventListener("click", () => goToSkill(activeSkillIndex + 1));
skillsViewport.addEventListener("scroll", () => {
  cancelAnimationFrame(skillScrollFrame);
  skillScrollFrame = requestAnimationFrame(updateSkillsCarousel);
}, { passive: true });
skillsViewport.addEventListener("keydown", event => {
  if (event.target !== skillsViewport) return;
  const { maxStart } = getSkillsCarouselBounds();
  if (event.key === "ArrowLeft" && activeSkillIndex > 0) {
    event.preventDefault();
    goToSkill(activeSkillIndex - 1);
  } else if (event.key === "ArrowRight" && activeSkillIndex < maxStart) {
    event.preventDefault();
    goToSkill(activeSkillIndex + 1);
  }
});

let skillDragStartX = null;
let skillDragScrollLeft = 0;
skillsViewport.addEventListener("pointerdown", event => {
  if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest("button")) return;
  skillDragStartX = event.clientX;
  skillDragScrollLeft = skillsViewport.scrollLeft;
  skillsViewport.classList.add("is-dragging");
  skillsViewport.setPointerCapture(event.pointerId);
});
skillsViewport.addEventListener("pointermove", event => {
  if (skillDragStartX === null) return;
  skillsViewport.scrollLeft = skillDragScrollLeft - (event.clientX - skillDragStartX);
});
function endSkillDrag() {
  skillDragStartX = null;
  skillsViewport.classList.remove("is-dragging");
}
skillsViewport.addEventListener("pointerup", endSkillDrag);
skillsViewport.addEventListener("pointercancel", endSkillDrag);
window.addEventListener("resize", updateSkillsCarousel);
updateSkillsCarousel();

function setNavigationOpen(open, returnFocus = true) {
  const wasOpen = nav.classList.contains("open");
  nav.classList.toggle("open", open);
  nav.inert = !open;
  nav.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", `${open ? "Close" : "Open"} navigation menu`);
  document.body.classList.toggle("nav-open", open);
  navBackdrop.classList.toggle("visible", open);
  navBackdrop.setAttribute("aria-hidden", String(!open));
  navBackdrop.tabIndex = open ? 0 : -1;
  if (open) nav.querySelector(".nav-tab")?.focus();
  else if (returnFocus && wasOpen) menuToggle.focus();
}

function showPage(pageId) {
  const target = document.getElementById(pageId);
  if (!target) return;
  pages.forEach(page => page.classList.toggle("active", page.id === pageId));
  if (pageId === "skills") requestAnimationFrame(updateSkillsCarousel);
  const navPageId = pageId === "ojt-gallery" ? "ojt" : pageId;
  tabs.forEach(tab => {
    const active = tab.dataset.page === navPageId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-current", active ? "page" : "false");
  });
  setNavigationOpen(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#${pageId}`);
}

tabs.forEach(tab => tab.addEventListener("click", () => showPage(tab.dataset.page)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.go)));

// Add, remove, or replace profile image paths and alt text here.
const profileCards = [
  { src: "assets/profile-preview.svg", alt: "Illustrated profile preview", role: "IT Student · Multimedia", description: "" },
  { src: "assets/profile-2.jpg", alt: "Profile photo 2", role: "IT Student · Multimedia", description: "" },
  { src: "assets/profile-3.jpg", alt: "Profile photo 3", role: "IT Student · Multimedia", description: "" },
  { src: "assets/profile-4.jpg", alt: "Profile photo 4", role: "IT Student · Multimedia", description: "" },
  { src: "assets/profile-5.jpg", alt: "Profile photo 5", role: "IT Student · Multimedia", description: "" },
  { src: "assets/profile-6.jpg", alt: "Profile photo 6", role: "IT Student · Multimedia", description: "" }
];
const profileCarousel = document.getElementById("profileCarousel");
const profileCounter = document.getElementById("profileCounter");
const profileTrack = document.getElementById("profileTrack");
const profilePagination = document.getElementById("profilePagination");
const profileRole = document.getElementById("profileRole");
const profileDescription = document.getElementById("profileDescription");
let currentProfileCard = 0;
let dragStartX = null;
let dragged = false;

function createProfileSlide(card, index) {
  const slide = document.createElement("div");
  slide.className = "carousel-slide is-placeholder";
  slide.setAttribute("aria-hidden", "true");

  const placeholder = document.createElement("span");
  placeholder.className = "portrait-initials";
  placeholder.innerHTML = "YOUR<br>PHOTO";
  slide.append(placeholder);

  if (card?.src) {
    const image = document.createElement("img");
    image.className = "profile-image";
    image.src = card.src;
    image.alt = card.alt || `Profile photo ${index + 1}`;
    image.draggable = false;
    image.addEventListener("load", () => {
      image.classList.add("is-loaded");
      slide.classList.remove("is-placeholder");
    });
    image.addEventListener("error", () => {
      image.hidden = true;
      slide.classList.add("is-placeholder");
    });
    slide.prepend(image);
  }
  return slide;
}

function renderProfileCarousel(index) {
  const count = profileCards.length;
  if (!count) {
    profileCounter.textContent = "00 / 00";
    if (!profileTrack.children.length) profileTrack.append(createProfileSlide(null, 0));
    profilePagination.replaceChildren();
    return;
  }

  currentProfileCard = (index + count) % count;
  const activeCard = profileCards[currentProfileCard];
  profileCounter.textContent = `${String(currentProfileCard + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
  profileRole.textContent = activeCard.role || "IT Student · Multimedia";
  profileDescription.textContent = activeCard.description || "";
  profileDescription.hidden = !activeCard.description;
  if (profileTrack.children.length !== count) {
    profileTrack.replaceChildren(...profileCards.map(createProfileSlide));
  }
  [...profileTrack.children].forEach((slide, slideIndex) => {
    const previous = (currentProfileCard - 1 + count) % count;
    const next = (currentProfileCard + 1) % count;
    const position = slideIndex === currentProfileCard ? "active" : slideIndex === previous ? "previous" : slideIndex === next ? "next" : "hidden";
    slide.classList.remove("is-active", "is-previous", "is-next", "is-hidden");
    slide.classList.add(`is-${position}`);
    slide.setAttribute("aria-hidden", String(position !== "active"));
  });
  [...profilePagination.children].forEach((dot, dotIndex) => {
    dot.setAttribute("aria-current", String(dotIndex === currentProfileCard));
    dot.classList.toggle("is-active", dotIndex === currentProfileCard);
  });
}

function moveProfileCarousel(step) {
  renderProfileCarousel(currentProfileCard + step);
}

function buildProfilePagination() {
  profilePagination.replaceChildren(...profileCards.map((card, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `Show profile photo ${index + 1}`);
    dot.addEventListener("click", () => renderProfileCarousel(index));
    return dot;
  }));
}

document.getElementById("profilePrevious").addEventListener("click", () => moveProfileCarousel(-1));
document.getElementById("profileNext").addEventListener("click", () => moveProfileCarousel(1));
profileCarousel.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") { event.preventDefault(); moveProfileCarousel(-1); }
  if (event.key === "ArrowRight") { event.preventDefault(); moveProfileCarousel(1); }
});
profileCarousel.addEventListener("pointerdown", event => {
  if (event.target.closest("button")) return;
  dragStartX = event.clientX;
  dragged = false;
  profileCarousel.setPointerCapture(event.pointerId);
});
profileCarousel.addEventListener("pointerup", event => {
  if (dragStartX === null) return;
  const distance = event.clientX - dragStartX;
  if (Math.abs(distance) > 40) {
    dragged = true;
    moveProfileCarousel(distance < 0 ? 1 : -1);
  }
  dragStartX = null;
});
profileCarousel.addEventListener("pointercancel", () => { dragStartX = null; });
profileCarousel.addEventListener("click", event => {
  if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
}, true);
buildProfilePagination();
renderProfileCarousel(0);

menuToggle.addEventListener("click", () => setNavigationOpen(menuToggle.getAttribute("aria-expanded") !== "true", false));
navBackdrop.addEventListener("click", () => setNavigationOpen(false));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") setNavigationOpen(false);
});

const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";

const themeIcons = {
  sun: '<svg class="theme-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>',
  moon: '<svg class="theme-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6.5 6.5 0 0 0 8.268 8.268c.344-.215.825-.003.803.401Z"/></svg>'
};

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === "dark";
  const action = `Switch to ${isDark ? "Light" : "Dark"} Mode`;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", action);
  themeToggle.setAttribute("title", action);
  themeToggle.innerHTML = isDark ? themeIcons.sun : themeIcons.moon;
}

updateThemeButton();
themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = isDark ? "light" : "dark";
  localStorage.setItem("portfolio-theme", isDark ? "light" : "dark");
  updateThemeButton();
});

document.getElementById("year").textContent = new Date().getFullYear();

const initialPage = window.location.hash.slice(1);
if (initialPage && document.getElementById(initialPage)) showPage(initialPage);

const copyButton = document.getElementById("copyEmail");
const feedback = document.getElementById("copyFeedback");
copyButton.addEventListener("click", async () => {
  const email = copyButton.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    feedback.textContent = "Email copied. Replace the placeholder with your real address first.";
  } catch {
    feedback.textContent = `Email: ${email} (replace this placeholder before publishing).`;
  }
});

const gameLauncher = document.getElementById("miniGameLauncher");
const gamePanel = document.getElementById("miniGamePanel");
const gameClose = document.getElementById("miniGameClose");
const gameStart = document.getElementById("miniGameStart");
const gameSound = document.getElementById("miniGameSound");
const gameArena = document.getElementById("miniGameArena");
const gameTarget = document.getElementById("miniGameTarget");
const gameTimer = document.getElementById("miniGameTimer");
const gameScore = document.getElementById("miniGameScore");
const gameMessage = document.getElementById("miniGameMessage");
let gameInterval = null;
let gameDeadline = 0;
let gameRemaining = 15;
let gamePoints = 0;
let gameRunning = false;
let gameSoundEnabled = false;
let gameAudioContext = null;

function setGamePanelOpen(open) {
  if (!open && gameRunning) {
    window.clearInterval(gameInterval);
    gameInterval = null;
    gameRunning = false;
    gameTarget.hidden = true;
    gameArena.classList.remove("is-active");
    gameMessage.textContent = "Round stopped. Start a new game when you’re ready.";
    gameStart.textContent = "Start Game";
  }

  gamePanel.hidden = !open;
  gamePanel.setAttribute("aria-hidden", String(!open));
  gameLauncher.setAttribute("aria-expanded", String(open));
  if (open) gameStart.focus({ preventScroll: true });
  else gameLauncher.focus({ preventScroll: true });
}

function placeGameTarget() {
  gameTarget.hidden = false;
  const padding = 7;
  const maxX = Math.max(padding, gameArena.clientWidth - gameTarget.offsetWidth - padding);
  const maxY = Math.max(padding, gameArena.clientHeight - gameTarget.offsetHeight - padding);
  const minX = padding;
  const minY = padding;
  gameTarget.style.left = `${minX + Math.random() * (maxX - minX)}px`;
  gameTarget.style.top = `${minY + Math.random() * (maxY - minY)}px`;
}

function playTargetSound() {
  if (!gameSoundEnabled) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    gameAudioContext ||= new AudioContextClass();
    if (gameAudioContext.state === "suspended") gameAudioContext.resume();
    const oscillator = gameAudioContext.createOscillator();
    const gain = gameAudioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(680, gameAudioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(940, gameAudioContext.currentTime + .07);
    gain.gain.setValueAtTime(.06, gameAudioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, gameAudioContext.currentTime + .09);
    oscillator.connect(gain);
    gain.connect(gameAudioContext.destination);
    oscillator.start();
    oscillator.stop(gameAudioContext.currentTime + .09);
  } catch { /* The game remains playable if browser audio is unavailable. */ }
}

function finishGame() {
  if (gameInterval !== null) window.clearInterval(gameInterval);
  gameInterval = null;
  gameRunning = false;
  gameRemaining = 0;
  gameTimer.textContent = "0";
  gameTarget.hidden = true;
  gameArena.classList.remove("is-active");
  gameMessage.textContent = `Time’s up! Your final score is ${gamePoints}.`;
  gameStart.textContent = "Play Again";
}

function startGame() {
  if (gameRunning) return;
  if (gameInterval !== null) window.clearInterval(gameInterval);
  gamePoints = 0;
  gameRemaining = 15;
  gameScore.textContent = "0";
  gameTimer.textContent = "15";
  gameRunning = true;
  gameDeadline = Date.now() + 15000;
  gameMessage.textContent = "Go! Click the target.";
  gameArena.classList.add("is-active");
  gameStart.textContent = "Game Running";
  placeGameTarget();

  gameInterval = window.setInterval(() => {
    const next = Math.max(0, Math.ceil((gameDeadline - Date.now()) / 1000));
    if (next !== gameRemaining) {
      gameRemaining = next;
      gameTimer.textContent = String(next);
    }
    if (next === 0) finishGame();
  }, 100);
}

gameLauncher.addEventListener("click", () => setGamePanelOpen(true));
gameClose.addEventListener("click", () => setGamePanelOpen(false));
gameStart.addEventListener("click", startGame);
gameTarget.addEventListener("click", () => {
  if (!gameRunning) return;
  gamePoints += 1;
  gameScore.textContent = String(gamePoints);
  playTargetSound();
  placeGameTarget();
});
gameSound.addEventListener("click", () => {
  gameSoundEnabled = !gameSoundEnabled;
  gameSound.setAttribute("aria-pressed", String(gameSoundEnabled));
  gameSound.setAttribute("aria-label", gameSoundEnabled ? "Turn sound off" : "Turn sound on");
  gameSound.textContent = gameSoundEnabled ? "Sound on" : "Sound off";
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !gamePanel.hidden) setGamePanelOpen(false);
});
