const text = {
  importPrompt: "\u628a\u52a8\u6f2b\u6587\u4ef6\u62d6\u8fdb\u6765\uff0c\u6216\u8005\u70b9\u53f3\u4e0a\u89d2 + \u5bfc\u5165\u3002",
  importHelp: "\u652f\u6301\u6d4f\u89c8\u5668\u80fd\u64ad\u653e\u7684 MP4\u3001WebM\u3001MKV \u7b49\u683c\u5f0f\uff1b\u6240\u6709\u5185\u5bb9\u53ea\u5728\u672c\u673a\u4f7f\u7528\u3002",
  noSelection: "\u8fd8\u6ca1\u6709\u9009\u62e9\u5267\u96c6",
  removeConfirm: "\u786e\u5b9a\u4ece\u7247\u5355\u79fb\u9664\u5f53\u524d\u5267\u96c6\u5417\uff1f\u672c\u5730\u539f\u89c6\u9891\u6587\u4ef6\u4e0d\u4f1a\u88ab\u5220\u9664\u3002",
  needsFile: "\u8fd9\u4e2a\u5267\u96c6\u9700\u8981\u91cd\u65b0\u5bfc\u5165\u539f\u89c6\u9891\u6587\u4ef6",
  reimport: "\u6d4f\u89c8\u5668\u4e0d\u4f1a\u6c38\u4e45\u4fdd\u5b58\u5927\u89c6\u9891\u6587\u4ef6\uff0c\u8bf7\u518d\u6b21\u5bfc\u5165\uff1a",
  emptyFiltered: "\u6ca1\u6709\u5339\u914d\u7684\u5267\u96c6\u3002",
  emptyLibrary: "\u7247\u5355\u8fd8\u662f\u7a7a\u7684\u3002\u5bfc\u5165\u4e00\u4e9b\u89c6\u9891\u5f00\u59cb\u770b\u5427\u3002",
  unknownSize: "\u672a\u77e5\u5927\u5c0f",
  statuses: {
    watching: "\u8ffd\u756a\u4e2d",
    done: "\u5df2\u770b\u5b8c",
    planned: "\u60f3\u770b"
  }
};

const storageKey = "anime-shelf-library";
const sessionFiles = new Map();

const state = {
  episodes: loadLibrary(),
  currentId: null,
  filter: "all",
  query: ""
};

const els = {
  videoInput: document.querySelector("#videoInput"),
  coverInput: document.querySelector("#coverInput"),
  player: document.querySelector("#player"),
  emptyPlayer: document.querySelector("#emptyPlayer"),
  currentTitle: document.querySelector("#currentTitle"),
  removeCurrent: document.querySelector("#removeCurrent"),
  titleEdit: document.querySelector("#titleEdit"),
  statusSelect: document.querySelector("#statusSelect"),
  saveMeta: document.querySelector("#saveMeta"),
  searchInput: document.querySelector("#searchInput"),
  episodeList: document.querySelector("#episodeList"),
  episodeTemplate: document.querySelector("#episodeTemplate"),
  libraryCount: document.querySelector("#libraryCount"),
  dropZone: document.querySelector("#dropZone"),
  filterButtons: document.querySelectorAll("[data-filter]")
};

render();

els.videoInput.addEventListener("change", event => {
  addVideos([...event.target.files]);
  event.target.value = "";
});

els.coverInput.addEventListener("change", async event => {
  const file = event.target.files[0];
  if (file && state.currentId) {
    await setCover(state.currentId, file);
  }
  event.target.value = "";
});

els.player.addEventListener("timeupdate", () => {
  const episode = getCurrentEpisode();
  if (!episode || !Number.isFinite(els.player.duration) || els.player.duration <= 0) return;

  episode.progress = Math.min(1, els.player.currentTime / els.player.duration);
  episode.lastTime = els.player.currentTime;
  saveLibrary();
  updateCurrentCardProgress(episode);
});

els.player.addEventListener("loadedmetadata", () => {
  const episode = getCurrentEpisode();
  if (!episode) return;

  if (episode.lastTime && episode.lastTime < els.player.duration - 5) {
    els.player.currentTime = episode.lastTime;
  }
});

els.searchInput.addEventListener("input", event => {
  state.query = event.target.value.trim().toLowerCase();
  renderList();
});

els.filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    els.filterButtons.forEach(item => item.classList.toggle("active", item === button));
    renderList();
  });
});

els.saveMeta.addEventListener("click", () => {
  const episode = getCurrentEpisode();
  if (!episode) return;

  episode.title = els.titleEdit.value.trim() || episode.title;
  episode.status = els.statusSelect.value;
  saveLibrary();
  render();
});

els.removeCurrent.addEventListener("click", () => {
  if (!state.currentId) return;

  const confirmed = window.confirm(text.removeConfirm);
  if (!confirmed) return;

  state.episodes = state.episodes.filter(episode => episode.id !== state.currentId);
  sessionFiles.delete(state.currentId);
  state.currentId = state.episodes[0]?.id || null;
  saveLibrary();
  if (state.currentId && sessionFiles.has(state.currentId)) {
    playEpisode(state.currentId);
  } else {
    clearPlayer();
    render();
  }
});

