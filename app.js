const SITE_PASSWORD = "champagne";
const STORAGE_KEYS = {
  unlocked: "pearlUnlocked",
  journalUnlocked: "pearlJournalUnlocked",
  geenaData: "geenaJournalData",
  geenaEntries: "geenaJournalEntries",
  arjunLetters: "arjunOpenWhenLetters",
  voiceFeedbackHistory: "geenaVoiceFeedbackHistory",
};

const DEFAULT_ACCENT = "Indian English";
const DEFAULT_STYLE = "Hinglish allowed";

const defaultLetters = [
  {
    title: "Open when you need courage",
    content: "You have done hard things before. Start with one small step and trust your pace.",
  },
  {
    title: "Open when you feel lost",
    content: "Take a breath, return to your routine, and do the next right thing.",
  },
];

let recognition;
let transcriptBuffer = "";
let isRecording = false;
let currentPromptObject = null;
let realtimeState = null;

document.addEventListener("DOMContentLoaded", () => {
  createAmbientParticles();
  startPopupPhrases();
  initGate();
  initNavigation();
  initDashboardButtons();
  initCopyTools();
  initJournal();
  initVoiceCoach();
  initGeenaGallery();
});

function initGate() {
  const lockScreen = document.getElementById("lock-screen");
  const appShell = document.getElementById("app-shell");
  const input = document.getElementById("password-input");
  const unlockBtn = document.getElementById("unlock-btn");
  const error = document.getElementById("gate-error");

  if (localStorage.getItem(STORAGE_KEYS.unlocked) === "true") {
    lockScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
  }

  const tryUnlock = () => {
    if (input.value.trim() === SITE_PASSWORD) {
      localStorage.setItem(STORAGE_KEYS.unlocked, "true");
      lockScreen.classList.add("hidden");
      appShell.classList.remove("hidden");
      error.textContent = "";
      input.value = "";
      return;
    }
    error.textContent = "Incorrect password. Try again.";
  };

  unlockBtn.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") tryUnlock();
  });
}

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.dataset.page;
      pages.forEach((page) => page.classList.remove("active"));
      navItems.forEach((btn) => btn.classList.remove("active"));
      document.getElementById(target).classList.add("active");
      item.classList.add("active");
    });
  });
}

function initDashboardButtons() {
  const gotoButtons = document.querySelectorAll(".goto-btn");
  gotoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      const navButton = document.querySelector(`.nav-item[data-page="${target}"]`);
      if (navButton) navButton.click();
    });
  });
}

function initCopyTools() {
  const status = document.getElementById("copy-status");
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.dataset.copy;
      const target = document.getElementById(targetId);
      let text = "";

      if (target.tagName === "TEXTAREA") text = target.value;
      if (target.tagName === "UL") {
        text = [...target.querySelectorAll("li")].map((item) => `- ${item.textContent}`).join("\n");
      }

      try {
        await navigator.clipboard.writeText(text);
        status.textContent = "Copied to clipboard.";
      } catch (error) {
        status.textContent = "Clipboard blocked. Copy manually.";
      }

      setTimeout(() => {
        status.textContent = "";
      }, 2200);
    });
  });

  const exportKitBtn = document.getElementById("export-kit-btn");
  const printKitEl = document.getElementById("print-kit");
  if (exportKitBtn && printKitEl) {
    exportKitBtn.addEventListener("click", () => {
      const linksEl = document.getElementById("mumbai-casting-links");
      const submissionEl = document.getElementById("submission-template");
      const agencyEl = document.getElementById("agency-email-template");
      const slateEl = document.getElementById("slate-checklist");

      const linkItems = linksEl
        ? [...linksEl.querySelectorAll("a")].map(
            (a) => `<li><a href="${escapeHtml(a.href)}">${escapeHtml(a.textContent)}</a></li>`
          ).join("")
        : "";
      const submissionText = submissionEl ? escapeHtml(submissionEl.value.trim()) : "";
      const agencyText = agencyEl ? escapeHtml(agencyEl.value.trim()) : "";
      const slateItems = slateEl
        ? [...slateEl.querySelectorAll("li")].map((li) => `<li>${escapeHtml(li.textContent)}</li>`).join("")
        : "";

      printKitEl.innerHTML = `
        <div class="print-kit-inner">
          <h1>Talent Submission Kit — Geena Malhotra</h1>
          <p class="print-muted">Mumbai casting &amp; acting resources. Use Save as PDF in the print dialog.</p>
          <h2>Mumbai Casting &amp; Acting Links</h2>
          <ul class="print-links">${linkItems}</ul>
          <h2>Submission Message Template (Mumbai)</h2>
          <pre class="print-block">${submissionText}</pre>
          <h2>Email to Casting Agencies</h2>
          <pre class="print-block">${agencyText}</pre>
          <h2>Slate Checklist</h2>
          <ul class="print-checklist">${slateItems}</ul>
        </div>
      `;
      window.print();
    });
  }
}

