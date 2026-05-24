const text = {
  importPrompt: "\u628a\u52a8\u6f2b\u6587\u4ef6\u62d6\u8fdb\u6765\uff0c\u6216\u8005\u70b9\u53f3\u4e0a\u89d2 + \u5bfc\u5165\u3002",
  importHelp: "\u5f53\u524d\u7248\u672c\u4f1a\u81ea\u52a8\u628a\u540c\u4e00\u90e8\u4f5c\u54c1\u7684\u5267\u96c6\u5f52\u5230\u4e00\u4e2a\u5c01\u9762\u4e0b\uff0c\u6240\u6709\u89c6\u9891\u53ea\u5728\u672c\u673a\u4f7f\u7528\u3002",
  noSeries: "\u8fd8\u6ca1\u6709\u9009\u62e9\u4f5c\u54c1",
  noEpisode: "\u8fd8\u6ca1\u6709\u9009\u62e9\u5267\u96c6",
  seriesHint: "\u5148\u9009\u4e00\u90e8\u756a\u5267\uff0c\u7136\u540e\u5728\u53f3\u4fa7\u770b\u5267\u96c6\u5217\u8868\u3002",
  episodeHint: "\u8bf7\u5148\u4ece\u5c01\u9762\u5899\u9009\u4e00\u90e8\u4f5c\u54c1\u3002",
  removeConfirm: "\u786e\u5b9a\u4ece\u7247\u5355\u79fb\u9664\u5f53\u524d\u4f5c\u54c1\u5417\uff1f\u8fd9\u4e2a\u64cd\u4f5c\u4f1a\u540c\u65f6\u79fb\u9664\u4e0b\u9762\u7684\u6240\u6709\u5267\u96c6\u8bb0\u5f55\u3002",
  needsFile: "\u8fd9\u4e00\u96c6\u9700\u8981\u91cd\u65b0\u5bfc\u5165\u539f\u89c6\u9891\u6587\u4ef6",
  reimport: "\u6d4f\u89c8\u5668\u4e0d\u4f1a\u6c38\u4e45\u4fdd\u5b58\u5927\u89c6\u9891\u6587\u4ef6\uff0c\u8bf7\u518d\u6b21\u5bfc\u5165\uff1a",
  emptyFiltered: "\u6ca1\u6709\u5339\u914d\u7684\u4f5c\u54c1\u3002",
  emptyLibrary: "\u7247\u5355\u8fd8\u662f\u7a7a\u7684\u3002\u5148\u5bfc\u5165\u4e00\u4e9b\u52a8\u6f2b\u89c6\u9891\u8bd5\u8bd5\u3002",
  invalidSelection: "\u8fd9\u6b21\u9009\u4e2d\u7684\u6587\u4ef6\u6ca1\u6709\u88ab\u8bc6\u522b\u6210\u53ef\u64ad\u653e\u89c6\u9891\u3002\u8bf7\u4f18\u5148\u9009 MP4 \u6216 WebM\uff0cMKV \u9700\u8981\u6d4f\u89c8\u5668\u81ea\u5df1\u652f\u6301\u89e3\u7801\u3002",
  playbackFailed: "\u8fd9\u4e2a\u89c6\u9891\u5df2\u5bfc\u5165\uff0c\u4f46\u5f53\u524d\u6d4f\u89c8\u5668\u65e0\u6cd5\u64ad\u653e\u5b83\u3002",
  playbackHelp: "\u8bf7\u6362\u6210 MP4\uff08H.264\uff09\u6216 WebM\uff0c\u6216\u8005\u6539\u7528\u672c\u673a Chrome / Edge \u6253\u5f00\u518d\u8bd5\u3002",
  unknownSize: "\u672a\u77e5\u5927\u5c0f",
  episodeUnit: "\u96c6",
  statuses: {
    watching: "\u8ffd\u756a\u4e2d",
    done: "\u5df2\u770b\u5b8c",
    planned: "\u60f3\u770b"
  }
};

const storageKey = "anime-shelf-library-v2";
const legacyStorageKey = "anime-shelf-library";
const animeApiUrl = "https://graphql.anilist.co";
const sessionFiles = new Map();

