const tabs = [...document.querySelectorAll(".nav-tab")];
const pages = [...document.querySelectorAll(".page")];
const nav = document.getElementById("navTabs");
const menuToggle = document.getElementById("menuToggle");

function showPage(pageId) {
  const target = document.getElementById(pageId);
  if (!target) return;
  pages.forEach(page => page.classList.toggle("active", page.id === pageId));
  tabs.forEach(tab => {
    const active = tab.dataset.page === pageId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-current", active ? "page" : "false");
  });
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#${pageId}`);
}

tabs.forEach(tab => tab.addEventListener("click", () => showPage(tab.dataset.page)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.go)));

// Add, remove, or replace profile image paths here. Missing files leave the card placeholder visible.
const profileImages = [
  "assets/profile-1.jpg",
  "assets/profile-2.jpg",
  "assets/profile-3.jpg",
  "assets/profile-4.jpg",
  "assets/profile-5.jpg",
  "assets/profile-6.jpg"
];
const profileImage = document.getElementById("profileImage");
const profileCarousel = document.getElementById("profileCarousel");
const profileCounter = document.getElementById("profileCounter");
let currentProfileImage = 0;

function showProfileImage(index) {
  const count = profileImages.length;
  if (!count) {
    profileCounter.textContent = "00 / 00";
    profileImage.hidden = true;
    profileCarousel.classList.remove("has-image");
    return;
  }

  currentProfileImage = (index + count) % count;
  profileCounter.textContent = `${String(currentProfileImage + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
  profileImage.alt = `Profile photo ${currentProfileImage + 1} of ${count}`;
  profileImage.classList.remove("is-visible");
  profileImage.hidden = false;
  profileImage.onload = () => {
    profileImage.classList.add("is-visible");
    profileCarousel.classList.add("has-image");
  };
  profileImage.onerror = () => {
    profileImage.hidden = true;
    profileCarousel.classList.remove("has-image");
  };
  profileImage.src = profileImages[currentProfileImage];
}

document.getElementById("profilePrevious").addEventListener("click", () => showProfileImage(currentProfileImage - 1));
document.getElementById("profileNext").addEventListener("click", () => showProfileImage(currentProfileImage + 1));
showProfileImage(0);

menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
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
