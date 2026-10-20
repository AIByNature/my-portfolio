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

menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeToggle.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = isDark ? "Light mode" : "Dark mode";
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
