const grid = document.getElementById("grid");
const timeLabels = document.getElementById("time-labels");
const popover = document.getElementById("popover");
const titleInput = document.getElementById("titleInput");
const purposeInput = document.getElementById("purposeInput");
const startReadout = document.getElementById("startReadout");
const endReadout = document.getElementById("endReadout");
const deleteBtn = document.getElementById("deleteBtn");
const closeBtn = document.getElementById("closeBtn");
const logList = document.getElementById("logList");
const copyBtn = document.getElementById("copyBtn");

const START_MINUTES = 8 * 60;
const END_MINUTES = 19 * 60;
const SLOT_MINUTES = 5;
const TOTAL_SLOTS = (END_MINUTES - START_MINUTES) / SLOT_MINUTES;
const SLOT_HEIGHT = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--slot-height"), 10);

const events = [];
let activeId = null;
let dragState = null;

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
  events.forEach((event) => {
    const el = document.createElement("div");
    el.className = "event" + (event.id === activeId ? " selected" : "");
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

function renderLog() {
  if (events.length === 0) {
    logList.textContent = "아직 기록된 일정이 없습니다.";
    return;
  }
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
  logList.textContent = lines.join("\n");
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
  if (e.target.closest(".event")) return;
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
    const index = events.findIndex((ev) => ev.id === activeId);
    if (index >= 0) events.splice(index, 1);
    setActive(null);
  });

  copyBtn.addEventListener("click", async () => {
    const text = logList.textContent.trim();
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
