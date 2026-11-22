(() => {
  "use strict";
  const begin = document.querySelector("#beginButton");
  const letter = document.querySelector("#letter");
  const back = document.querySelector("#backTop");
  const panel = document.querySelector("#notePanel");
  const note = document.querySelector("#noteText");
  const close = document.querySelector("#closeNote");
  const cards = [...document.querySelectorAll(".moment-card")];
  const candle = document.querySelector("#candleButton");
  const flame = document.querySelector("#flame");
  const cakeHint = document.querySelector("#cakeHint");

  begin?.addEventListener("click", () => letter?.scrollIntoView({behavior:"smooth",block:"start"}));
  candle?.addEventListener("click", () => {
    const isOut = candle.classList.toggle("is-out");
    candle.setAttribute("aria-label", isOut ? "Acender a vela" : "Apagar a vela");
    if (flame) flame.setAttribute("aria-hidden", String(isOut));
    if (cakeHint) cakeHint.innerHTML = isOut
      ? "pedido feito. que esse ano seja lindo <span>♡</span>"
      : "faz um pedido e apaga a vela <span>↗</span>";
  });
  back?.addEventListener("click", () => window.scrollTo({top:0,behavior:"smooth"}));

  cards.forEach(card => card.addEventListener("click", () => {
    if (!panel || !note) return;
    note.textContent = card.dataset.note || "";
    panel.hidden = false;
    cards.forEach(item => item.setAttribute("aria-pressed", String(item === card)));
    panel.scrollIntoView({behavior:"smooth",block:"nearest"});
  }));
  close?.addEventListener("click", () => {
    if (panel) panel.hidden = true;
    cards.forEach(card => card.setAttribute("aria-pressed","false"));
  });

  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, current) => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); current.unobserve(entry.target); }
    }), {threshold:.12});
    items.forEach(item => observer.observe(item));
  } else items.forEach(item => item.classList.add("visible"));
})();