function initJournal() {
  const gate = document.getElementById("journal-gate");
  const content = document.getElementById("journal-content");
  const unlockBtn = document.getElementById("journal-unlock-btn");
  const input = document.getElementById("journal-password-input");
  const error = document.getElementById("journal-gate-error");

  if (localStorage.getItem(STORAGE_KEYS.journalUnlocked) === "true") {
    gate.classList.add("hidden");
    content.classList.remove("hidden");
  }

  const unlockJournal = () => {
    if (input.value.trim() === SITE_PASSWORD) {
      localStorage.setItem(STORAGE_KEYS.journalUnlocked, "true");
      gate.classList.add("hidden");
      content.classList.remove("hidden");
      error.textContent = "";
      input.value = "";
      return;
    }
    error.textContent = "Incorrect password for Journal.";
  };

  unlockBtn.addEventListener("click", unlockJournal);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockJournal();
  });

  initGeenaJournal();
  initArjunLetters();
  initJournalTabs();
}

function initJournalTabs() {
  const tabs = document.querySelectorAll("[data-journal-tab]");
  const panels = {
    geena: document.getElementById("journal-geena"),
    arjun: document.getElementById("journal-arjun"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      Object.values(panels).forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      panels[tab.dataset.journalTab].classList.add("active");
    });
  });
}

function initGeenaJournal() {
  const mood = document.getElementById("geena-mood");
  const goal = document.getElementById("geena-goal");
  const notes = document.getElementById("geena-notes");
  const saveBtn = document.getElementById("geena-save-today-btn");
  const saveStatus = document.getElementById("geena-save-status");
  const pastList = document.getElementById("geena-past-entries-list");
  const viewPanel = document.getElementById("geena-view-entry");

  let entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.geenaEntries) || "null");
  if (!Array.isArray(entries)) {
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEYS.geenaData) || "{}");
    entries = [];
    if (legacy.mood || legacy.goal || legacy.notes) {
      entries.push({
        date: new Date().toISOString().slice(0, 10),
        mood: legacy.mood || "Focused",
        goal: legacy.goal || "",
        notes: legacy.notes || "",
      });
      localStorage.setItem(STORAGE_KEYS.geenaEntries, JSON.stringify(entries));
    }
  }

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadTodayIntoForm() {
    const today = getTodayKey();
    const found = entries.find((e) => e.date === today);
    mood.value = found ? found.mood : "Focused";
    goal.value = found ? found.goal : "";
    notes.value = found ? found.notes : "";
  }

  function saveToday() {
    const today = getTodayKey();
    const existing = entries.findIndex((e) => e.date === today);
    const entry = {
      date: today,
      mood: mood.value,
      goal: goal.value,
      notes: notes.value,
    };
    if (existing >= 0) entries.splice(existing, 1, entry);
    else entries.push(entry);
    entries.sort((a, b) => (b.date > a.date ? 1 : -1));
    try {
      localStorage.setItem(STORAGE_KEYS.geenaEntries, JSON.stringify(entries));
      if (saveStatus) saveStatus.textContent = "Saved.";
      setTimeout(() => { if (saveStatus) saveStatus.textContent = ""; }, 2200);
      renderPastEntries();
    } catch (e) {
      if (saveStatus) saveStatus.textContent = "Could not save (storage may be full or disabled).";
    }
  }

  let autoSaveTimer = null;
  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      saveToday();
    }, 2000);
  }

  function renderPastEntries() {
    if (!pastList) return;
    pastList.innerHTML = "";
    const forList = entries.filter((e) => e.date !== getTodayKey()).slice(0, 30);
    if (forList.length === 0) {
      pastList.innerHTML = '<p class="muted">No past entries yet. Save today\'s entry above; other days will appear here.</p>';
      return;
    }
    forList.forEach((entry) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-soft past-entry-btn";
      btn.textContent = entry.date;
      btn.addEventListener("click", () => showViewEntry(entry));
      pastList.appendChild(btn);
    });
  }

  function showViewEntry(entry) {
    if (!viewPanel) return;
    viewPanel.classList.remove("hidden");
    viewPanel.innerHTML = `
      <strong>${escapeHtml(entry.date)}</strong>
      <p><strong>Mood:</strong> ${escapeHtml(entry.mood)}</p>
      <p><strong>Goal:</strong> ${escapeHtml(entry.goal || "—")}</p>
      <p><strong>Notes:</strong></p>
      <p class="view-notes">${escapeHtml(entry.notes || "—")}</p>
      <button type="button" class="btn btn-soft close-view-btn">Close</button>
    `;
    viewPanel.querySelector(".close-view-btn")?.addEventListener("click", () => viewPanel.classList.add("hidden"));
  }

  loadTodayIntoForm();
  renderPastEntries();

  if (saveBtn) saveBtn.addEventListener("click", saveToday);
  [mood, goal, notes].forEach((field) => {
    if (!field) return;
    field.addEventListener("input", () => {
      if (saveStatus) saveStatus.textContent = "Unsaved changes.";
      scheduleAutoSave();
    });
    field.addEventListener("blur", saveToday);
  });
}

