(() => {
  "use strict";

  const root = document.documentElement;
  const revealSite = () => root.classList.remove("hattz-maintenance-checking");

  const style = document.createElement("style");
  style.textContent = `
    html.hattz-maintenance-checking body { visibility: hidden !important; }
    #hattz-maintenance-screen {
      position: fixed; inset: 0; z-index: 2147483647;
      display: grid; place-items: center; overflow: auto;
      padding: 28px; box-sizing: border-box;
      color: #f4f0fa; background:
        radial-gradient(ellipse at 50% 0%, rgba(133, 93, 190, .19), transparent 48%),
        linear-gradient(145deg, #100e16 0%, #09080d 58%, #111019 100%);
      font-family: Manrope, "DM Sans", system-ui, sans-serif;
    }
    #hattz-maintenance-screen * { box-sizing: border-box; }
    #hattz-maintenance-screen .maintenance-panel {
      width: min(100%, 560px); padding: clamp(30px, 7vw, 58px);
      text-align: center; border: 1px solid rgba(220, 210, 240, .16);
      border-radius: 26px;
      background: linear-gradient(145deg, rgba(255,255,255,.105), rgba(255,255,255,.035));
      box-shadow: 0 28px 90px rgba(0,0,0,.48), inset 0 1px rgba(255,255,255,.13);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    }
    #hattz-maintenance-screen .maintenance-mark {
      width: 58px; height: 58px; display: grid; place-items: center;
      margin: 0 auto 24px; border-radius: 18px;
      border: 1px solid rgba(205,184,245,.28);
      background: linear-gradient(145deg, rgba(177,143,231,.2), rgba(255,255,255,.045));
      color: #d9c6ff; font-size: 25px;
      box-shadow: inset 0 1px rgba(255,255,255,.18), 0 12px 35px rgba(124,87,180,.12);
    }
    #hattz-maintenance-screen .maintenance-eyebrow {
      margin: 0 0 12px; color: #bda7df; font-size: 10px;
      font-weight: 700; letter-spacing: .24em; text-transform: uppercase;
    }
    #hattz-maintenance-screen h1 {
      margin: 0; font-family: "Cormorant Garamond", Georgia, serif;
      font-size: clamp(34px, 7vw, 48px); font-weight: 600; line-height: 1.05;
      letter-spacing: -.025em;
    }
    #hattz-maintenance-screen .maintenance-message {
      max-width: 390px; margin: 17px auto 0; color: rgba(244,240,250,.72);
      font-size: 14px; line-height: 1.8;
    }
    #hattz-maintenance-screen .maintenance-rule {
      width: 54px; height: 1px; margin: 30px auto 20px;
      background: linear-gradient(90deg, transparent, rgba(202,177,245,.75), transparent);
    }
    #hattz-maintenance-screen .maintenance-footer {
      color: rgba(230,220,245,.43); font-size: 9px;
      font-weight: 700; letter-spacing: .2em;
    }
  `;
  document.head.appendChild(style);

  async function checkMaintenance() {
    try {
      const url = new URL("./maintenance.json", window.location.href);
      url.searchParams.set("v", String(Date.now()));
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error("Maintenance config unavailable");
      const config = await response.json();

      if (config.enabled === true) {
        const screen = document.createElement("main");
        screen.id = "hattz-maintenance-screen";
        screen.setAttribute("role", "status");
        screen.setAttribute("aria-live", "polite");

        const panel = document.createElement("section");
        panel.className = "maintenance-panel";

        const mark = document.createElement("div");
        mark.className = "maintenance-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "✦";

        const eyebrow = document.createElement("p");
        eyebrow.className = "maintenance-eyebrow";
        eyebrow.textContent = "HÄTTZ · PERSONAL SPACE";

        const title = document.createElement("h1");
        title.textContent = typeof config.title === "string" && config.title.trim()
          ? config.title.slice(0, 90)
          : "Estamos preparando algo novo";

        const message = document.createElement("p");
        message.className = "maintenance-message";
        message.textContent = typeof config.message === "string" && config.message.trim()
          ? config.message.slice(0, 300)
          : "O Hättz está temporariamente em manutenção. Voltaremos em breve.";

        const rule = document.createElement("div");
        rule.className = "maintenance-rule";

        const footer = document.createElement("div");
        footer.className = "maintenance-footer";
        footer.textContent = "DESIGNED BY HÄTTZ";

        panel.append(mark, eyebrow, title, message, rule, footer);
        screen.appendChild(panel);
        document.body.appendChild(screen);
        document.body.style.overflow = "hidden";
      }
    } catch (error) {
      console.warn("[Hättz] Não foi possível consultar o modo de manutenção.", error);
    } finally {
      revealSite();
    }
  }

  checkMaintenance();
})();