const state = {
  library: loadLibrary(),
  currentSeriesId: null,
  currentEpisodeId: null,
  filter: "all",
  query: ""
};

const els = {
  videoInput: document.querySelector("#videoInput"),
  coverInput: document.querySelector("#coverInput"),
  player: document.querySelector("#player"),
  emptyPlayer: document.querySelector("#emptyPlayer"),
  searchInput: document.querySelector("#searchInput"),
  filterButtons: document.querySelectorAll("[data-filter]"),
  seriesGrid: document.querySelector("#seriesGrid"),
  seriesTemplate: document.querySelector("#seriesTemplate"),
  seriesCount: document.querySelector("#seriesCount"),
  heroCover: document.querySelector("#heroCover"),
  seriesTitle: document.querySelector("#seriesTitle"),
  seriesMeta: document.querySelector("#seriesMeta"),
  episodeCountBadge: document.querySelector("#episodeCountBadge"),
  statusBadge: document.querySelector("#statusBadge"),
  titleEdit: document.querySelector("#titleEdit"),
  statusSelect: document.querySelector("#statusSelect"),
  saveMeta: document.querySelector("#saveMeta"),
  removeCurrent: document.querySelector("#removeCurrent"),
  currentEpisodeTitle: document.querySelector("#currentEpisodeTitle"),
  currentEpisodeMeta: document.querySelector("#currentEpisodeMeta"),
  dropZone: document.querySelector("#dropZone"),
  episodeList: document.querySelector("#episodeList"),
  episodeTemplate: document.querySelector("#episodeTemplate")
};

initializeState();
hydrateMissingMetadata();
render();

els.videoInput.addEventListener("change", event => {
  addVideos([...event.target.files]);
  event.target.value = "";
});

els.coverInput.addEventListener("change", async event => {
  const file = event.target.files[0];
  if (file && state.currentSeriesId) {
    await setSeriesCover(state.currentSeriesId, file);
  }
  event.target.value = "";
});

els.player.addEventListener("timeupdate", () => {
  const episode = getCurrentEpisode();
  if (!episode || !Number.isFinite(els.player.duration) || els.player.duration <= 0) return;

  episode.progress = Math.min(1, els.player.currentTime / els.player.duration);
  episode.lastTime = els.player.currentTime;
  saveLibrary();
  updateEpisodeProgress(episode);
  renderSeriesGrid();
});

els.player.addEventListener("loadedmetadata", () => {
  const episode = getCurrentEpisode();
  if (!episode) return;

  if (episode.lastTime && episode.lastTime < els.player.duration - 5) {
    els.player.currentTime = episode.lastTime;
  }
});

els.player.addEventListener("error", () => {
  const episode = getCurrentEpisode();
  if (!episode) return;

  showImportMessage(text.playbackFailed, `${text.playbackHelp} (${episode.fileName})`);
});

els.searchInput.addEventListener("input", event => {
  state.query = event.target.value.trim().toLowerCase();
  renderSeriesGrid();
});

els.filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    els.filterButtons.forEach(item => item.classList.toggle("active", item === button));
    renderSeriesGrid();
  });
});

els.saveMeta.addEventListener("click", () => {
  const series = getCurrentSeries();
  if (!series) return;

  series.title = els.titleEdit.value.trim() || series.title;
  series.status = els.statusSelect.value;
  saveLibrary();
  render();
});

