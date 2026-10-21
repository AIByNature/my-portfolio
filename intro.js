(() => {
  const intro = document.getElementById("portfolioIntro");
  const envelope = document.getElementById("openEnvelope");
  const site = document.querySelector(".site-shell");
  const skipButton = document.getElementById("skipIntro");
  const replayButton = document.getElementById("replayIntro");
  const storageKey = "portfolio-envelope-opened";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timers = [];
  let isAnimating = false;

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  function lockSite() {
    site.inert = true;
    site.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("intro-seen");
    document.documentElement.classList.add("intro-pending");
    intro.classList.remove("is-opening", "is-revealing", "is-leaving");
    envelope.disabled = false;
    envelope.setAttribute("aria-expanded", "false");
    isAnimating = false;
    envelope.focus({ preventScroll: true });
    document.documentElement.classList.add("intro-ready");
  }

  function finishIntro() {
    clearTimers();
    try { sessionStorage.setItem(storageKey, "1"); } catch { /* The page still opens if storage is unavailable. */ }
    intro.classList.remove("is-opening");
    intro.classList.add("is-leaving");
    timers.push(window.setTimeout(() => {
      document.documentElement.classList.remove("intro-pending");
      document.documentElement.classList.add("intro-seen");
      site.inert = false;
      site.removeAttribute("aria-hidden");
      intro.classList.remove("is-leaving");
      isAnimating = false;
      const activePage = document.querySelector(".page.active");
      const focusTarget = activePage?.querySelector("h1, h2, h3") || activePage;
      if (focusTarget) {
        if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
        focusTarget.focus({ preventScroll: true });
      }
    }, reducedMotion.matches ? 0 : 520));
  }

  function openEnvelope() {
    if (isAnimating) return;
    isAnimating = true;
    envelope.disabled = true;
    envelope.setAttribute("aria-expanded", "true");
    intro.classList.add("is-opening");
    if (reducedMotion.matches) {
      intro.classList.add("is-revealing");
      timers.push(window.setTimeout(finishIntro, 0));
      return;
    }
    timers.push(window.setTimeout(() => intro.classList.add("is-revealing"), 760));
    timers.push(window.setTimeout(finishIntro, 1510));
  }

  envelope.addEventListener("click", openEnvelope);
  skipButton.addEventListener("click", finishIntro);
  document.addEventListener("keydown", event => {
    const introIsActive = document.documentElement.classList.contains("intro-pending");
    const isOpenKey = event.key === "Enter" || event.key === " ";

    // Native button activation handles focused controls, while this also lets
    // Enter/Space open the envelope when keyboard focus is elsewhere on intro.
    if (introIsActive && isOpenKey && event.target !== skipButton) {
      event.preventDefault();
      openEnvelope();
      return;
    }

    if (event.key === "Escape" && document.documentElement.classList.contains("intro-pending")) finishIntro();
  });

  replayButton.addEventListener("click", () => {
    clearTimers();
    lockSite();
  });

  if (!document.documentElement.classList.contains("intro-seen")) lockSite();
})();
