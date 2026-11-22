(() => {
  "use strict";
  const open = document.querySelector("#openLetter");
  const letter = document.querySelector("#carta");
  const surprise = document.querySelector("#surpriseButton");
  const message = document.querySelector("#surpriseMessage");
  const gift = document.querySelector("#gift");

  open?.addEventListener("click", () => {
    letter?.scrollIntoView({behavior:"smooth", block:"start"});
  });

  surprise?.addEventListener("click", () => {
    if (!message) return;
    const showing = !message.hidden;
    message.hidden = showing;
    surprise.setAttribute("aria-expanded", String(!showing));
    const label = surprise.querySelector("span");
    if (label) label.textContent = showing ? "＋" : "−";
  });

  gift?.addEventListener("click", () => {
    gift.classList.toggle("opened");
  });
})();