els.removeCurrent.addEventListener("click", () => {
  const series = getCurrentSeries();
  if (!series) return;

  const confirmed = window.confirm(text.removeConfirm);
  if (!confirmed) return;

  series.episodes.forEach(episode => sessionFiles.delete(episode.id));
  state.library = state.library.filter(item => item.id !== series.id);
  state.currentSeriesId = state.library[0]?.id || null;
  state.currentEpisodeId = getCurrentSeries()?.episodes[0]?.id || null;
  saveLibrary();

  if (state.currentEpisodeId) {
    playEpisode(state.currentEpisodeId);
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
  addVideos([...event.dataTransfer.files]);
});

function initializeState() {
  if (!state.library.length) return;

  state.currentSeriesId = state.library[0].id;
  state.currentEpisodeId = state.library[0].episodes[0]?.id || null;
}

function addVideos(files) {
  const videoFiles = files.filter(isVideoFile);
  if (!videoFiles.length) {
    showImportMessage(text.invalidSelection, text.importHelp);
    return;
  }

  videoFiles.forEach(file => {
    const parsed = parseEpisodeInfo(file.name);
    const series = findOrCreateSeries(parsed.seriesTitle);
    const episode = {
      id: crypto.randomUUID(),
      title: parsed.episodeTitle,
      fileName: file.name,
      size: file.size,
      progress: 0,
      lastTime: 0,
      order: parsed.order,
      addedAt: Date.now()
    };

    sessionFiles.set(episode.id, file);
    series.episodes.push(episode);
    series.episodes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    series.updatedAt = Date.now();
  });

  sortLibrary();
  state.currentSeriesId = state.library[0].id;
  state.currentEpisodeId = getCurrentSeries()?.episodes[0]?.id || null;
  saveLibrary();
  render();

  if (state.currentEpisodeId) {
    playEpisode(state.currentEpisodeId);
  }
}

function findOrCreateSeries(title) {
  const normalized = normalizeTitle(title);
  let series = state.library.find(item => item.normalizedTitle === normalized);
  if (series) return series;

  series = {
    id: crypto.randomUUID(),
    title,
    normalizedTitle: normalized,
    cover: "",
    description: `\u5f53\u524d\u6536\u5f55 ${title} \u7684\u672c\u5730\u5267\u96c6\u3002`,
    status: "watching",
    metadataFetched: false,
    metadataState: "idle",
    updatedAt: Date.now(),
    episodes: []
  };

  state.library.unshift(series);
  void ensureSeriesMetadata(series);
  return series;
}

function playEpisode(id) {
  const series = getCurrentSeriesByEpisode(id);
  const episode = series?.episodes.find(item => item.id === id);
  if (!series || !episode) return;

  state.currentSeriesId = series.id;
  state.currentEpisodeId = id;
  els.player.pause();

  const file = sessionFiles.get(id);
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
    showImportMessage(text.needsFile, `${text.reimport}${episode.fileName}`);
  }

  renderDetail();
  renderEpisodes();
  renderSeriesGrid();
}

async function setSeriesCover(seriesId, file) {
  const series = state.library.find(item => item.id === seriesId);
  if (!series) return;

  series.cover = await fileToDataUrl(file);
  series.metadataFetched = true;
  series.metadataState = "ready";
  saveLibrary();
  render();
}

function render() {
  renderSeriesGrid();
  renderDetail();
  renderEpisodes();
}

function renderSeriesGrid() {
  els.seriesGrid.innerHTML = "";

  const seriesList = state.library.filter(series => {
    const matchesFilter = state.filter === "all" || series.status === state.filter;
    const haystack = `${series.title} ${series.episodes.map(episode => episode.title).join(" ")}`.toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);
    return matchesFilter && matchesQuery;
  });

  els.seriesCount.textContent = seriesList.length;

  if (!seriesList.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = state.library.length ? text.emptyFiltered : text.emptyLibrary;
    els.seriesGrid.append(empty);
    return;
  }

  seriesList.forEach(series => {
    const card = els.seriesTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("active", series.id === state.currentSeriesId);
    card.querySelector("img").src = series.cover;
    card.querySelector("img").alt = series.title;
    card.querySelector("h3").textContent = series.title;
    card.querySelector(".series-copy").textContent = series.description;
    card.querySelector(".series-foot").textContent = `${series.episodes.length} ${text.episodeUnit} - ${statusLabel(series.status)}`;
    card.querySelector(".series-status").textContent = statusLabel(series.status);
    card.querySelector(".series-poster").addEventListener("click", () => selectSeries(series.id));
    els.seriesGrid.append(card);
  });
}