function initArjunLetters() {
  const list = document.getElementById("letters-list");
  const addButton = document.getElementById("add-letter-btn");

  let letters = JSON.parse(localStorage.getItem(STORAGE_KEYS.arjunLetters) || "null");
  if (!Array.isArray(letters) || letters.length === 0) {
    letters = [...defaultLetters];
    saveLetters(letters);
  }

  function renderLetters() {
    list.innerHTML = "";
    letters.forEach((letter, index) => {
      const card = document.createElement("div");
      card.className = "letter-card";
      card.innerHTML = `
        <label class="field">
          Title
          <input class="input letter-title" data-index="${index}" type="text" value="${escapeHtml(
            letter.title
          )}" />
        </label>
        <label class="field">
          Letter
          <textarea class="input area letter-content" data-index="${index}">${escapeHtml(
            letter.content
          )}</textarea>
        </label>
        <div class="letter-actions">
          <button class="btn btn-soft delete-letter" data-index="${index}">Delete</button>
        </div>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll(".letter-title").forEach((inputEl) => {
      inputEl.addEventListener("input", (event) => {
        const idx = Number(event.target.dataset.index);
        letters[idx].title = event.target.value;
        saveLetters(letters);
      });
    });

    list.querySelectorAll(".letter-content").forEach((inputEl) => {
      inputEl.addEventListener("input", (event) => {
        const idx = Number(event.target.dataset.index);
        letters[idx].content = event.target.value;
        saveLetters(letters);
      });
    });

    list.querySelectorAll(".delete-letter").forEach((button) => {
      button.addEventListener("click", (event) => {
        const idx = Number(event.target.dataset.index);
        letters.splice(idx, 1);
        saveLetters(letters);
        renderLetters();
      });
    });
  }

  addButton.addEventListener("click", () => {
    letters.push({
      title: "Open when...",
      content: "",
    });
    saveLetters(letters);
    renderLetters();
  });

  renderLetters();
}

function saveLetters(letters) {
  localStorage.setItem(STORAGE_KEYS.arjunLetters, JSON.stringify(letters));
}

const GEENA_PHOTOS = ["geena.jpeg", "geena1.jpeg", "geena2.png"];

const MEMORY_REEL_PHOTOS = [
  "39d4a713-75bb-465e-9eb4-cbd2fb6dff29.JPG",
  "41ba7977-b927-4082-ac0b-5b0718b18707.JPG",
  "49e3324e-2a4d-49e4-9db5-753e4d592033.JPG",
  "34430e12-763c-4b23-b002-7d3e5e5a06c5.JPG",
  "a41ee59b-7b97-45d1-a748-68ab88f53e4c.JPG",
  "be253744-ac68-4480-ad3d-b463e2d399fc.JPG",
  "IMG_1060.JPG",
  "DA208168-4F2E-4280-9060-1767B85E8DF6.JPG",
  "IMG_0580.JPG",
  "IMG_8959.JPG",
];

const POPUP_PHRASES = [
  "Ur my superstar",
  "I love you",
  "You're amazing",
  "Forever with you",
  "My favorite person",
  "So proud of you",
  "You shine",
  "Meant to be",
  "My one & only",
  "You're the best",
  "Love you more",
  "Always yours",
  "You're incredible",
  "My heart is yours",
  "So lucky to have you",
  "You light up my world",
  "Forever & always",
  "My superstar",
  "All for you",
  "You're perfect",
];

function startPopupPhrases() {
  const layer = document.getElementById("popup-phrases-layer");
  if (!layer) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let lastIndex = -1;
  /* Safe positions: corners and edges only, so text is never over the gate card or main content */
  const safePositions = [
    { left: "12%", top: "18%" },
    { left: "88%", top: "18%" },
    { left: "12%", top: "82%" },
    { left: "88%", top: "82%" },
    { left: "8%", top: "35%" },
    { left: "92%", top: "35%" },
    { left: "8%", top: "65%" },
    { left: "92%", top: "65%" },
    { left: "22%", top: "10%" },
    { left: "78%", top: "10%" },
    { left: "22%", top: "90%" },
    { left: "78%", top: "90%" },
  ];

  function showNext() {
    let idx = Math.floor(Math.random() * POPUP_PHRASES.length);
    if (POPUP_PHRASES.length > 1 && idx === lastIndex) {
      idx = (idx + 1) % POPUP_PHRASES.length;
    }
    lastIndex = idx;
    const phrase = POPUP_PHRASES[idx];
    const pos = safePositions[Math.floor(Math.random() * safePositions.length)];
    const el = document.createElement("span");
    el.className = "popup-phrase";
    el.textContent = phrase;
    el.style.left = pos.left;
    el.style.top = pos.top;
    layer.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 4200);
  }

  showNext();
  setInterval(showNext, 2200);
}

function initGeenaGallery() {
  const lightbox = document.getElementById("geena-lightbox");
  const backdrop = lightbox?.querySelector(".geena-lightbox-backdrop");
  const closeBtn = lightbox?.querySelector(".geena-lightbox-close");
  const prevBtn = lightbox?.querySelector(".geena-lightbox-prev");
  const nextBtn = lightbox?.querySelector(".geena-lightbox-next");
  const img = document.getElementById("geena-lightbox-img");
  const dotsContainer = document.getElementById("geena-lightbox-dots");

  if (!lightbox || !img || !dotsContainer) return;

  let currentIndex = 0;
  let currentPhotos = GEENA_PHOTOS;

  function buildDots(photos) {
    dotsContainer.innerHTML = "";
    photos.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "geena-lightbox-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", `Go to photo ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    });
  }

  function goTo(index) {
    currentIndex = (index + currentPhotos.length) % currentPhotos.length;
    img.src = currentPhotos[currentIndex];
    dotsContainer.querySelectorAll(".geena-lightbox-dot").forEach((d, i) => {
      d.classList.toggle("active", i === currentIndex);
    });
  }

  function openGallery(index, photosArray) {
    const photos = photosArray || GEENA_PHOTOS;
    currentPhotos = photos;
    buildDots(photos);
    currentIndex = Math.max(0, Math.min(index, photos.length - 1));
    img.src = photos[currentIndex];
    dotsContainer.querySelectorAll(".geena-lightbox-dot").forEach((d, i) => {
      d.classList.toggle("active", i === currentIndex);
    });
    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    lightbox.focus();
  }

  buildDots(GEENA_PHOTOS);

  function closeGallery() {
    lightbox.classList.add("hidden");
    document.body.style.overflow = "";
  }

  prevBtn?.addEventListener("click", () => goTo(currentIndex - 1));
  nextBtn?.addEventListener("click", () => goTo(currentIndex + 1));
  closeBtn?.addEventListener("click", closeGallery);
  backdrop?.addEventListener("click", closeGallery);

  const onKeydown = (e) => {
    if (!lightbox || lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowLeft") goTo(currentIndex - 1);
    if (e.key === "ArrowRight") goTo(currentIndex + 1);
  };
  document.addEventListener("keydown", onKeydown);

  document.querySelectorAll(".geena-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => openGallery(Number(thumb.dataset.index)));
  });

  document.getElementById("open-geena-gallery-btn")?.addEventListener("click", () => openGallery(0));
  document.getElementById("sidebar-geena-gallery-btn")?.addEventListener("click", () => openGallery(0));

  document.querySelectorAll(".polaroid-card").forEach((card) => {
    card.addEventListener("click", () => openGallery(Number(card.dataset.index), MEMORY_REEL_PHOTOS));
  });
  document.getElementById("open-memory-reel-btn")?.addEventListener("click", () => openGallery(0, MEMORY_REEL_PHOTOS));
}

