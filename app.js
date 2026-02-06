const grid = document.getElementById("grid");
const timeLabels = document.getElementById("time-labels");
const popover = document.getElementById("popover");
const titleInput = document.getElementById("titleInput");
const purposeInput = document.getElementById("purposeInput");
const startReadout = document.getElementById("startReadout");
const endReadout = document.getElementById("endReadout");
const deleteBtn = document.getElementById("deleteBtn");
const closeBtn = document.getElementById("closeBtn");
const logTbody = document.getElementById("logTbody");
const logTable = document.getElementById("logTable");
const newTitle = document.getElementById("newTitle");
const newStart = document.getElementById("newStart");
const newEnd = document.getElementById("newEnd");
const newPurpose = document.getElementById("newPurpose");
const addRowBtn = document.getElementById("addRowBtn");
const copyBtn = document.getElementById("copyBtn");

const START_MINUTES = 8 * 60;
const END_MINUTES = 19 * 60;
const SLOT_MINUTES = 5;
const TOTAL_SLOTS = (END_MINUTES - START_MINUTES) / SLOT_MINUTES;
const SLOT_HEIGHT = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--slot-height"), 10);

const events = [];
let activeId = null;
let dragState = null;

function isTextEditingElement(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function timeStrToSlot(timeStr) {
  // timeStr: "HH:MM"
  if (!timeStr || !/^[0-2]\d:[0-5]\d$/.test(timeStr)) return null;
  const [hh, mm] = timeStr.split(":").map(Number);
  const total = hh * 60 + mm;
  const mins = total - START_MINUTES;
  const slot = Math.round(mins / SLOT_MINUTES);
  return clamp(slot, 0, TOTAL_SLOTS);
}

function slotToTimeStr(slot) {
  return minutesToTime(slot * SLOT_MINUTES);
}

function minutesToTime(mins) {
  const total = START_MINUTES + mins;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotToPixels(slot) {
  return slot * SLOT_HEIGHT;
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

  // Duplicate detection: same (trimmed) 업무명 entered more than once (ignore empty)
  const counts = new Map();
  events.forEach((ev) => {
    const key = (ev.title || "").trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  events.forEach((event) => {
    const el = document.createElement("div");
    const key = (event.title || "").trim();
    const isDup = key && (counts.get(key) || 0) > 1;

    el.className =
      "event" +
      (event.id === activeId ? " selected" : "") +
      (isDup ? " duplicate" : "");
    el.dataset.id = event.id;
    el.style.top = `${slotToPixels(event.start)}px`;
    el.style.height = `${slotToPixels(event.end - event.start)}px`;

    const title = event.title || "(업무명 없음)";
    const timeText = `${minutesToTime(event.start * SLOT_MINUTES)} - ${minutesToTime(
      event.end * SLOT_MINUTES
    )}`;

    const line = document.createElement("div");
    line.className = "event-line";
    line.textContent = `${title} · ${timeText}`;

    const handleTop = document.createElement("div");
    handleTop.className = "resize-handle top";

    const handleBottom = document.createElement("div");
    handleBottom.className = "resize-handle bottom";

    el.appendChild(line);
    el.appendChild(handleTop);
    el.appendChild(handleBottom);

    grid.appendChild(el);
  });

  renderLog();
}

function renderLog() {
  logTbody.innerHTML = "";

  const sorted = events.slice().sort((a, b) => a.start - b.start);

  sorted.forEach((event) => {
    const tr = document.createElement("tr");
    tr.dataset.id = event.id;
    if (event.id === activeId) tr.classList.add("selected-row");

    const tdTitle = document.createElement("td");
    const inpTitle = document.createElement("input");
    inpTitle.type = "text";
    inpTitle.value = event.title || "";
    inpTitle.placeholder = "(업무명 없음)";
    inpTitle.addEventListener("input", (e) => {
      event.title = e.target.value;
      renderEvents();
    });
    tdTitle.appendChild(inpTitle);

    const tdStart = document.createElement("td");
    const inpStart = document.createElement("input");
    inpStart.type = "time";
    inpStart.step = "300";
    inpStart.value = slotToTimeStr(event.start);
    inpStart.addEventListener("change", (e) => {
      const slot = timeStrToSlot(e.target.value);
      if (slot === null) return;
      event.start = clamp(slot, 0, event.end - 1);
      renderEvents();
    });
    tdStart.appendChild(inpStart);

    const tdEnd = document.createElement("td");
    const inpEnd = document.createElement("input");
    inpEnd.type = "time";
    inpEnd.step = "300";
    inpEnd.value = slotToTimeStr(event.end);
    inpEnd.addEventListener("change", (e) => {
      const slot = timeStrToSlot(e.target.value);
      if (slot === null) return;
      event.end = clamp(slot, event.start + 1, TOTAL_SLOTS);
      renderEvents();
    });
    tdEnd.appendChild(inpEnd);

    const tdPurpose = document.createElement("td");
    const inpPurpose = document.createElement("input");
    inpPurpose.type = "text";
    inpPurpose.value = event.purpose || "";
    inpPurpose.placeholder = "(목적 없음)";
    inpPurpose.addEventListener("input", (e) => {
      event.purpose = e.target.value;
      renderEvents();
    });
    tdPurpose.appendChild(inpPurpose);

    const tdActions = document.createElement("td");
    tdActions.className = "col-actions";

    const selectBtn = document.createElement("button");
    selectBtn.className = "small row-select";
    selectBtn.textContent = "선택";
    selectBtn.addEventListener("click", () => setActive(event.id));

    const delBtn = document.createElement("button");
    delBtn.className = "small row-delete";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", () => {
      const idx = events.findIndex((ev) => ev.id === event.id);
      if (idx >= 0) events.splice(idx, 1);
      if (activeId === event.id) setActive(null);
      else renderEvents();
    });

    tdActions.appendChild(selectBtn);
    tdActions.appendChild(delBtn);

    tr.appendChild(tdTitle);
    tr.appendChild(tdStart);
    tr.appendChild(tdEnd);
    tr.appendChild(tdPurpose);
    tr.appendChild(tdActions);

    logTbody.appendChild(tr);
  });

  // Initialize "new row" defaults
  if (!newStart.value) newStart.value = "08:00";
  if (!newEnd.value) newEnd.value = "08:30";
}

function setActive(id) {
  activeId = id;
  const event = events.find((e) => e.id === id);
  if (!event) {
    titleInput.value = "";
    purposeInput.value = "";
    startReadout.textContent = "-";
    endReadout.textContent = "-";
    deleteBtn.disabled = true;
    popover.classList.add("hidden");
  } else {
    titleInput.value = event.title || "";
    purposeInput.value = event.purpose || "";
    startReadout.textContent = minutesToTime(event.start * SLOT_MINUTES);
    endReadout.textContent = minutesToTime(event.end * SLOT_MINUTES);
    deleteBtn.disabled = false;
    positionPopover(id);
    popover.classList.remove("hidden");
  }
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
  event[field] = value;
  renderEvents();
}

function pointToSlot(clientY) {
  const rect = grid.getBoundingClientRect();
  const y = clamp(clientY - rect.top, 0, rect.height);
  const slot = Math.round(y / SLOT_HEIGHT);
  return clamp(slot, 0, TOTAL_SLOTS);
}

function onPointerDownGrid(e) {
  // Do not create blocks when interacting with UI controls (popover, inputs, buttons, etc.)
  if (e.target.closest(".event")) return;
  if (e.target.closest("#popover")) return;
  if (e.target.closest("input, textarea, select, button, label")) return;
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

  const targetHandle = e.target.closest(".resize-handle");
  if (targetHandle) {
    dragState = {
      type: targetHandle.classList.contains("top") ? "resize-top" : "resize-bottom",
      id,
      start: event.start,
      end: event.end,
    };
    return;
  }

  const gridRect = grid.getBoundingClientRect();
  const offsetPx = e.clientY - gridRect.top - eventEl.offsetTop;
  dragState = {
    type: "move",
    id,
    offsetPx,
    length: event.end - event.start,
  };

  setActive(id);
}

function onPointerMove(e) {
  if (!dragState) return;
  const event = events.find((ev) => ev.id === dragState.id);
  if (!event) return;

  if (dragState.type === "create") {
    const currentSlot = pointToSlot(e.clientY);
    if (currentSlot !== dragState.anchor) dragState.moved = true;
    event.start = clamp(Math.min(dragState.anchor, currentSlot), 0, TOTAL_SLOTS - 1);
    event.end = clamp(Math.max(dragState.anchor + 1, currentSlot), 1, TOTAL_SLOTS);
  }

  if (dragState.type === "move") {
    const gridRect = grid.getBoundingClientRect();
    const y = e.clientY - gridRect.top - dragState.offsetPx;
    const slot = clamp(Math.round(y / SLOT_HEIGHT), 0, TOTAL_SLOTS);
    const start = clamp(slot, 0, TOTAL_SLOTS - dragState.length);
    event.start = start;
    event.end = start + dragState.length;
  }

  if (dragState.type === "resize-top") {
    const slot = pointToSlot(e.clientY);
    event.start = clamp(Math.min(slot, event.end - 1), 0, event.end - 1);
  }

  if (dragState.type === "resize-bottom") {
    const slot = pointToSlot(e.clientY);
    event.end = clamp(Math.max(slot, event.start + 1), event.start + 1, TOTAL_SLOTS);
  }

  renderEvents();
}

function onPointerUp() {
  if (dragState && dragState.type === "create" && !dragState.moved) {
    const event = events.find((ev) => ev.id === dragState.id);
    if (event) {
      const defaultLength = 6; // 30 minutes in 5-min slots
      event.end = clamp(event.start + defaultLength, event.start + 1, TOTAL_SLOTS);
    }
    setActive(dragState.id);
    titleInput.focus();
  }
  dragState = null;
}

function wireInputs() {
  addRowBtn.addEventListener("click", () => {
    const title = (newTitle.value || "").trim();
    const purpose = (newPurpose.value || "").trim();
    const s = timeStrToSlot(newStart.value);
    const e = timeStrToSlot(newEnd.value);
    if (s === null || e === null) return;
    const start = clamp(Math.min(s, e - 1), 0, TOTAL_SLOTS - 1);
    const end = clamp(Math.max(e, start + 1), start + 1, TOTAL_SLOTS);
    const event = { id: crypto.randomUUID(), start, end, title, purpose };
    events.push(event);
    setActive(event.id);
    newTitle.value = "";
    newPurpose.value = "";
  });

  [newTitle, newStart, newEnd, newPurpose].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addRowBtn.click();
      }
    });
  });

  titleInput.addEventListener("input", (e) => updateActiveField("title", e.target.value));
  purposeInput.addEventListener("input", (e) => updateActiveField("purpose", e.target.value));
  deleteBtn.addEventListener("click", () => {
    if (!activeId) return;
    const index = events.findIndex((e) => e.id === activeId);
    if (index >= 0) events.splice(index, 1);
    setActive(null);
  });

  closeBtn.addEventListener("click", () => {
    setActive(null);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setActive(null);
  });

  window.addEventListener("keydown", (e) => {
  if (!activeId) return;
  if (e.key !== "Delete" && e.key !== "Backspace") return;

  // If the user is typing in an input, don't delete the block.
  if (isTextEditingElement(document.activeElement)) return;

  const index = events.findIndex((ev) => ev.id === activeId);
  if (index >= 0) events.splice(index, 1);
  setActive(null);
});

  copyBtn.addEventListener("click", async () => {
    const lines = events
  .slice()
  .sort((a, b) => a.start - b.start)
  .map((event) => {
    const start = minutesToTime(event.start * SLOT_MINUTES);
    const end = minutesToTime(event.end * SLOT_MINUTES);
    const title = event.title || "(업무명 없음)";
    const purpose = event.purpose || "(목적 없음)";
    return `${title} / ${start} / ${end} / ${purpose}`;
  });
const text = lines.join("\n").trim();
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

function init() {
  createTimeLabels();
  grid.addEventListener("pointerdown", onPointerDownGrid);
  grid.addEventListener("pointerdown", onPointerDownEvent);
  grid.addEventListener("pointerdown", (e) => {
    if (e.target === grid) setActive(null);
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

function positionPopover(id) {
  const eventEl = grid.querySelector(`.event[data-id="${id}"]`);
  if (!eventEl) return;
  const gridRect = grid.getBoundingClientRect();
  const eventRect = eventEl.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();

  let top = eventRect.top - gridRect.top;
  let left = eventRect.right - gridRect.left + 8;

  if (left + popoverRect.width > gridRect.width) {
    left = eventRect.left - gridRect.left - popoverRect.width - 8;
  }
  if (left < 8) left = 8;

  if (top + popoverRect.height > gridRect.height) {
    top = gridRect.height - popoverRect.height - 8;
  }
  if (top < 8) top = 8;

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}