function renderDetail() {
  const series = getCurrentSeries();
  const episode = getCurrentEpisode();

  if (!series) {
    els.heroCover.src = "";
    els.seriesTitle.textContent = text.noSeries;
    els.seriesMeta.textContent = text.seriesHint;
    els.episodeCountBadge.textContent = `0 ${text.episodeUnit}`;
    els.statusBadge.textContent = "\u672a\u8bbe\u7f6e";
    els.currentEpisodeTitle.textContent = text.noEpisode;
    els.currentEpisodeMeta.textContent = text.episodeHint;
    setEditingEnabled(false);
    clearPlayer();
    return;
  }

  els.heroCover.src = series.cover;
  els.heroCover.alt = series.title;
  els.seriesTitle.textContent = series.title;
  els.seriesMeta.textContent = series.description;
  els.episodeCountBadge.textContent = `${series.episodes.length} ${text.episodeUnit}`;
  els.statusBadge.textContent = statusLabel(series.status);
  els.titleEdit.value = series.title;
  els.statusSelect.value = series.status;
  setEditingEnabled(true);

  if (episode) {
    els.currentEpisodeTitle.textContent = episode.title;
    els.currentEpisodeMeta.textContent = `${series.title} - ${formatSize(episode.size)}`;
  } else {
    els.currentEpisodeTitle.textContent = text.noEpisode;
    els.currentEpisodeMeta.textContent = text.episodeHint;
  }
}

function renderEpisodes() {
  els.episodeList.innerHTML = "";
  const series = getCurrentSeries();

  if (!series) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = text.episodeHint;
    els.episodeList.append(empty);
    return;
  }

  if (!series.episodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = text.importPrompt;
    els.episodeList.append(empty);
    return;
  }

  series.episodes.forEach(episode => {
    const card = els.episodeTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("active", episode.id === state.currentEpisodeId);
    card.querySelector("h3").textContent = episode.title;
    card.querySelector("p").textContent = `${statusLabel(series.status)} - ${formatSize(episode.size)}`;
    card.querySelector(".progress-bar span").style.width = `${Math.round((episode.progress || 0) * 100)}%`;
    card.querySelector(".episode-play").addEventListener("click", () => playEpisode(episode.id));
    els.episodeList.append(card);
  });
}

function selectSeries(id) {
  state.currentSeriesId = id;
  state.currentEpisodeId = getCurrentSeries()?.episodes[0]?.id || null;
  render();

  if (state.currentEpisodeId && sessionFiles.has(state.currentEpisodeId)) {
    playEpisode(state.currentEpisodeId);
  } else {
    els.player.pause();
    els.player.removeAttribute("src");
    els.player.load();
    showImportMessage(text.importPrompt, text.importHelp);
  }
}

function clearPlayer() {
  state.currentEpisodeId = null;
  els.player.pause();
  els.player.removeAttribute("src");
  els.player.load();
  showImportMessage(text.importPrompt, text.importHelp);
}

function showImportMessage(title, detail) {
  els.emptyPlayer.hidden = false;
  els.emptyPlayer.querySelector("strong").textContent = title;
  els.emptyPlayer.querySelector("span").textContent = detail;
}

function setEditingEnabled(enabled) {
  els.titleEdit.disabled = !enabled;
  els.statusSelect.disabled = !enabled;
  els.saveMeta.disabled = !enabled;
  els.removeCurrent.disabled = !enabled;
  els.coverInput.disabled = !enabled;
}

function updateEpisodeProgress(episode) {
  const bar = els.episodeList.querySelectorAll(".episode-card");
  bar.forEach(card => {
    const title = card.querySelector("h3")?.textContent;
    if (title === episode.title) {
      card.querySelector(".progress-bar span").style.width = `${Math.round((episode.progress || 0) * 100)}%`;
    }
  });
}

function getCurrentSeries() {
  return state.library.find(series => series.id === state.currentSeriesId) || null;
}

function getCurrentSeriesByEpisode(episodeId) {
  return state.library.find(series => series.episodes.some(episode => episode.id === episodeId)) || null;
}

function getCurrentEpisode() {
  const series = getCurrentSeries();
  return series?.episodes.find(episode => episode.id === state.currentEpisodeId) || null;
}

function parseEpisodeInfo(fileName) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const cleanBase = baseName.replace(/[\[\]()]/g, " ");
  const match = cleanBase.match(/(.+?)(?:\s*[-_ ]\s*|\s+)(?:第?\s*(\d{1,3})\s*集?|ep\.?\s*(\d{1,3})|episode\s*(\d{1,3}))/i);
  const order = Number(match?.[2] || match?.[3] || match?.[4] || 1);
  const seriesTitle = normalizeSeriesTitle(match?.[1] || cleanBase);
  return {
    seriesTitle,
    episodeTitle: `${seriesTitle} \u7b2c${order}\u96c6`,
    order
  };
}