function initVoiceCoach() {
  const modePicker = document.getElementById("mode-picker");
  const durationPicker = document.getElementById("duration-picker");
  const difficultyPicker = document.getElementById("difficulty-picker");
  const promptCard = document.getElementById("prompt-card");
  const transcriptBox = document.getElementById("transcript-box");
  const results = document.getElementById("voice-results");
  const generateBtn = document.getElementById("generate-prompt-btn");
  const recordBtn = document.getElementById("record-btn");
  const stopBtn = document.getElementById("stop-btn");
  const evaluateBtn = document.getElementById("evaluate-btn");
  const realtimeToggle = document.getElementById("realtime-toggle");
  const realtimeStartBtn = document.getElementById("realtime-start-btn");
  const realtimeStopBtn = document.getElementById("realtime-stop-btn");
  const realtimeStatus = document.getElementById("realtime-status");

  generateBtn.addEventListener("click", async () => {
    const mode = modePicker.value;
    const duration = Number(durationPicker.value);
    const difficulty = difficultyPicker?.value || "Medium";

    setButtonLoading(generateBtn, true, "Generating…");
    results.textContent = "Generating a premium prompt…";
    currentPromptObject = null;

    try {
      const promptObj = await postJson("/api/prompt", {
        mode,
        duration,
        accent: DEFAULT_ACCENT,
        style: DEFAULT_STYLE,
        difficulty,
      });

      currentPromptObject = promptObj;
      promptCard.innerHTML = renderPromptCard(promptObj);
      results.textContent = "Prompt ready. Record your take, then Evaluate.";
    } catch (error) {
      promptCard.textContent =
        "Backend not reachable (or error). Start the server, or enable MOCK_MODE on the server.";
      results.textContent = `Prompt generation failed: ${error.message}`;
    } finally {
      setButtonLoading(generateBtn, false, "Generate Prompt");
    }
  });

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let latest = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        latest += event.results[i][0].transcript;
      }
      transcriptBuffer = `${transcriptBuffer} ${latest}`.trim();
      transcriptBox.value = transcriptBuffer;
    };

    recognition.onend = () => {
      isRecording = false;
    };
  } else {
    results.textContent =
      "Speech recognition is not supported in this browser. You can still type transcript manually.";
  }

  recordBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (isRecording) return;
    transcriptBuffer = transcriptBox.value.trim();
    try {
      recognition.start();
      isRecording = true;
      results.textContent = "Recording started. Speak clearly and naturally.";
    } catch (error) {
      results.textContent = "Could not start recording. Check microphone permissions.";
    }
  });

  stopBtn.addEventListener("click", () => {
    if (!recognition || !isRecording) return;
    recognition.stop();
    isRecording = false;
    results.textContent = "Recording stopped.";
  });

  // Realtime (beta) voice-to-voice mode
  if (realtimeToggle && realtimeStartBtn && realtimeStopBtn && realtimeStatus) {
    realtimeState = createRealtimeState({
      transcriptBox,
      results,
      realtimeStatus,
      modePicker,
      durationPicker,
      difficultyPicker,
    });

    const syncButtons = () => {
      const enabled = Boolean(realtimeToggle.checked);
      realtimeStartBtn.disabled = !enabled || realtimeState.running;
      realtimeStopBtn.disabled = !enabled || !realtimeState.running;
      realtimeStatus.textContent = enabled ? (realtimeState.running ? realtimeState.status : "Ready") : "Off";
    };

    realtimeToggle.addEventListener("change", async () => {
      if (!realtimeToggle.checked) {
        await realtimeState.stop();
        realtimeState.status = "Off";
      } else {
        realtimeState.status = "Ready";
      }
      syncButtons();
    });

    realtimeStartBtn.addEventListener("click", async () => {
      syncButtons();
      await realtimeState.start();
      syncButtons();
    });

    realtimeStopBtn.addEventListener("click", async () => {
      await realtimeState.stop();
      syncButtons();
    });

    syncButtons();
  }

  evaluateBtn.addEventListener("click", async () => {
    const transcript = transcriptBox.value.trim();
    if (!transcript) {
      results.textContent = "Add or record a transcript before evaluation.";
      return;
    }

    if (!currentPromptObject) {
      results.textContent = "Generate a prompt first (so grading matches your scene).";
      return;
    }

    const mode = modePicker.value;
    const duration = Number(durationPicker.value) || 60;

    setButtonLoading(evaluateBtn, true, "Evaluating…");
    results.textContent = "Evaluating like an acting coach + casting director…";

    try {
      const gradeObj = await postJson("/api/grade", {
        mode,
        duration,
        promptObject: currentPromptObject,
        transcript,
      });

      results.innerHTML = renderGradeResults(gradeObj);
      saveVoiceFeedback({
        date: new Date().toISOString(),
        mode,
        duration,
        promptTitle: currentPromptObject?.title || "—",
        transcriptSnippet: transcript.slice(0, 200) + (transcript.length > 200 ? "…" : ""),
        gradeObj,
      });
      renderVoiceFeedbackHistory();
    } catch (error) {
      // Fallback: basic local evaluation if backend is down.
      results.innerHTML = renderLocalFallbackEvaluation(transcript, duration);
      const footer = document.createElement("div");
      footer.style.marginTop = "10px";
      footer.style.color = "#7c6f63";
      footer.textContent = `Backend grading failed: ${error.message}`;
      results.appendChild(footer);
    } finally {
      setButtonLoading(evaluateBtn, false, "Evaluate");
    }
  });

  renderVoiceFeedbackHistory();
}

