const tabs = [...document.querySelectorAll(".nav-tab")];
const pages = [...document.querySelectorAll(".page")];
const nav = document.getElementById("navTabs");
const menuToggle = document.getElementById("menuToggle");
const navBackdrop = document.getElementById("navBackdrop");

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
