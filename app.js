(function () {
  "use strict";

  const STORAGE_KEY = "fortniteSpiritsOwned";
  const MASTERED_KEY = "fortniteSpiritsMastered";
  const USERNAME_KEY = "fortniteSpiritsUsername";
  const AVATAR_KEY = "fortniteSpiritsAvatar";
  const FRIENDS_KEY = "fortniteSpiritsFriends";
  const VARIANT_PREFIXES = [
    "Cube ",
    "Gold ",
    "Quack ",
    "Gummy ",
    "Galaxy ",
    "Gem ",
    "Holofoil ",
  ];
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

  const pageTitle = document.getElementById("pageTitle");
  const userForm = document.getElementById("userForm");
  const usernameInput = document.getElementById("usernameInput");
  const userGreeting = document.getElementById("userGreeting");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const editUserBtn = document.getElementById("editUserBtn");

  const avatarBtn = document.getElementById("avatarBtn");
  const avatarImg = document.getElementById("avatarImg");
  const avatarPlaceholder = document.getElementById("avatarPlaceholder");
  const avatarModal = document.getElementById("avatarModal");
  const avatarGrid = document.getElementById("avatarGrid");
  const avatarSearch = document.getElementById("avatarSearch");
  const avatarCloseBtn = document.getElementById("avatarCloseBtn");
  const avatarRemoveBtn = document.getElementById("avatarRemoveBtn");

  const viewMine = document.getElementById("viewMine");
  const viewFriends = document.getElementById("viewFriends");
  const addFriendForm = document.getElementById("addFriendForm");
  const friendInput = document.getElementById("friendInput");
  const friendsListEl = document.getElementById("friendsList");
  const friendsEmpty = document.getElementById("friendsEmpty");
  const tradeArea = document.getElementById("tradeArea");
  const tradeFriendName = document.getElementById("tradeFriendName");
  const removeFriendBtn = document.getElementById("removeFriendBtn");
  const tradeGrid = document.getElementById("tradeGrid");
  const tradeHint = document.getElementById("tradeHint");
  const countGive = document.getElementById("countGive");
  const countGet = document.getElementById("countGet");
  const countHis = document.getElementById("countHis");

  const SPRITE_BY_ID = new Map(SPRITES.map((s) => [s.id, s]));

  let owned = loadSet(STORAGE_KEY);
  let mastered = loadSet(MASTERED_KEY);
  let avatarId = localStorage.getItem(AVATAR_KEY) || "";
  let friends = loadFriends();
  let activeMode = "all"; // all | owned | missing
  let activeRarity = null; // null = todas
  let activeMastered = ""; // "" | yes | no
  let searchTerm = "";

  // Amigos: cache de datos traidos de la nube { usuario: {owned:Set, mastered:Set, avatar} }
  const friendCache = new Map();
  let activeFriend = null;
  let tradeMode = "give"; // give | get | his

  function loadFriends() {
    try {
      const raw = localStorage.getItem(FRIENDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFriends() {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  }

  // Agrupa los 117 espiritus en sus 25 familias (base + variantes)
  function buildGroups() {
    const groups = [];
    const byBase = new Map();
    SPRITES.forEach((sprite) => {
      let baseName = sprite.name;
      let variant = null;
      for (const p of VARIANT_PREFIXES) {
        if (sprite.name.startsWith(p)) {
          baseName = sprite.name.slice(p.length);
          variant = p.trim();
          break;
        }
      }
      let g = byBase.get(baseName);
      if (!g) {
        g = { baseName, base: null, variants: [] };
        byBase.set(baseName, g);
        groups.push(g);
      }
      if (variant === null) g.base = sprite;
      else g.variants.push({ variant, sprite });
    });
    return groups;
  }

  const SPRITE_GROUPS = buildGroups();

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

  // ---- Sincronización con la nube ----
  let cloudSaveTimer = null;

  function scheduleCloudSave() {
    const username = localStorage.getItem(USERNAME_KEY);
    if (!username || !window.FirebaseSync) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
      window.FirebaseSync
        .saveUserData(username, {
          owned: Array.from(owned),
          mastered: Array.from(mastered),
          avatar: avatarId,
          friends: friends,
          displayName: username,
        })
        .catch((err) => {
          console.error("No se pudo guardar en la nube", err);
          showToast("Sin conexión: guardado solo en este dispositivo");
        });
    }, 800);
  }

  function toggleOwned(id) {
    if (owned.has(id)) {
      owned.delete(id);
    } else {
      owned.add(id);
    }
    saveSet(STORAGE_KEY, owned);
    updateProgress();
    scheduleCloudSave();
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
    scheduleCloudSave();
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
          <button class="action-btn owned-toggle${isOwned ? " active" : ""}" aria-pressed="${isOwned ? "true" : "false"}" title="Marcar como obtenido">Obtenido</button>
          <button class="mastered-toggle${isMastered ? " active" : ""}" aria-pressed="${isMastered ? "true" : "false"}" title="Marcar como dominado">
            <img src="assets/img/crown.png" alt="Dominado" class="crown-icon">
          </button>
        </div>
      `;

      const iconWrap = card.querySelector(".icon-wrap");
      const img = iconWrap.querySelector("img");
      const masteredBtn = card.querySelector(".mastered-toggle");
      const ownedBtn = card.querySelector(".owned-toggle");

      function applyOwned() {
        toggleOwned(sprite.id);
        const isNowOwned = card.classList.toggle("owned");
        ownedBtn.classList.toggle("active", isNowOwned);
        ownedBtn.setAttribute("aria-pressed", isNowOwned ? "true" : "false");
        triggerBounce(img);
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
        triggerBounce(img);
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
      refreshCardStates();
      updateProgress();
      applyFilters();
      scheduleCloudSave();
      showToast("Progreso reiniciado");
    });

    exportBtn.addEventListener("click", exportAsJpg);
  }

  function whenFirebaseReady() {
    if (window.FirebaseSync) return Promise.resolve();
    return new Promise((resolve) => {
      window.addEventListener("firebase-sync-ready", () => resolve(), {
        once: true,
      });
      setTimeout(resolve, 6000); // no bloquear si la nube no carga
    });
  }

  // Trae el progreso guardado en la nube para ese nombre y lo aplica a la UI.
  // Si el usuario es nuevo en la nube, sube el progreso local como punto de partida.
  async function syncWithCloud(name) {
    await whenFirebaseReady();
    if (!window.FirebaseSync) return;

    try {
      const remote = await window.FirebaseSync.loadUserData(name);
      if (remote) {
        owned = new Set(remote.owned);
        mastered = new Set(remote.mastered);
        avatarId = remote.avatar || "";
        friends = remote.friends || [];
        saveSet(STORAGE_KEY, owned);
        saveSet(MASTERED_KEY, mastered);
        localStorage.setItem(AVATAR_KEY, avatarId);
        saveFriends();
        refreshCardStates();
        updateProgress();
        applyFilters();
        renderAvatar();
        renderFriendsList();
        showToast(`Progreso de ${name} cargado`);
      } else {
        await window.FirebaseSync.saveUserData(name, {
          owned: Array.from(owned),
          mastered: Array.from(mastered),
          avatar: avatarId,
          friends: friends,
          displayName: name,
        });
        showToast(`Cuenta creada para ${name}`);
      }
    } catch (err) {
      console.error("No se pudo sincronizar con la nube", err);
      showToast("Sin conexión: usando datos de este dispositivo");
    }
  }

  // Repinta el estado de todas las cards desde los sets actuales
  function refreshCardStates() {
    grid.querySelectorAll(".card").forEach((card) => {
      const id = card.dataset.id;
      const isOwned = owned.has(id);
      const isMastered = mastered.has(id);
      card.classList.toggle("owned", isOwned);
      card.classList.toggle("mastered", isMastered);

      const ob = card.querySelector(".owned-toggle");
      const mb = card.querySelector(".mastered-toggle");
      if (ob) {
        ob.classList.toggle("active", isOwned);
        ob.setAttribute("aria-pressed", isOwned ? "true" : "false");
      }
      if (mb) {
        mb.classList.toggle("active", isMastered);
        mb.setAttribute("aria-pressed", isMastered ? "true" : "false");
      }
    });
  }

  function setupUser() {
    const saved = localStorage.getItem(USERNAME_KEY);
    if (saved) {
      showGreeting(saved);
      syncWithCloud(saved);
    } else {
      showUserForm();
    }

    userForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = usernameInput.value.trim();
      if (!name) return;
      localStorage.setItem(USERNAME_KEY, name);
      showGreeting(name);
      syncWithCloud(name);
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
    pageTitle.textContent = name;
  }

  function showUserForm() {
    userForm.classList.remove("hidden");
    userGreeting.classList.add("hidden");
  }

  // ---------- Foto de perfil ----------

  function renderAvatar() {
    const sprite = avatarId ? SPRITE_BY_ID.get(avatarId) : null;
    if (sprite) {
      avatarImg.src = sprite.icon;
      avatarImg.classList.remove("hidden");
      avatarPlaceholder.classList.add("hidden");
    } else {
      avatarImg.removeAttribute("src");
      avatarImg.classList.add("hidden");
      avatarPlaceholder.classList.remove("hidden");
    }
  }

  function setAvatar(id) {
    avatarId = id || "";
    localStorage.setItem(AVATAR_KEY, avatarId);
    renderAvatar();
    scheduleCloudSave();
  }

  function renderAvatarOptions(filter) {
    const term = (filter || "").trim().toLowerCase();
    const frag = document.createDocumentFragment();
    SPRITES.filter((s) => !term || s.name.toLowerCase().includes(term)).forEach(
      (sprite) => {
        const btn = document.createElement("button");
        btn.className =
          "avatar-option" + (sprite.id === avatarId ? " selected" : "");
        btn.title = sprite.name;
        btn.innerHTML = `<img src="${sprite.icon}" alt="${sprite.name}" loading="lazy">`;
        btn.addEventListener("click", () => {
          setAvatar(sprite.id);
          closeAvatarModal();
          showToast("Foto de perfil actualizada");
        });
        frag.appendChild(btn);
      }
    );
    avatarGrid.innerHTML = "";
    avatarGrid.appendChild(frag);
  }

  function openAvatarModal() {
    avatarSearch.value = "";
    renderAvatarOptions("");
    avatarModal.classList.remove("hidden");
  }

  function closeAvatarModal() {
    avatarModal.classList.add("hidden");
  }

  function setupAvatar() {
    renderAvatar();
    avatarBtn.addEventListener("click", openAvatarModal);
    avatarCloseBtn.addEventListener("click", closeAvatarModal);
    avatarModal.addEventListener("click", (e) => {
      if (e.target === avatarModal) closeAvatarModal();
    });
    avatarSearch.addEventListener("input", () =>
      renderAvatarOptions(avatarSearch.value)
    );
    avatarRemoveBtn.addEventListener("click", () => {
      setAvatar("");
      closeAvatarModal();
      showToast("Foto de perfil quitada");
    });
  }

  // ---------- Amigos e intercambios ----------

  function setupTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const isMine = tab.dataset.view === "mine";
        viewMine.classList.toggle("hidden", !isMine);
        viewFriends.classList.toggle("hidden", isMine);
      });
    });
  }

  function renderFriendsList() {
    friendsListEl.innerHTML = "";
    friends.forEach((name) => {
      const chip = document.createElement("button");
      chip.className = "friend-chip" + (name === activeFriend ? " active" : "");
      const cached = friendCache.get(name);
      const avatarSprite =
        cached && cached.avatar ? SPRITE_BY_ID.get(cached.avatar) : null;
      chip.innerHTML = avatarSprite
        ? `<img src="${avatarSprite.icon}" alt=""><span>${name}</span>`
        : `<span class="friend-initial">${name.charAt(0).toUpperCase()}</span><span>${name}</span>`;
      chip.addEventListener("click", () => selectFriend(name));
      friendsListEl.appendChild(chip);
    });

    const hasFriends = friends.length > 0;
    friendsEmpty.classList.toggle("hidden", hasFriends);
    if (!hasFriends) {
      tradeArea.classList.add("hidden");
      activeFriend = null;
    }
  }

  async function addFriend(rawName) {
    const name = rawName.trim();
    if (!name) return;

    const me = localStorage.getItem(USERNAME_KEY);
    const norm = (n) =>
      window.FirebaseSync
        ? window.FirebaseSync.normalizeUsername(n)
        : n.trim().toLowerCase();

    if (me && norm(name) === norm(me)) {
      showToast("Ese eres tú");
      return;
    }
    if (friends.some((f) => norm(f) === norm(name))) {
      showToast(`${name} ya está en tu lista`);
      selectFriend(friends.find((f) => norm(f) === norm(name)));
      return;
    }

    await whenFirebaseReady();
    if (!window.FirebaseSync) {
      showToast("Sin conexión: no se puede buscar amigos");
      return;
    }

    showToast(`Buscando a ${name}...`);
    try {
      const data = await window.FirebaseSync.loadUserData(name);
      if (!data) {
        showToast(`No existe un jugador llamado "${name}"`);
        return;
      }
      friends.push(name);
      saveFriends();
      friendCache.set(name, {
        owned: new Set(data.owned),
        mastered: new Set(data.mastered),
        avatar: data.avatar,
      });
      scheduleCloudSave();
      renderFriendsList();
      selectFriend(name);
      showToast(`${name} agregado`);
    } catch (err) {
      console.error(err);
      showToast("No se pudo buscar a ese jugador");
    }
  }

  function removeFriend(name) {
    friends = friends.filter((f) => f !== name);
    friendCache.delete(name);
    saveFriends();
    scheduleCloudSave();
    if (activeFriend === name) {
      activeFriend = null;
      tradeArea.classList.add("hidden");
    }
    renderFriendsList();
    showToast(`${name} eliminado`);
  }

  async function selectFriend(name) {
    activeFriend = name;
    renderFriendsList();
    tradeFriendName.textContent = name;
    tradeArea.classList.remove("hidden");
    friendsEmpty.classList.add("hidden");

    if (!friendCache.has(name)) {
      tradeGrid.innerHTML = "";
      tradeHint.textContent = "Cargando espíritus...";
      await whenFirebaseReady();
      try {
        const data = await window.FirebaseSync.loadUserData(name);
        if (!data) {
          tradeHint.textContent = "No se encontró a ese jugador.";
          return;
        }
        friendCache.set(name, {
          owned: new Set(data.owned),
          mastered: new Set(data.mastered),
          avatar: data.avatar,
        });
        renderFriendsList();
      } catch (err) {
        console.error(err);
        tradeHint.textContent = "No se pudo cargar su lista.";
        return;
      }
    }
    renderTrade();
  }

  function getTradeLists() {
    const f = friendCache.get(activeFriend);
    if (!f) return { give: [], get: [], his: [] };
    const give = SPRITES.filter((s) => owned.has(s.id) && !f.owned.has(s.id));
    const get = SPRITES.filter((s) => !owned.has(s.id) && f.owned.has(s.id));
    const his = SPRITES.filter((s) => f.owned.has(s.id));
    return { give, get, his };
  }

  function renderTrade() {
    if (!activeFriend || !friendCache.has(activeFriend)) return;
    const lists = getTradeLists();
    countGive.textContent = lists.give.length;
    countGet.textContent = lists.get.length;
    countHis.textContent = lists.his.length;

    const hints = {
      give: `Espíritus que tú tienes y a ${activeFriend} le faltan.`,
      get: `Espíritus que ${activeFriend} tiene y a ti te faltan.`,
      his: `Todos los espíritus de ${activeFriend}.`,
    };
    tradeHint.textContent = hints[tradeMode];

    const list = lists[tradeMode];
    tradeGrid.innerHTML = "";

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent =
        tradeMode === "give"
          ? `${activeFriend} ya tiene todo lo que tú tienes.`
          : tradeMode === "get"
          ? `No tiene nada que a ti te falte.`
          : `${activeFriend} todavía no tiene espíritus.`;
      tradeGrid.appendChild(empty);
      return;
    }

    const friendData = friendCache.get(activeFriend);
    const frag = document.createDocumentFragment();
    list.forEach((sprite) => {
      const card = document.createElement("div");
      card.className = "card owned";
      card.dataset.rarity = sprite.rarity;
      const isMasteredByFriend = friendData.mastered.has(sprite.id);
      card.innerHTML = `
        ${
          tradeMode === "his" && isMasteredByFriend
            ? `<div class="trade-badge"><img src="assets/img/crown.png" alt="Dominado"></div>`
            : ""
        }
        <div class="icon-wrap">
          <img src="${sprite.icon}" alt="${sprite.name}" loading="lazy">
        </div>
        <div class="name">${sprite.name}</div>
      `;
      frag.appendChild(card);
    });
    tradeGrid.appendChild(frag);
  }

  function setupFriends() {
    renderFriendsList();

    addFriendForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = friendInput.value.trim();
      friendInput.value = "";
      addFriend(name);
    });

    removeFriendBtn.addEventListener("click", () => {
      if (!activeFriend) return;
      if (!confirm(`¿Quitar a ${activeFriend} de tus amigos?`)) return;
      removeFriend(activeFriend);
    });

    document.querySelectorAll(".trade-tabs .chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".trade-tabs .chip")
          .forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        tradeMode = btn.dataset.trade;
        renderTrade();
      });
    });
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
      // Una celda por familia de espíritu (25) en vez de una por variante (117)
      const cols = 5;
      const cellW = 348;
      const cellH = 224;
      const iconSize = 104;
      const padding = 34;
      const username = localStorage.getItem(USERNAME_KEY);
      const headerH = username ? 205 : 175;
      const rows = Math.ceil(SPRITE_GROUPS.length / cols);

      const canvas = document.getElementById("exportCanvas");
      canvas.width = padding * 2 + cols * cellW;
      canvas.height = headerH + rows * cellH + padding;
      const ctx = canvas.getContext("2d");
      const cx = canvas.width / 2;

      const [heroBgImg, crownImg, avatarSpriteImg, ...images] = await Promise.all([
        loadImage("assets/img/export-bg.webp"),
        loadImage("assets/img/crown.png"),
        avatarId && SPRITE_BY_ID.get(avatarId)
          ? loadImage(SPRITE_BY_ID.get(avatarId).icon)
          : Promise.resolve(null),
        ...SPRITES.map((s) => loadImage(s.icon)),
      ]);
      const imageById = new Map(SPRITES.map((s, i) => [s.id, images[i]]));
      await document.fonts.ready;

      // Background image + light dark overlay for legibility
      if (heroBgImg) drawCoverImage(ctx, heroBgImg, canvas.width, canvas.height);
      const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
      overlay.addColorStop(0, "rgba(6,7,12,0.25)");
      overlay.addColorStop(0.3, "rgba(7,8,14,0.35)");
      overlay.addColorStop(1, "rgba(7,8,14,0.5)");
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
        const nameW = ctx.measureText(username).width;
        if (avatarSpriteImg) {
          // Foto de perfil a la izquierda del nombre
          const av = 30;
          const avX = cx - nameW / 2 - av - 8;
          ctx.save();
          ctx.beginPath();
          ctx.arc(avX + av / 2, 66 + av / 2 - 4, av / 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.10)";
          ctx.fill();
          ctx.clip();
          ctx.drawImage(avatarSpriteImg, avX, 66 - 4, av, av);
          ctx.restore();
        }
        ctx.fillStyle = "#c9befe";
        ctx.fillText(username, cx, 66);
        statsY = 104;
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

      SPRITE_GROUPS.forEach((group, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padding + col * cellW;
        const y = headerH + row * cellH;

        const base = group.base;
        const baseOwned = owned.has(base.id);
        const baseMastered = mastered.has(base.id);

        // Panel de la familia
        ctx.fillStyle = "rgba(10,12,22,0.42)";
        roundRect(ctx, x + 6, y, cellW - 14, cellH - 14, 16);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        roundRect(ctx, x + 6, y, cellW - 14, cellH - 14, 16);
        ctx.stroke();

        // Icono del espíritu principal (izquierda)
        const iconX = x + 20;
        const iconY = y + 16;
        const img = imageById.get(base.id);
        if (img) {
          if (!baseOwned) {
            ctx.save();
            ctx.filter = "grayscale(1) brightness(0.5)";
            ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
            ctx.restore();
          } else {
            ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
          }
        }

        // Corona si el principal está dominado
        if (baseMastered && crownImg) {
          const bx = iconX + 6;
          const by = iconY + 6;
          ctx.beginPath();
          ctx.arc(bx, by, 11, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(20,23,38,0.92)";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#f5c518";
          ctx.stroke();
          ctx.drawImage(crownImg, bx - 7, by - 7, 14, 14);
        }

        // Nombre + punto de rareza (derecha del icono)
        const textX = iconX + iconSize + 14;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = "400 27px 'Fortnite', -apple-system, Arial, sans-serif";
        ctx.fillStyle = baseOwned ? "#ffffff" : "rgba(255,255,255,0.55)";
        ctx.fillText(group.baseName, textX, iconY + 2);

        ctx.beginPath();
        ctx.arc(textX + 6, iconY + 40, 5, 0, Math.PI * 2);
        ctx.fillStyle = RARITY_COLOR[base.rarity] || "#9095b0";
        ctx.fill();
        ctx.font = "700 12px 'Fortnite', -apple-system, Arial, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(
          (RARITY_LABEL_ES[base.rarity] || base.rarity).toUpperCase(),
          textX + 17,
          iconY + 33
        );

        // Checkbox del principal
        drawCheck(ctx, textX, iconY + 56, baseOwned);
        ctx.font = "700 13px 'Fortnite', -apple-system, Arial, sans-serif";
        ctx.fillStyle = baseOwned ? "#ffffff" : "rgba(255,255,255,0.5)";
        ctx.fillText("Base", textX + 26, iconY + 59);

        // Variantes como checkmarks debajo
        const chipY0 = y + iconSize + 30;
        const chipW = 100;
        const chipH = 26;
        const perRow = 3;
        group.variants.forEach((v, vi) => {
          const cRow = Math.floor(vi / perRow);
          const cCol = vi % perRow;
          const chipX = x + 18 + cCol * (chipW + 6);
          const chipYy = chipY0 + cRow * (chipH + 5);
          const vOwned = owned.has(v.sprite.id);
          const vMastered = mastered.has(v.sprite.id);

          ctx.fillStyle = vOwned
            ? "rgba(53,208,127,0.22)"
            : "rgba(255,255,255,0.05)";
          roundRect(ctx, chipX, chipYy, chipW, chipH, 13);
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = vMastered
            ? "#f5c518"
            : vOwned
            ? "rgba(53,208,127,0.75)"
            : "rgba(255,255,255,0.16)";
          roundRect(ctx, chipX, chipYy, chipW, chipH, 13);
          ctx.stroke();

          drawCheck(ctx, chipX + 5, chipYy + 4, vOwned, 18);

          ctx.font = "700 12px 'Fortnite', -apple-system, Arial, sans-serif";
          ctx.fillStyle = vOwned ? "#ffffff" : "rgba(255,255,255,0.5)";
          ctx.fillText(v.variant.toUpperCase(), chipX + 27, chipYy + 8);

          if (vMastered && crownImg) {
            ctx.drawImage(crownImg, chipX + chipW - 17, chipYy + 6, 13, 13);
          }
        });
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

  // Casilla marcada / vacía usada en la imagen exportada
  function drawCheck(ctx, x, y, checked, size) {
    const s = size || 20;
    if (checked) {
      ctx.fillStyle = "#35d07f";
      roundRect(ctx, x, y, s, s, s * 0.26);
      ctx.fill();
      ctx.strokeStyle = "#06210f";
      ctx.lineWidth = s * 0.13;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x + s * 0.22, y + s * 0.52);
      ctx.lineTo(x + s * 0.42, y + s * 0.73);
      ctx.lineTo(x + s * 0.79, y + s * 0.27);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(10,12,20,0.5)";
      roundRect(ctx, x, y, s, s, s * 0.26);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255,255,255,0.38)";
      roundRect(ctx, x, y, s, s, s * 0.26);
      ctx.stroke();
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
    setupTabs();
    setupAvatar();
    setupFriends();
    setupUser();
    updateProgress();
    applyFilters();
  }

  init();
})();