function createAmbientParticles() {
  const starsLayer = document.getElementById("stars-layer");
  const shootingLayer = document.getElementById("shooting-stars-layer");
  const flowersLayer = document.getElementById("flowers-layer");
  const heartsLayer = document.getElementById("hearts-layer");
  const heartsLayer2 = document.getElementById("hearts-layer-2");
  const heartsLayer3 = document.getElementById("hearts-layer-3");

  if (starsLayer) {
    for (let i = 0; i < 220; i += 1) {
      const star = document.createElement("span");
      star.className = "star-dot";
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDuration = `${3 + Math.random() * 7}s`;
      star.style.animationDelay = `${Math.random() * 8}s`;
      starsLayer.appendChild(star);
    }
  }

  if (shootingLayer) {
    const shootingStarCount = 14;
    const angleClasses = ["", "shooting-star-angle2", "shooting-star-angle3", ""];
    const longClass = "shooting-star-long";
    for (let i = 0; i < shootingStarCount; i += 1) {
      const streak = document.createElement("div");
      streak.className = "shooting-star " + (i % 3 === 0 ? longClass : "") + " " + (angleClasses[i % 4] || "");
      streak.style.left = `${Math.random() * 100}%`;
      streak.style.top = `${Math.random() * 35}%`;
      streak.style.animationDelay = `${i * 2.2 + Math.random() * 4}s`;
      streak.style.animationDuration = `${1.4 + Math.random() * 1}s`;
      shootingLayer.appendChild(streak);
    }
  }

  const flowerChars = ["🌹", "🌸", "💐", "🌷", "🌺"];
  if (flowersLayer) {
    for (let i = 0; i < 42; i += 1) {
      const flower = document.createElement("span");
      flower.className = "flower-float";
      flower.textContent = flowerChars[i % flowerChars.length];
      flower.style.left = `${Math.random() * 100}%`;
      flower.style.animationDuration = `${14 + Math.random() * 20}s`;
      flower.style.animationDelay = `${Math.random() * 15}s`;
      flower.style.fontSize = `${16 + Math.random() * 20}px`;
      flowersLayer.appendChild(flower);
    }
  }

  const heartChars = ["❤", "💕", "💗", "💖", "💝", "✨"];
  if (heartsLayer) {
    for (let i = 0; i < 38; i += 1) {
      const heart = document.createElement("span");
      heart.className = "heart-float";
      heart.textContent = heartChars[i % heartChars.length];
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDuration = `${12 + Math.random() * 18}s`;
      heart.style.animationDelay = `${Math.random() * 12}s`;
      heart.style.fontSize = `${14 + Math.random() * 20}px`;
      heartsLayer.appendChild(heart);
    }
  }

  if (heartsLayer2) {
    for (let i = 0; i < 26; i += 1) {
      const heart = document.createElement("span");
      heart.className = "heart-float heart-pulse";
      heart.textContent = ["❤", "💕", "💗"][i % 3];
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDuration = `${16 + Math.random() * 14}s`;
      heart.style.animationDelay = `${Math.random() * 10}s`;
      heart.style.fontSize = `${12 + Math.random() * 14}px`;
      heartsLayer2.appendChild(heart);
    }
  }

  if (heartsLayer3) {
    for (let i = 0; i < 22; i += 1) {
      const heart = document.createElement("span");
      heart.className = "heart-float";
      heart.textContent = ["♥", "💕", "❤", "💗"][i % 4];
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDuration = `${18 + Math.random() * 16}s`;
      heart.style.animationDelay = `${Math.random() * 14}s`;
      heart.style.fontSize = `${10 + Math.random() * 12}px`;
      heartsLayer3.appendChild(heart);
    }
  }
}

