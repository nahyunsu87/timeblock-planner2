const grid = document.getElementById("grid");
const timeLabels = document.getElementById("time-labels");
const popover = document.getElementById("popover");
const backdrop = document.getElementById("popover-backdrop");
const titleInput = document.getElementById("titleInput");
const purposeInput = document.getElementById("purposeInput");
const startReadout = document.getElementById("startReadout");
const endReadout = document.getElementById("endReadout");
const deleteBtn = document.getElementById("deleteBtn");
const closeBtn = document.getElementById("closeBtn");
const logList = document.getElementById("logList");
const copyBtn = document.getElementById("copyBtn");
const manualLog = document.getElementById("manualLog");

const START_MINUTES = 8 * 60;
const END_MINUTES = 19 * 60;
const SLOT_MINUTES = 5;
const TOTAL_SLOTS = (END_MINUTES - START_MINUTES) / SLOT_MINUTES;

function getSlotHeight() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue("--slot-height"), 10);
}

const events = [];
let activeId = null;
let dragState = null;
const undoStack = [];
let isRestoring = false;

function isMobile() {
  return window.innerWidth <= 600;
}

function minutesToTime(mins) {
  const total = START_MINUTES + mins;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotToPixels(slot) {
  return slot * getSlotHeight();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createTimeLabels() {
  for (let h = 8; h <= 19; h++) {
    const label = document.createElement("div");
    label.className = "time-label";
    const slot = (h * 60 - START_MINUTES) / SLOT_MINUTES;
    label.style.top = `${slotToPixels(slot)}px`;
    label.textContent = `${String(h).padStart(2, "0")}:00`;
    timeLabels.appendChild(label);
  }
}

function renderEvents() {
  grid.querySelectorAll(".event").forEach((el) => el.remove());

  const titleKeyCounts = new Map();
  for (const ev of events) {
    const key = (ev.title || "").trim().replace(/\s+/g, " ").toLowerCase();
    if (!key) continue;
    titleKeyCounts.set(key, (titleKeyCounts.get(key) || 0) + 1);
  }

  events.forEach((event) => {
    const el = document.createElement("div");
    const key = (event.title || "").trim().replace(/\s+/g, " ").toLowerCase();
    const isDup = !!key && (titleKeyCounts.get(key) || 0) > 1;
    const isCompact = (event.end - event.start) <= 2;
    el.className = "event"
      + (event.id === activeId ? " selected" : "")
      + (isDup ? " duplicate" : "")
      + (isCompact ? " compact" : "");
    el.dataset.id = event.id;
    el.style.top = `${slotToPixels(event.start)}px`;
    el.style.height = `${slotToPixels(event.end - event.start)}px`;

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = event.title || "(업무명 없음)";

    const time = document.createElement("div");
    time.className = "event-time";
    time.textContent = `${minutesToTime(event.start * SLOT_MINUTES)} - ${minutesToTime(event.end * SLOT_MINUTES)}`;

    const handleTop = document.createElement("div");
    handleTop.className = "resize-handle top";

    const handleBottom = document.createElement("div");
    handleBottom.className = "resize-handle bottom";

    el.appendChild(title);
    el.appendChild(time);
    el.appendChild(handleTop);
    el.appendChild(handleBottom);

    grid.appendChild(el);
  });

  renderLog();
}

function getSortedEvents() {
  return events.slice().sort((a, b) => a.start - b.start);
}

function getAutoLogText() {
  if (events.length === 0) return "";
  return getSortedEvents()
    .map((event) => {
      const start = minutesToTime(event.start * SLOT_MINUTES);
      const end = minutesToTime(event.end * SLOT_MINUTES);
      const title = event.title || "(업무명 없음)";
      const purpose = event.purpose || "(목적 없음)";
      return `${start} / ${end} / ${title} / ${purpose}`;
    })
    .join("\n");
}

function renderLog() {
  logList.replaceChildren();

  if (events.length === 0) {
    const empty = document.createElement("div");
    empty.className = "log-empty";
    empty.textContent = "아직 기록된 일정이 없습니다.";
    logList.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "log-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["시작시간", "종료 시간", "할 일", "목적"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  getSortedEvents().forEach((event) => {
    const row = document.createElement("tr");
    const start = minutesToTime(event.start * SLOT_MINUTES);
    const end = minutesToTime(event.end * SLOT_MINUTES);
    const title = event.title || "(업무명 없음)";
    const purpose = event.purpose || "(목적 없음)";

    [start, end, title, purpose].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  logList.appendChild(table);
}

function cloneEvents(list) {
  return list.map((event) => ({ ...event }));
}

function pushHistory() {
  if (isRestoring) return;
  const snapshot = {
    events: cloneEvents(events),
    activeId,
  };
  const last = undoStack[undoStack.length - 1];
  const lastSignature = last ? JSON.stringify(last.events) : "";
  const nextSignature = JSON.stringify(snapshot.events);
  if (lastSignature === nextSignature) return;
  undoStack.push(snapshot);
  if (undoStack.length > 100) undoStack.shift();
}

function restoreSnapshot(snapshot) {
  if (!snapshot) return;
  isRestoring = true;
  events.length = 0;
  snapshot.events.forEach((event) => events.push({ ...event }));
  activeId = snapshot.activeId;
  if (activeId && !events.find((event) => event.id === activeId)) {
    activeId = null;
  }
  if (activeId) {
    setActive(activeId);
  } else {
    closePopover();
  }
  isRestoring = false;
}

function getLogTextForCopy() {
  const autoText = getAutoLogText();
  const manualText = manualLog.value.trim();
  if (autoText && manualText) {
    return `${autoText}\n\n${manualText}`;
  }
  return autoText || manualText;
}

function closePopover() {
  activeId = null;
  titleInput.value = "";
  purposeInput.value = "";
  startReadout.textContent = "-";
  endReadout.textContent = "-";
  deleteBtn.disabled = true;
  popover.classList.add("hidden");
  backdrop.classList.add("hidden");
  renderEvents();
}

function setActive(id) {
  if (!id) {
    closePopover();
    return;
  }

  activeId = id;
  const event = events.find((e) => e.id === id);
  if (!event) {
    closePopover();
    return;
  }

  titleInput.value = event.title || "";
  purposeInput.value = event.purpose || "";
  startReadout.textContent = minutesToTime(event.start * SLOT_MINUTES);
  endReadout.textContent = minutesToTime(event.end * SLOT_MINUTES);
  deleteBtn.disabled = false;

  // 팝업 표시 후 위치 계산 (offsetHeight 측정을 위해)
  popover.classList.remove("hidden");
  backdrop.classList.remove("hidden");
  positionPopover(id);
  renderEvents();
}

function addEvent(startSlot, endSlot) {
  const event = {
    id: crypto.randomUUID(),
    start: startSlot,
    end: endSlot,
    title: "",
    purpose: "",
  };
  events.push(event);
  setActive(event.id);
}

function updateActiveField(field, value) {
  const event = events.find((e) => e.id === activeId);
  if (!event) return;
  pushHistory();
  event[field] = value;
  renderEvents();
}

function pointToSlot(clientY) {
  const rect = grid.getBoundingClientRect();
  const y = clamp(clientY - rect.top, 0, rect.height);
  const slot = Math.round(y / getSlotHeight());
  return clamp(slot, 0, TOTAL_SLOTS);
}

function onPointerDownGrid(e) {
  if (e.target !== grid) return;
  if (!popover.classList.contains("hidden")) {
    setActive(null);
    return;
  }
  pushHistory();
  const startSlot = pointToSlot(e.clientY);
  const endSlot = clamp(startSlot + 1, 1, TOTAL_SLOTS);
  addEvent(startSlot, endSlot);

  dragState = {
    type: "create",
    id: activeId,
    anchor: startSlot,
    moved: false,
  };
}

function onPointerDownEvent(e) {
  const eventEl = e.target.closest(".event");
  if (!eventEl) return;
  const id = eventEl.dataset.id;
  const event = events.find((ev) => ev.id === id);
  if (!event) return;

  e.preventDefault();
  e.stopImmediatePropagation();
  eventEl.setPointerCapture(e.pointerId);

  const targetHandle = e.target.closest(".resize-handle");
  if (targetHandle) {
    pushHistory();
    dragState = {
      type: targetHandle.classList.contains("top") ? "resize-top" : "resize-bottom",
      id,
      start: event.start,
      end: event.end,
      startY: e.clientY,
    };
    return;
  }

  pushHistory();
  dragState = {
    type: "move",
    id,
    startSlot: event.start,
    length: event.end - event.start,
    startX: e.clientX,
    startY: e.clientY,
    didMove: false,
  };

  setActive(id);
}

function onPointerMove(e) {
  if (!dragState) return;
  const event = events.find((ev) => ev.id === dragState.id);
  if (!event) return;

  // 모바일에서 탭과 드래그 구분 (5px 이상 이동해야 드래그)
  if (dragState.type === "move" && !dragState.didMove) {
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    dragState.didMove = true;
  }

  if (dragState.type === "create") {
    const currentSlot = pointToSlot(e.clientY);
    if (currentSlot !== dragState.anchor) dragState.moved = true;
    event.start = clamp(Math.min(dragState.anchor, currentSlot), 0, TOTAL_SLOTS - 1);
    event.end = clamp(Math.max(dragState.anchor + 1, currentSlot), 1, TOTAL_SLOTS);
  }

  if (dragState.type === "move" && dragState.didMove) {
    const deltaSlots = Math.round((e.clientY - dragState.startY) / getSlotHeight());
    const start = clamp(dragState.startSlot + deltaSlots, 0, TOTAL_SLOTS - dragState.length);
    event.start = start;
    event.end = start + dragState.length;
  }

  if (dragState.type === "resize-top") {
    const deltaSlots = Math.round((e.clientY - dragState.startY) / getSlotHeight());
    const nextStart = clamp(dragState.start + deltaSlots, 0, dragState.end - 1);
    event.start = Math.min(nextStart, event.end - 1);
  }

  if (dragState.type === "resize-bottom") {
    const deltaSlots = Math.round((e.clientY - dragState.startY) / getSlotHeight());
    const nextEnd = clamp(dragState.end + deltaSlots, dragState.start + 1, TOTAL_SLOTS);
    event.end = Math.max(nextEnd, event.start + 1);
  }

  renderEvents();
}

function onPointerUp() {
  if (dragState && dragState.type === "create" && !dragState.moved) {
    const event = events.find((ev) => ev.id === dragState.id);
    if (event) {
      const defaultLength = 6;
      event.end = clamp(event.start + defaultLength, event.start + 1, TOTAL_SLOTS);
    }
    setActive(dragState.id);
    // 모바일에서는 자동 포커스 생략 (키보드가 팝업 가림)
    if (!isMobile()) {
      titleInput.focus();
    }
  }
  dragState = null;
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function wireInputs() {
  titleInput.addEventListener("input", (e) => updateActiveField("title", e.target.value));
  purposeInput.addEventListener("input", (e) => updateActiveField("purpose", e.target.value));
  deleteBtn.addEventListener("click", () => {
    if (!activeId) return;
    pushHistory();
    const index = events.findIndex((e) => e.id === activeId);
    if (index >= 0) events.splice(index, 1);
    setActive(null);
  });

  closeBtn.addEventListener("click", () => {
    setActive(null);
  });

  // 백드롭 클릭 → 팝업 닫기
  backdrop.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(null);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setActive(null);
  });

  window.addEventListener("keydown", (e) => {
    const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z";
    if (!isUndo) return;
    if (isTypingTarget(document.activeElement)) return;
    const snapshot = undoStack.pop();
    if (!snapshot) return;
    e.preventDefault();
    restoreSnapshot(snapshot);
  });

  window.addEventListener("keydown", (e) => {
    if (!activeId) return;
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    if (isTypingTarget(document.activeElement)) return;
    // 모바일에서는 키보드 단축키 삭제 차단 (삭제 버튼 사용)
    if (isMobile()) return;
    pushHistory();
    const index = events.findIndex((ev) => ev.id === activeId);
    if (index >= 0) events.splice(index, 1);
    setActive(null);
  });

  copyBtn.addEventListener("click", async () => {
    const text = getLogTextForCopy();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "복사됨";
      setTimeout(() => (copyBtn.textContent = "전체 복사"), 1200);
    } catch {
      copyBtn.textContent = "복사 실패";
      setTimeout(() => (copyBtn.textContent = "전체 복사"), 1200);
    }
  });
}

function positionPopover(id) {
  if (isMobile()) {
    // 모바일: CSS 하단 시트가 처리
    popover.style.top = "";
    popover.style.left = "";
    return;
  }

  const eventEl = grid.querySelector(`.event[data-id="${id}"]`);
  if (!eventEl) return;
  const eventRect = eventEl.getBoundingClientRect();
  const ph = popover.offsetHeight;
  const pw = popover.offsetWidth;

  let top = eventRect.top;
  let left = eventRect.right + 8;

  if (left + pw > window.innerWidth - 16) {
    left = eventRect.left - pw - 8;
  }
  if (left < 16) left = 16;

  if (top + ph > window.innerHeight - 16) {
    top = window.innerHeight - ph - 16;
  }
  if (top < 16) top = 16;

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function init() {
  createTimeLabels();

  // 팝업 바깥 클릭 → 닫기 (Google Calendar 스타일)
  document.addEventListener("pointerdown", (e) => {
    if (popover.classList.contains("hidden")) return;
    if (popover.contains(e.target)) return;
    if (backdrop.contains(e.target)) return;
    if (e.target.closest(".event")) return;
    setActive(null);
    e.preventDefault();
    e.stopPropagation();
  }, true);

  grid.addEventListener("pointerdown", onPointerDownEvent);
  grid.addEventListener("pointerdown", onPointerDownGrid);

  // 이벤트 위에서 컨텍스트 메뉴 방지 (모바일 롱프레스)
  grid.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".event")) {
      e.preventDefault();
    }
  });

  window.addEventListener("resize", () => {
    if (activeId) positionPopover(activeId);
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  wireInputs();
  setActive(null);
}

init();