function normalizeSeriesTitle(title) {
  return title.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim() || "\u672a\u547d\u540d\u4f5c\u54c1";
}

function normalizeTitle(title) {
  return normalizeSeriesTitle(title).toLowerCase();
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

function isVideoFile(file) {
  if (file.type && file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mkv|mov|m4v|avi)$/i.test(file.name);
}

function sortLibrary() {
  state.library.sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
}

function loadLibrary() {
  const migrated = migrateLegacyLibrary();
  if (migrated) return migrated;

  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function migrateLegacyLibrary() {
  if (localStorage.getItem(storageKey)) return null;

  try {
    const legacy = JSON.parse(localStorage.getItem(legacyStorageKey)) || [];
    if (!legacy.length) return null;

    const grouped = [];
    legacy.forEach(item => {
      const parsed = parseEpisodeInfo(item.fileName || item.title);
      let series = grouped.find(entry => entry.normalizedTitle === normalizeTitle(parsed.seriesTitle));
      if (!series) {
        series = {
          id: crypto.randomUUID(),
          title: parsed.seriesTitle,
          normalizedTitle: normalizeTitle(parsed.seriesTitle),
          cover: item.cover || "",
          description: `\u4ece\u65e7\u7248\u7247\u5355\u8fc1\u79fb\u8fc7\u6765\u7684 ${parsed.seriesTitle}\u3002`,
          status: item.status || "watching",
          metadataFetched: Boolean(item.cover),
          metadataState: item.cover ? "ready" : "idle",
          updatedAt: item.addedAt || Date.now(),
          episodes: []
        };
        grouped.push(series);
      }

      series.episodes.push({
        id: item.id || crypto.randomUUID(),
        title: parsed.episodeTitle,
        fileName: item.fileName || item.title,
        size: item.size || 0,
        progress: item.progress || 0,
        lastTime: item.lastTime || 0,
        order: parsed.order,
        addedAt: item.addedAt || Date.now()
      });
    });

    grouped.forEach(series => {
      series.episodes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    });
    localStorage.setItem(storageKey, JSON.stringify(grouped));
    return grouped;
  } catch {
    return null;
  }
}

function saveLibrary() {
  localStorage.setItem(storageKey, JSON.stringify(state.library));
}

function hydrateMissingMetadata() {
  state.library.forEach(series => {
    if (!series.cover || !series.metadataFetched) {
      void ensureSeriesMetadata(series);
    }
  });
}

async function ensureSeriesMetadata(series) {
  if (!series || series.metadataState === "loading" || series.metadataFetched) return;

  series.metadataState = "loading";
  saveLibrary();

  try {
    const metadata = await fetchAnimeMetadata(series.title);
    if (metadata) {
      if (!series.cover && metadata.coverImage) {
        series.cover = metadata.coverImage;
      }
      if (metadata.description) {
        series.description = metadata.description;
      }
      if (metadata.title && series.title === series.normalizedTitle) {
        series.title = metadata.title;
      }
    }
    series.metadataFetched = true;
    series.metadataState = "ready";
  } catch {
    series.metadataState = "error";
  }

  saveLibrary();
  render();
}

async function fetchAnimeMetadata(title) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        title {
          romaji
          english
          native
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
        }
      }
    }
  `;

  const response = await fetch(animeApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      query,
      variables: {
        search: title
      }
    })
  });

  if (!response.ok) {
    throw new Error(`metadata request failed: ${response.status}`);
  }

  const payload = await response.json();
  const media = payload?.data?.Media;
  if (!media) return null;

  return {
    title: media.title?.native || media.title?.romaji || media.title?.english || title,
    description: cleanDescription(media.description),
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || ""
  };
}

function cleanDescription(description) {
  if (!description) return "";
  return description.replace(/<br\s*\/?>/gi, " ").replace(/<\/?[^>]+>/g, "").trim();
}