function escapeHtml(value) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value).replace(/[&<>"']/g, (char) => map[char]);
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: "Non-JSON response", raw: text };
  }

  if (!res.ok) {
    const msg = data?.error ? String(data.error) : `HTTP ${res.status}`;
    const sub = data?.message ? `: ${String(data.message)}` : "";
    const details = data?.details ? ` — ${JSON.stringify(data.details)}` : "";
    throw new Error(`${msg}${sub}${details}`);
  }
  return data;
}

function setButtonLoading(button, loading, label) {
  if (!button) return;
  button.disabled = Boolean(loading);
  button.style.opacity = loading ? "0.75" : "1";
  if (label) button.textContent = label;
}

function renderPromptCard(p) {
  return `
    <div><strong>${escapeHtml(p.title)}</strong></div>
    <div style="margin-top:8px"><strong>Context:</strong> ${escapeHtml(p.context)}</div>
    <div style="margin-top:6px"><strong>Objective:</strong> ${escapeHtml(p.objective)}</div>
    <div style="margin-top:6px"><strong>Constraint:</strong> ${escapeHtml(p.constraint)}</div>
    <div style="margin-top:6px"><strong>Required Beat:</strong> ${escapeHtml(p.requiredBeat)}</div>
    <div style="margin-top:8px"><strong>Casting Note:</strong> ${escapeHtml(
      p.castingDirectorNote
    )}</div>
  `;
}

function renderGradeResults(g) {
  const s = g.scores || {};
  const scoreLine = (label, val) =>
    `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(val)}</div>`;

  const notes = Array.isArray(g.notes)
    ? `<ul style="margin:8px 0 0; padding-left:18px">${g.notes
        .map((n) => `<li>${escapeHtml(n)}</li>`)
        .join("")}</ul>`
    : "";

  return `
    <div><strong>Overall:</strong> ${escapeHtml(g.overall)} / 10</div>
    <div style="margin-top:10px"><strong>Rubric</strong></div>
    ${scoreLine("Diction", s.diction)}
    ${scoreLine("Emotion", s.emotion)}
    ${scoreLine("Intent", s.intent)}
    ${scoreLine("Dynamics", s.dynamics)}
    ${scoreLine("Presence", s.presence)}
    ${scoreLine("Bollywood Tone", s.bollywoodTone)}
    <div style="margin-top:12px"><strong>Casting Note:</strong> ${escapeHtml(g.castingNote)}</div>
    <div style="margin-top:10px"><strong>Notes:</strong>${notes}</div>
    <div style="margin-top:10px"><strong>Drill:</strong> ${escapeHtml(g.drill)}</div>
    <div style="margin-top:10px"><strong>Take 2 Direction:</strong> ${escapeHtml(g.take2)}</div>
  `;
}

const VOICE_FEEDBACK_MAX = 50;

function getVoiceFeedbackHistory() {
  const raw = localStorage.getItem(STORAGE_KEYS.voiceFeedbackHistory);
  let list = [];
  try {
    list = JSON.parse(raw || "[]");
  } catch {
    list = [];
  }
  return Array.isArray(list) ? list : [];
}

function saveVoiceFeedback(entry) {
  let list = getVoiceFeedbackHistory();
  list.unshift(entry);
  list = list.slice(0, VOICE_FEEDBACK_MAX);
  localStorage.setItem(STORAGE_KEYS.voiceFeedbackHistory, JSON.stringify(list));
}

