/**
 * Mehyar Mlaweh — portfolio interactions.
 * Vanilla JS, no dependencies. The page stays fully usable without it.
 */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const hasIO = "IntersectionObserver" in window;

  /* ------------------------------------------------------------------
     Theme toggle (initial theme is applied inline in <head>)
     ------------------------------------------------------------------ */
  const THEME_KEY = "mm-theme";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.getAttribute("data-theme") || (systemDark.matches ? "dark" : "light");

  $$(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      if (!reduceMotion) {
        root.classList.add("theme-anim");
        window.setTimeout(() => root.classList.remove("theme-anim"), 400);
      }
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* storage unavailable: the choice just won't persist */
      }
    });
  });

  /* ------------------------------------------------------------------
     Navigation: scrolled state, progress bar, mobile menu
     ------------------------------------------------------------------ */
  const nav = $("#nav");
  const progress = $(".progress");
  const menuToggle = $(".nav-toggle");

  const setMenu = (open) => {
    if (!nav) return;
    nav.classList.toggle("is-open", open);
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  };

  if (menuToggle) {
    menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    $$("#nav-links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });
  }

  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", y > 8);
    if (progress) {
      const max = root.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* Highlight the nav link of the section in the middle of the viewport */
  const navLinks = $$("#nav-links a[href^='#']");
  if (hasIO && navLinks.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = "#" + entry.target.id;
          navLinks.forEach((a) => {
            const active = a.hash === id;
            a.classList.toggle("is-active", active);
            if (active) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    $$("main > section[id]").forEach((section) => spy.observe(section));
  }

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  const revealables = $$("[data-reveal]");
  if (reduceMotion || !hasIO) {
    revealables.forEach((el) => el.classList.add("is-in"));
  } else {
    const revealer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealables.forEach((el) => revealer.observe(el));
  }

  /* ------------------------------------------------------------------
     Hero: rotating "now building" line + paused SVG for reduced motion
     ------------------------------------------------------------------ */
  const rotator = $(".rotator");
  if (rotator && !reduceMotion) {
    const words = (rotator.dataset.words || "").split("|").filter(Boolean);
    let index = 0;
    if (words.length > 1) {
      window.setInterval(() => {
        index = (index + 1) % words.length;
        rotator.classList.add("is-out");
        window.setTimeout(() => {
          rotator.textContent = words[index];
          rotator.classList.remove("is-out");
          rotator.classList.add("is-pre");
          void rotator.offsetWidth; // restart the transition from the "pre" state
          rotator.classList.remove("is-pre");
        }, 350);
      }, 2800);
    }
  }

  if (reduceMotion) {
    $$("svg.anim").forEach((svg) => {
      if (typeof svg.pauseAnimations === "function") svg.pauseAnimations();
    });
  }

  /* ------------------------------------------------------------------
     Count-up numbers
     ------------------------------------------------------------------ */
  const counters = $$("[data-count]");
  if (counters.length && hasIO && !reduceMotion) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          counterObserver.unobserve(entry.target);
          const el = entry.target;
          const raw = el.dataset.count;
          const end = parseFloat(raw);
          const decimals = (raw.split(".")[1] || "").length;
          const start = performance.now();
          const duration = 1400;
          const step = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            el.textContent = (end * eased).toFixed(decimals);
            if (p < 1) window.requestAnimationFrame(step);
          };
          window.requestAnimationFrame(step);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  }

  /* ------------------------------------------------------------------
     Project filters
     ------------------------------------------------------------------ */
  const workGrid = $(".work-grid");
  const chips = $$(".chip[data-filter]");
  if (workGrid && chips.length) {
    const projects = $$(".project", workGrid);
    const matches = (project, filter) => filter === "all" || (project.dataset.cat || "").split(" ").includes(filter);

    chips.forEach((chip) => {
      const filter = chip.dataset.filter;
      const count = $(".count", chip);
      if (count) count.textContent = projects.filter((p) => matches(p, filter)).length;

      chip.addEventListener("click", () => {
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        workGrid.classList.toggle("is-filtered", filter !== "all");
        projects.forEach((project) => {
          const show = matches(project, filter);
          project.classList.toggle("is-hidden", !show);
          if (show) {
            project.classList.add("is-in");
            if (!reduceMotion) {
              project.classList.remove("is-entering");
              void project.offsetWidth;
              project.classList.add("is-entering");
            }
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Tabs (Experience / Education / Toolbox)
     ------------------------------------------------------------------ */
  $$("[role='tablist']").forEach((list) => {
    const tabs = $$("[role='tab']", list);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    if (panels.some((p) => !p)) return;

    const select = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
        if (active) {
          $$("[data-reveal]", panels[i]).forEach((el) => el.classList.add("is-in"));
          if (!reduceMotion) {
            panels[i].classList.remove("is-entering");
            void panels[i].offsetWidth;
            panels[i].classList.add("is-entering");
          }
        }
      });
      if (focus) tabs[index].focus();
    };

    const initial = Math.max(0, tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"));
    tabs.forEach((tab, i) => {
      panels[i].hidden = i !== initial;
      tab.tabIndex = i === initial ? 0 : -1;
      tab.addEventListener("click", () => select(i));
      tab.addEventListener("keydown", (e) => {
        const last = tabs.length - 1;
        let next = null;
        if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
        else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = last;
        if (next !== null) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    // Deep links such as #education or #toolbox open the matching tab
    const fromHash = () => {
      const i = panels.findIndex((p) => "#" + p.id === window.location.hash);
      if (i < 0) return;
      select(i);
      window.requestAnimationFrame(() => list.closest("section").scrollIntoView({ block: "start" }));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
  });

  /* ------------------------------------------------------------------
     Collapsible blocks (BibTeX)
     ------------------------------------------------------------------ */
  $$("[data-collapse]").forEach((btn) => {
    const target = document.getElementById(btn.getAttribute("aria-controls"));
    if (!target) return;
    const label = $("[data-label]", btn);
    const closedText = label ? label.textContent : "";
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      target.classList.toggle("is-open", open);
      if (label) label.textContent = open ? "Hide BibTeX" : closedText;
    });
  });

  /* ------------------------------------------------------------------
     Copy to clipboard (email, BibTeX)
     ------------------------------------------------------------------ */
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      area.remove();
      return ok;
    }
  };

  $$("[data-copy]").forEach((btn) => {
    const label = $("[data-label]", btn);
    const idleText = label ? label.textContent : "";
    let timer;
    btn.addEventListener("click", async () => {
      const source = btn.dataset.copy;
      const text = source.startsWith("#") ? ($(source)?.textContent || "") : source;
      const ok = await copyText(text.trim());
      btn.classList.toggle("is-done", ok);
      if (label) label.textContent = ok ? "Copied" : "Press Ctrl+C";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        btn.classList.remove("is-done");
        if (label) label.textContent = idleText;
      }, 1800);
    });
  });

  /* ------------------------------------------------------------------
     Calendly: popup on desktop, loaded only when someone shows intent.
     Without the script (or on phones) the link simply opens Calendly.
     ------------------------------------------------------------------ */
  const calendlyLinks = $$("[data-calendly]");
  if (calendlyLinks.length) {
    let calendlyPromise = null;
    const loadCalendly = () => {
      if (!calendlyPromise) {
        calendlyPromise = new Promise((resolve, reject) => {
          const css = document.createElement("link");
          css.rel = "stylesheet";
          css.href = "https://assets.calendly.com/assets/external/widget.css";
          document.head.appendChild(css);
          const script = document.createElement("script");
          script.src = "https://assets.calendly.com/assets/external/widget.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        }).catch(() => {});
      }
      return calendlyPromise;
    };

    calendlyLinks.forEach((link) => {
      ["pointerenter", "focus", "touchstart"].forEach((type) =>
        link.addEventListener(type, loadCalendly, { once: true, passive: true })
      );
      link.addEventListener("click", (e) => {
        const small = window.matchMedia("(max-width: 640px)").matches;
        if (small || !window.Calendly || typeof window.Calendly.initPopupWidget !== "function") return;
        e.preventDefault();
        window.Calendly.initPopupWidget({ url: link.href });
      });
    });
  }

  /* ------------------------------------------------------------------
     Pointer spotlight on cards
     ------------------------------------------------------------------ */
  if (canHover && !reduceMotion) {
    $$(".spot").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ------------------------------------------------------------------
     Teaching page: resource counts per group
     ------------------------------------------------------------------ */
  $$("[data-tally]").forEach((el) => {
    const list = document.getElementById(el.dataset.tally);
    if (!list) return;
    const count = $$(".res", list).length;
    const empty = count === 0 && el.dataset.empty;
    el.textContent = empty ? el.dataset.empty : String(count);
    el.classList.toggle("is-soon", Boolean(empty));
  });

  /* Footer year */
  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