["dragenter", "dragover"].forEach(type => {
  els.dropZone.addEventListener(type, event => {
    event.preventDefault();
    els.dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(type => {
  els.dropZone.addEventListener(type, event => {
    event.preventDefault();
    els.dropZone.classList.remove("dragging");
  });
});

els.dropZone.addEventListener("drop", event => {
  addVideos([...event.dataTransfer.files].filter(file => file.type.startsWith("video/")));
});

function addVideos(files) {
  const videoFiles = files.filter(file => file.type.startsWith("video/"));
  if (!videoFiles.length) return;

  videoFiles.forEach(file => {
    const id = crypto.randomUUID();
    sessionFiles.set(id, file);
    state.episodes.unshift({
      id,
      title: cleanName(file.name),
      fileName: file.name,
      size: file.size,
      status: "watching",
      progress: 0,
      lastTime: 0,
      cover: "",
      addedAt: Date.now()
    });
  });

  state.currentId = state.episodes[0].id;
  saveLibrary();
  playEpisode(state.currentId);
  render();
}

function playEpisode(id) {
  const episode = state.episodes.find(item => item.id === id);
  if (!episode) return;

  state.currentId = id;
  const file = sessionFiles.get(id);
  els.player.pause();

  if (file) {
    if (els.player.dataset.objectUrl) {
      URL.revokeObjectURL(els.player.dataset.objectUrl);
    }
    const url = URL.createObjectURL(file);
    els.player.dataset.objectUrl = url;
    els.player.src = url;
    els.player.load();
    els.emptyPlayer.hidden = true;
  } else {
    els.player.removeAttribute("src");
    els.player.load();
    els.emptyPlayer.hidden = false;
    els.emptyPlayer.querySelector("strong").textContent = text.needsFile;
    els.emptyPlayer.querySelector("span").textContent = `${text.reimport}${episode.fileName}`;
  }

  els.currentTitle.textContent = episode.title;
  els.titleEdit.value = episode.title;
  els.statusSelect.value = episode.status;
  setEditingEnabled(true);
  renderList();
}

async function setCover(id, file) {
  const episode = state.episodes.find(item => item.id === id);
  if (!episode) return;

  episode.cover = await fileToDataUrl(file);
  saveLibrary();
  renderList();
}

function render() {
  const current = getCurrentEpisode();
  els.libraryCount.textContent = state.episodes.length;

  if (current) {
    els.currentTitle.textContent = current.title;
    els.titleEdit.value = current.title;
    els.statusSelect.value = current.status;
    setEditingEnabled(true);
  } else {
    clearPlayer();
  }

  renderList();
}

function renderList() {
  els.episodeList.innerHTML = "";
  els.libraryCount.textContent = state.episodes.length;

  const episodes = state.episodes.filter(episode => {
    const matchesFilter = state.filter === "all" || episode.status === state.filter;
    const matchesQuery = !state.query || episode.title.toLowerCase().includes(state.query);
    return matchesFilter && matchesQuery;
  });

  if (!episodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = state.episodes.length ? text.emptyFiltered : text.emptyLibrary;
    els.episodeList.append(empty);
    return;
  }

  episodes.forEach(episode => {
    const card = els.episodeTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("active", episode.id === state.currentId);
    card.dataset.id = episode.id;
    card.querySelector("img").src = episode.cover;
    card.querySelector("img").alt = episode.title;
    card.querySelector("h3").textContent = episode.title;
    card.querySelector("p").textContent = `${statusLabel(episode.status)} - ${formatSize(episode.size)}`;
    card.querySelector(".progress-bar span").style.width = `${Math.round((episode.progress || 0) * 100)}%`;
    card.querySelector(".cover").addEventListener("click", () => playEpisode(episode.id));
    els.episodeList.append(card);
  });
}

function clearPlayer() {
  state.currentId = null;
  els.player.pause();
  els.player.removeAttribute("src");
  els.player.load();
  els.emptyPlayer.hidden = false;
  els.emptyPlayer.querySelector("strong").textContent = text.importPrompt;
  els.emptyPlayer.querySelector("span").textContent = text.importHelp;
  els.currentTitle.textContent = text.noSelection;
  els.titleEdit.value = "";
  setEditingEnabled(false);
}

function setEditingEnabled(enabled) {
  els.titleEdit.disabled = !enabled;
  els.statusSelect.disabled = !enabled;
  els.saveMeta.disabled = !enabled;
  els.removeCurrent.disabled = !enabled;
  els.coverInput.disabled = !enabled;
}

function updateCurrentCardProgress(episode) {
  const bar = els.episodeList.querySelector(`[data-id="${episode.id}"] .progress-bar span`);
  if (bar) {
    bar.style.width = `${Math.round((episode.progress || 0) * 100)}%`;
  }
}

function getCurrentEpisode() {
  return state.episodes.find(episode => episode.id === state.currentId) || null;
}

function cleanName(name) {
  return name.replace(/\.[^.]+$/, "").replace(/[._-]+/g, " ").trim();
}

function statusLabel(status) {
  return text.statuses[status] || text.statuses.watching;
}

function formatSize(bytes) {
  if (!bytes) return text.unknownSize;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadLibrary() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveLibrary() {
  localStorage.setItem(storageKey, JSON.stringify(state.episodes));
}