function renderVoiceFeedbackHistory() {
  const listEl = document.getElementById("voice-feedback-history-list");
  const viewEl = document.getElementById("voice-feedback-view");
  if (!listEl) return;

  const list = getVoiceFeedbackHistory();
  listEl.innerHTML = "";

  if (list.length === 0) {
    listEl.innerHTML = '<p class="muted">No saved feedback yet. Evaluate a take to save it here.</p>';
    return;
  }

  list.forEach((entry, index) => {
    const dateStr = entry.date ? new Date(entry.date).toLocaleDateString(undefined, { dateStyle: "short" }) : "—";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-soft past-feedback-btn";
    btn.textContent = `${dateStr} · ${entry.mode || "—"} · ${entry.gradeObj?.overall ?? "—"}/10`;
    btn.addEventListener("click", () => {
      if (!viewEl) return;
      viewEl.classList.remove("hidden");
      viewEl.innerHTML = `
        <strong>${escapeHtml(dateStr)}</strong> · ${escapeHtml(entry.mode || "—")} (${entry.duration || 60}s)
        <p class="muted" style="margin-top:6px">Prompt: ${escapeHtml(entry.promptTitle || "—")}</p>
        <div style="margin-top:12px">${renderGradeResults(entry.gradeObj || {})}</div>
        ${entry.transcriptSnippet ? `<p style="margin-top:12px" class="muted"><strong>Transcript snippet:</strong> ${escapeHtml(entry.transcriptSnippet)}</p>` : ""}
        <button type="button" class="btn btn-soft close-view-feedback-btn" style="margin-top:14px">Close</button>
      `;
      viewEl.querySelector(".close-view-feedback-btn")?.addEventListener("click", () => viewEl.classList.add("hidden"));
    });
    listEl.appendChild(btn);
  });
}

function renderLocalFallbackEvaluation(transcript, durationSeconds) {
  const words = transcript.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wpm = Math.round((wordCount / (Number(durationSeconds) || 60)) * 60);
  const fillerCount = (transcript.match(/\b(um|uh|like|you know)\b/gi) || []).length;
  const punctuationCount = (transcript.match(/[.!?]/g) || []).length;
  const paceTag = wpm < 95 ? "slow" : wpm > 165 ? "fast" : "balanced";
  const clarityTag = fillerCount <= 2 ? "clean" : "needs cleanup";
  const expressionTag = punctuationCount >= 2 ? "expressive" : "flat";

  return `
    <strong>Fallback Snapshot (local)</strong><br />
    Words: ${wordCount} | Pace: ${wpm} WPM (${paceTag})<br />
    Fillers: ${fillerCount} (${clarityTag})<br />
    Expression markers: ${punctuationCount} (${expressionTag})<br />
    Coaching cue: Add intentional pauses, vary pitch on emotional words, and keep consonants crisp.
  `;
}

