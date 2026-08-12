(function () {
  "use strict";

  const STORAGE_KEY = "fortniteSpiritsOwned";
  const MASTERED_KEY = "fortniteSpiritsMastered";
  const USERNAME_KEY = "fortniteSpiritsUsername";
  const RARITY_ORDER = ["MYTHIC", "LEGENDARY", "EPIC", "RARE", "SPECIAL"];
  const RARITY_LABEL_ES = {
    MYTHIC: "Mítico",
    LEGENDARY: "Legendario",
    EPIC: "Épico",
    RARE: "Raro",
    SPECIAL: "Especial",
  };
  const RARITY_COLOR = {
    MYTHIC: "#f2678d",
    LEGENDARY: "#ff9f45",
    EPIC: "#b866ff",
    RARE: "#4da3ff",
    SPECIAL: "#ffd447",
  };

  const grid = document.getElementById("grid");
  const ownedCountEl = document.getElementById("ownedCount");
  const totalCountEl = document.getElementById("totalCount");
  const progressFill = document.getElementById("progressFill");
  const masteredCountEl = document.getElementById("masteredCount");
  const totalCountMasteredEl = document.getElementById("totalCountMastered");
  const progressFillMastered = document.getElementById("progressFillMastered");
  const searchInput = document.getElementById("searchInput");
  const rarityFilterEl = document.getElementById("rarityFilter");
  const masteredFilterEl = document.getElementById("masteredFilter");
  const toastEl = document.getElementById("toast");
  const exportBtn = document.getElementById("exportBtn");
  const resetBtn = document.getElementById("resetBtn");

  const userForm = document.getElementById("userForm");
  const usernameInput = document.getElementById("usernameInput");
  const userGreeting = document.getElementById("userGreeting");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const editUserBtn = document.getElementById("editUserBtn");

  let owned = loadSet(STORAGE_KEY);
  let mastered = loadSet(MASTERED_KEY);
  let activeMode = "all"; // all | owned | missing
  let activeRarity = null; // null = todas
  let activeMastered = ""; // "" | yes | no
  let searchTerm = "";

  function loadSet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function saveSet(key, set) {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  }

  function toggleOwned(id) {
    if (owned.has(id)) {
      owned.delete(id);
    } else {
      owned.add(id);
    }
    saveSet(STORAGE_KEY, owned);
    updateProgress();
  }

  function toggleMastered(id) {
    if (mastered.has(id)) {
      mastered.delete(id);
    } else {
      mastered.add(id);
      owned.add(id); // dominar implica tenerlo
      saveSet(STORAGE_KEY, owned);
    }
    saveSet(MASTERED_KEY, mastered);
    updateProgress();
  }

  function updateProgress() {
    ownedCountEl.textContent = owned.size;
    totalCountEl.textContent = SPRITES.length;
    const pct = SPRITES.length ? (owned.size / SPRITES.length) * 100 : 0;
    progressFill.style.width = pct.toFixed(1) + "%";

    masteredCountEl.textContent = mastered.size;
    totalCountMasteredEl.textContent = SPRITES.length;
    const pctM = SPRITES.length ? (mastered.size / SPRITES.length) * 100 : 0;
    progressFillMastered.style.width = pctM.toFixed(1) + "%";
  }

  function buildRarityFilter() {
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Todas las rarezas";
    rarityFilterEl.appendChild(optAll);

    RARITY_ORDER.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = RARITY_LABEL_ES[r] || r;
      rarityFilterEl.appendChild(opt);
    });

    rarityFilterEl.addEventListener("change", () => {
      activeRarity = rarityFilterEl.value || null;
      applyFilters();
    });

    masteredFilterEl.addEventListener("change", () => {
      activeMastered = masteredFilterEl.value;
      applyFilters();
    });
  }

  function buildCards() {
    const frag = document.createDocumentFragment();
    SPRITES.forEach((sprite) => {
      const isOwned = owned.has(sprite.id);
      const isMastered = mastered.has(sprite.id);

      const card = document.createElement("div");
      card.className = "card" + (isOwned ? " owned" : "") + (isMastered ? " mastered" : "");
      card.dataset.id = sprite.id;
      card.dataset.rarity = sprite.rarity;
      card.dataset.name = sprite.name.toLowerCase();

      card.innerHTML = `
        <div class="icon-wrap">
          <img src="${sprite.icon}" alt="${sprite.name}" loading="lazy">
        </div>
        <div class="name">${sprite.name}</div>
        <div class="card-actions">
          <button class="action-btn mastered-toggle${isMastered ? " active" : ""}" aria-pressed="${isMastered ? "true" : "false"}" title="Marcar como dominado">★ Dominado</button>
          <button class="action-btn owned-toggle${isOwned ? " active" : ""}" aria-pressed="${isOwned ? "true" : "false"}" title="Marcar como obtenido">Obtenido</button>
        </div>
      `;

      const iconWrap = card.querySelector(".icon-wrap");
      const masteredBtn = card.querySelector(".mastered-toggle");
      const ownedBtn = card.querySelector(".owned-toggle");

      function applyOwned() {
        toggleOwned(sprite.id);
        const isNowOwned = card.classList.toggle("owned");
        ownedBtn.classList.toggle("active", isNowOwned);
        ownedBtn.setAttribute("aria-pressed", isNowOwned ? "true" : "false");
        triggerBounce(iconWrap);
        applyFilters();
      }

      iconWrap.addEventListener("click", applyOwned);
      ownedBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        applyOwned();
      });

      masteredBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMastered(sprite.id);
        const isNowMastered = card.classList.toggle("mastered");
        masteredBtn.classList.toggle("active", isNowMastered);
        masteredBtn.setAttribute("aria-pressed", isNowMastered ? "true" : "false");
        if (isNowMastered && !card.classList.contains("owned")) {
          card.classList.add("owned");
          ownedBtn.classList.add("active");
          ownedBtn.setAttribute("aria-pressed", "true");
        }
        triggerBounce(iconWrap);
        applyFilters();
      });

      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function triggerBounce(el) {
    el.classList.remove("bounce");
    // eslint-disable-next-line no-unused-expressions
    void el.offsetWidth; // reinicia la animación
    el.classList.add("bounce");
    el.addEventListener(
      "animationend",
      () => el.classList.remove("bounce"),
      { once: true }
    );
  }

  function applyFilters() {
    const cards = grid.querySelectorAll(".card");
    let visibleCount = 0;
    cards.forEach((card) => {
      const isOwned = card.classList.contains("owned");
      const isMastered = card.classList.contains("mastered");
      let visible = true;

      if (activeMode === "owned" && !isOwned) visible = false;
      if (activeMode === "missing" && isOwned) visible = false;
      if (activeRarity && card.dataset.rarity !== activeRarity) visible = false;
      if (activeMastered === "yes" && !isMastered) visible = false;
      if (activeMastered === "no" && isMastered) visible = false;
      if (searchTerm && !card.dataset.name.includes(searchTerm)) visible = false;

      card.classList.toggle("hidden", !visible);
      if (visible) visibleCount++;
    });

    let emptyState = grid.querySelector(".empty-state");
    if (visibleCount === 0) {
      if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.textContent = "No se encontraron espíritus con esos filtros.";
        grid.appendChild(emptyState);
      }
    } else if (emptyState) {
      emptyState.remove();
    }
  }

  function setupControls() {
    searchInput.addEventListener("input", () => {
      searchTerm = searchInput.value.trim().toLowerCase();
      applyFilters();
    });

    document.querySelectorAll(".toggle-row .chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".toggle-row .chip")
          .forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        activeMode = btn.dataset.mode;
        applyFilters();
      });
    });

    resetBtn.addEventListener("click", () => {
      if (!confirm("¿Seguro que quieres reiniciar todo el progreso?")) return;
      owned.clear();
      mastered.clear();
      saveSet(STORAGE_KEY, owned);
      saveSet(MASTERED_KEY, mastered);
      grid.querySelectorAll(".card").forEach((card) => {
        card.classList.remove("owned", "mastered");
        const mb = card.querySelector(".mastered-toggle");
        const ob = card.querySelector(".owned-toggle");
        if (mb) {
          mb.classList.remove("active");
          mb.setAttribute("aria-pressed", "false");
        }
        if (ob) {
          ob.classList.remove("active");
          ob.setAttribute("aria-pressed", "false");
        }
      });
      updateProgress();
      applyFilters();
      showToast("Progreso reiniciado");
    });

    exportBtn.addEventListener("click", exportAsJpg);
  }

  function setupUser() {
    const saved = localStorage.getItem(USERNAME_KEY);
    if (saved) {
      showGreeting(saved);
    } else {
      showUserForm();
    }

    userForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = usernameInput.value.trim();
      if (!name) return;
      localStorage.setItem(USERNAME_KEY, name);
      showGreeting(name);
    });

    editUserBtn.addEventListener("click", () => {
      usernameInput.value = localStorage.getItem(USERNAME_KEY) || "";
      showUserForm();
      usernameInput.focus();
    });
  }

  function showGreeting(name) {
    userNameDisplay.textContent = name;
    userGreeting.classList.remove("hidden");
    userForm.classList.add("hidden");
  }

  function showUserForm() {
    userForm.classList.remove("hidden");
    userGreeting.classList.add("hidden");
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function drawCoverImage(ctx, img, cw, ch) {
    const scale = Math.max(cw / img.width, ch / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function drawStatBlock(ctx, centerX, y, value, total, label) {
    ctx.textAlign = "center";
    ctx.font = "800 38px 'Fortnite', -apple-system, Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${value}/${total}`, centerX, y);
    ctx.font = "700 13px 'Fortnite', -apple-system, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(label, centerX, y + 32);
    ctx.textAlign = "left";
  }

  async function exportAsJpg() {
    exportBtn.disabled = true;
    exportBtn.querySelector(".label").textContent = "Generando...";

    try {
      const cols = 18;
      const cellW = 100;
      const cellH = 130;
      const iconSize = 78;
      const padding = 32;
      const username = localStorage.getItem(USERNAME_KEY);
      const headerH = username ? 205 : 175;
      const rows = Math.ceil(SPRITES.length / cols);

      const canvas = document.getElementById("exportCanvas");
      canvas.width = padding * 2 + cols * cellW;
      canvas.height = headerH + rows * cellH + padding;
      const ctx = canvas.getContext("2d");
      const cx = canvas.width / 2;

      const [heroBgImg, ...images] = await Promise.all([
        loadImage("assets/img/hero-bg.webp"),
        ...SPRITES.map((s) => loadImage(s.icon)),
      ]);
      await document.fonts.ready;

      // Background photo + dark overlay
      if (heroBgImg) drawCoverImage(ctx, heroBgImg, canvas.width, canvas.height);
      const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
      overlay.addColorStop(0, "rgba(6,7,12,0.6)");
      overlay.addColorStop(0.3, "rgba(7,8,14,0.78)");
      overlay.addColorStop(1, "rgba(7,8,14,0.9)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Title
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.font = "800 30px 'Fortnite', -apple-system, Arial, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("MIS ESPÍRITUS · FORTNITE", cx, 28);

      let statsY = 78;
      if (username) {
        ctx.font = "600 15px 'Fortnite', -apple-system, Arial, sans-serif";
        ctx.fillStyle = "#c9befe";
        ctx.fillText(`Jugador: ${username}`, cx, 66);
        statsY = 100;
      }

      // Stat blocks (conseguidos / dominados)
      const gap = 130;
      drawStatBlock(ctx, cx - gap, statsY, owned.size, SPRITES.length, "CONSEGUIDOS");
      drawStatBlock(ctx, cx + gap, statsY, mastered.size, SPRITES.length, "DOMINADOS");

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, statsY - 6);
      ctx.lineTo(cx, statsY + 46);
      ctx.stroke();

      ctx.textAlign = "left";

      SPRITES.forEach((sprite, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padding + col * cellW;
        const y = headerH + row * cellH;
        const isOwned = owned.has(sprite.id);
        const isMastered = mastered.has(sprite.id);

        const iconX = x + (cellW - iconSize) / 2;
        const iconY = y;

        // Icon
        const img = images[i];
        if (img) {
          if (!isOwned) {
            ctx.save();
            ctx.filter = "grayscale(1) brightness(0.5)";
            ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
            ctx.restore();
          } else {
            ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
          }
        }

        // Rarity dot (top-right of icon)
        ctx.beginPath();
        ctx.arc(iconX + iconSize - 4, iconY + 4, 4, 0, Math.PI * 2);
        ctx.fillStyle = RARITY_COLOR[sprite.rarity] || "#9095b0";
        ctx.fill();

        // Mastered star badge (top-left of icon)
        if (isMastered) {
          const starX = iconX + 2;
          const starY = iconY + 2;
          ctx.beginPath();
          ctx.arc(starX, starY, 9, 0, Math.PI * 2);
          ctx.fillStyle = "#f5c518";
          ctx.fill();
          ctx.font = "bold 10px 'Fortnite', -apple-system, Arial, sans-serif";
          ctx.fillStyle = "#2a1f00";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("★", starX, starY + 1);
          ctx.textBaseline = "top";
          ctx.textAlign = "left";
        }

        // Checkbox below icon
        const checkSize = 20;
        const checkX = x + cellW / 2 - checkSize / 2;
        const checkY = iconY + iconSize + 8;
        if (isOwned) {
          ctx.fillStyle = "#35d07f";
          roundRect(ctx, checkX, checkY, checkSize, checkSize, 5);
          ctx.fill();
          ctx.strokeStyle = "#06210f";
          ctx.lineWidth = 2.4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(checkX + 4, checkY + 10);
          ctx.lineTo(checkX + 8, checkY + 14.5);
          ctx.lineTo(checkX + 16, checkY + 5);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(10,12,20,0.55)";
          roundRect(ctx, checkX, checkY, checkSize, checkSize, 5);
          ctx.fill();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          roundRect(ctx, checkX, checkY, checkSize, checkSize, 5);
          ctx.stroke();
        }
      });

      canvas.toBlob(
        (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const fname = `espiritus-fortnite-${new Date()
            .toISOString()
            .slice(0, 10)}.jpg`;
          a.href = url;
          a.download = fname;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          showToast("Imagen exportada ✅");
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error(err);
      showToast("Error al exportar la imagen");
    } finally {
      exportBtn.disabled = false;
      exportBtn.querySelector(".label").textContent = "Comparte";
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function init() {
    totalCountEl.textContent = SPRITES.length;
    totalCountMasteredEl.textContent = SPRITES.length;
    buildRarityFilter();
    buildCards();
    setupControls();
    setupUser();
    updateProgress();
    applyFilters();
  }

  init();
})();