function createRealtimeState({
  transcriptBox,
  results,
  realtimeStatus,
  modePicker,
  durationPicker,
  difficultyPicker,
}) {
  let ws = null;
  let micStream = null;
  let inCtx = null;
  let inSource = null;
  let processor = null;
  let zeroGain = null;

  let outCtx = null;
  let nextPlayTime = 0;
  let running = false;
  let status = "Off";
  let assistantTranscript = "";

  const setStatus = (text) => {
    status = text;
    realtimeStatus.textContent = text;
  };

  const closeWs = () => {
    if (!ws) return;
    try {
      ws.close();
    } catch {
      // ignore
    }
    ws = null;
  };

  const stopAudio = async () => {
    if (processor) {
      try {
        processor.disconnect();
      } catch {
        // ignore
      }
      processor.onaudioprocess = null;
      processor = null;
    }
    if (inSource) {
      try {
        inSource.disconnect();
      } catch {
        // ignore
      }
      inSource = null;
    }
    if (zeroGain) {
      try {
        zeroGain.disconnect();
      } catch {
        // ignore
      }
      zeroGain = null;
    }
    if (inCtx) {
      try {
        await inCtx.close();
      } catch {
        // ignore
      }
      inCtx = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
  };

  const schedulePcm16 = async (pcm16Bytes) => {
    if (!outCtx) {
      outCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    if (outCtx.state === "suspended") {
      await outCtx.resume().catch(() => {});
    }
    const int16 = new Int16Array(pcm16Bytes.buffer, pcm16Bytes.byteOffset, pcm16Bytes.byteLength / 2);
    const buffer = outCtx.createBuffer(1, int16.length, 24000);
    const ch0 = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i += 1) ch0[i] = int16[i] / 32768;

    const src = outCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(outCtx.destination);
    const now = outCtx.currentTime;
    if (nextPlayTime < now + 0.02) nextPlayTime = now + 0.02;
    src.start(nextPlayTime);
    nextPlayTime += buffer.duration;
  };

  const handleServerEvent = async (evt) => {
    const type = evt?.type;
    if (!type) return;

    if (type === "error") {
      setStatus(`Error: ${evt?.error?.message || "Unknown"}`);
      return;
    }

    if (type === "session.created") {
      setStatus("Connected. Speak when ready.");
      return;
    }

    if (type === "conversation.item.input_audio_transcription.delta" && typeof evt.delta === "string") {
      // User speech transcription (rough guidance)
      transcriptBox.value = `${transcriptBox.value}${evt.delta}`.trimStart();
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed" && typeof evt.transcript === "string") {
      transcriptBox.value = evt.transcript;
      return;
    }

    // Assistant transcript (what the model spoke)
    if (type === "response.output_audio_transcript.delta" && typeof evt.delta === "string") {
      assistantTranscript += evt.delta;
      results.textContent = assistantTranscript.trim() ? assistantTranscript.trim() : "Coach responding…";
      return;
    }

    if (type === "response.output_audio_transcript.done") {
      // keep accumulated transcript visible
      return;
    }

    // Assistant audio chunks
    if (type === "response.output_audio.delta") {
      const b64 = evt.delta || evt.audio;
      if (typeof b64 === "string" && b64.length) {
        const bytes = base64ToBytes(b64);
        await schedulePcm16(bytes);
      }
      return;
    }

    if (type === "response.done") {
      // reset transcript for next turn
      assistantTranscript = "";
    }
  };

  const start = async () => {
    if (running) return;
    running = true;
    assistantTranscript = "";
    transcriptBox.value = "";
    setStatus("Starting…");

    try {
      const mode = modePicker.value;
      const duration = Number(durationPicker.value) || 60;
      const difficulty = difficultyPicker?.value || "Medium";

      const token = await postJson("/api/realtime-token", { mode, duration, difficulty });
      const wsUrl = token.ws_url || "wss://api.openai.com/v1/realtime?model=gpt-realtime";
      const clientSecret = token.value;

      if (!clientSecret) throw new Error("Missing realtime token value.");

      ws = new WebSocket(wsUrl, ["realtime", `openai-insecure-api-key.${clientSecret}`]);

      let wsErrorTimeout = null;
      ws.addEventListener("open", async () => {
        if (wsErrorTimeout) clearTimeout(wsErrorTimeout);
        wsErrorTimeout = null;
        setStatus("WebSocket open. Enabling mic…");
        results.textContent =
          "Realtime (beta) is on. Speak naturally — you’ll get short spoken feedback.";

        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        inCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (inCtx.state === "suspended") {
          await inCtx.resume().catch(() => {});
        }
        inSource = inCtx.createMediaStreamSource(micStream);
        processor = inCtx.createScriptProcessor(4096, 1, 1);
        zeroGain = inCtx.createGain();
        zeroGain.gain.value = 0;

        processor.onaudioprocess = (e) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const pcm16 = floatToPcm16Downsample(input, inCtx.sampleRate, 24000);
          if (!pcm16 || pcm16.length === 0) return;
          const b64 = bytesToBase64(new Uint8Array(pcm16.buffer));
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
        };

        inSource.connect(processor);
        processor.connect(zeroGain);
        zeroGain.connect(inCtx.destination);

        setStatus("Live. Listening…");
      });

      ws.addEventListener("message", async (msg) => {
        let data;
        try {
          data = JSON.parse(msg.data);
        } catch {
          return;
        }
        await handleServerEvent(data);
      });

      ws.addEventListener("close", () => {
        if (wsErrorTimeout) clearTimeout(wsErrorTimeout);
        wsErrorTimeout = null;
        if (running) setStatus("Closed");
      });

      ws.addEventListener("error", () => {
        if (!running) return;
        if (wsErrorTimeout) return;
        wsErrorTimeout = setTimeout(() => {
          wsErrorTimeout = null;
          if (running && ws?.readyState !== WebSocket.OPEN) setStatus("WebSocket error");
        }, 1500);
      });
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
      if (results) {
        results.textContent = "";
        const p = document.createElement("p");
        p.style.color = "var(--velvet)";
        p.textContent = `Could not start Realtime: ${err.message}`;
        results.appendChild(p);
        const hint = document.createElement("p");
        hint.className = "muted";
        hint.style.marginTop = "8px";
        hint.textContent = "Check that OPENAI_API_KEY is set in Vercel and your OpenAI account has Realtime API access.";
        results.appendChild(hint);
      }
      running = false;
      closeWs();
      await stopAudio();
    }
  };

  const stop = async () => {
    if (!running) return;
    running = false;
    setStatus("Stopping…");
    closeWs();
    await stopAudio();
    setStatus("Stopped");
  };

  return {
    get running() {
      return running;
    },
    get status() {
      return status;
    },
    set status(v) {
      status = v;
      realtimeStatus.textContent = v;
    },
    start,
    stop,
  };
}

function floatToPcm16Downsample(float32, inRate, outRate) {
  if (!float32 || float32.length === 0) return new Int16Array(0);
  if (inRate === outRate) return floatToPcm16(float32);

  const ratio = inRate / outRate;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Int16Array(outLen);

  let offset = 0;
  for (let i = 0; i < outLen; i += 1) {
    const nextOffset = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = Math.floor(offset); j < nextOffset && j < float32.length; j += 1) {
      sum += float32[j];
      count += 1;
    }
    offset = nextOffset;
    let sample = count ? sum / count : 0;
    sample = Math.max(-1, Math.min(1, sample));
    out[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return out;
}

function floatToPcm16(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return out;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
