const STORAGE_KEY = "liftlog:pwa:v1";
const UPPER_ONE_PROGRAM_NAME = "Upper 1";
const UPPER_ONE_EXERCISES = [
  {
    name: "Dumbbell Incline Bench Press",
    setCount: 4,
    repCount: 8,
    weight: 50,
    restSeconds: 90,
    unit: "lb"
  },
  {
    name: "Dumbbell Incline Bicep Curl",
    setCount: 3,
    repCount: 12,
    weight: 20,
    restSeconds: 90,
    unit: "lb"
  },
  {
    name: "Dumbbell Seated Shoulder Press",
    setCount: 3,
    repCount: 12,
    weight: 30,
    restSeconds: 90,
    unit: "lb"
  },
  {
    name: "Chest Supported Dumbbell Row at 20 Degree",
    setCount: 3,
    repCount: 10,
    weight: 50,
    restSeconds: 90,
    unit: "lb"
  },
  {
    name: "Pull up",
    setCount: 4,
    repCount: 6,
    weight: 0,
    restSeconds: 90,
    unit: "lb"
  },
  {
    name: "Unilateral Rear Delt Fly",
    setCount: 3,
    repCount: 8,
    weight: 17,
    restSeconds: 90,
    unit: "lb"
  },
  {
    name: "Cable Overhead Extension",
    setCount: 3,
    repCount: 10,
    weight: 27.5,
    restSeconds: 90,
    unit: "lb"
  }
];

const defaultState = {
  activeTab: "programs",
  settings: {
    unit: "lb",
    alertMode: "visual-audio"
  },
  exerciseDefinitions: [
    {
      id: crypto.randomUUID(),
      name: "Squat",
      setCount: 5,
      repCount: 5,
      weight: 225,
      restSeconds: 180,
      unit: "lb"
    },
    {
      id: crypto.randomUUID(),
      name: "Bench Press",
      setCount: 5,
      repCount: 5,
      weight: 155,
      restSeconds: 150,
      unit: "lb"
    },
    {
      id: crypto.randomUUID(),
      name: "Deadlift",
      setCount: 3,
      repCount: 5,
      weight: 275,
      restSeconds: 180,
      unit: "lb"
    }
  ],
  programs: [],
  activeWorkout: null,
  history: [],
  timer: {
    totalSeconds: 0,
    remainingSeconds: 0,
    running: false,
    targetTime: null
  },
  ui: {
    expandedHistoryIds: []
  },
  modal: null
};

defaultState.programs = [
  {
    id: crypto.randomUUID(),
    name: "5x5 Strength",
    notes: "Simple compound lifting day.",
    exercises: [
      makeProgramExercise(defaultState.exerciseDefinitions[0].id, 0),
      makeProgramExercise(defaultState.exerciseDefinitions[1].id, 1),
      makeProgramExercise(defaultState.exerciseDefinitions[2].id, 2)
    ]
  }
];

let state = loadState();
if (ensureBuiltInPrograms(state)) {
  saveState();
}
let timerInterval = null;

const app = document.getElementById("app");

function makeProgramExercise(definitionId, order) {
  return {
    id: crypto.randomUUID(),
    definitionId,
    order,
    usesSharedDefaults: true,
    override: null,
    alternatives: []
  };
}

function makeImportedProgramExercise(definition, values, order) {
  const usesSharedDefaults = valuesMatchDefinition(definition, values);
  return {
    id: crypto.randomUUID(),
    definitionId: definition.id,
    order,
    usesSharedDefaults,
    override: usesSharedDefaults ? null : { ...values },
    alternatives: []
  };
}

function valuesMatchDefinition(definition, values) {
  return definition.setCount === values.setCount
    && definition.repCount === values.repCount
    && Number(definition.weight) === Number(values.weight)
    && definition.restSeconds === values.restSeconds
    && definition.unit === values.unit;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.programs)) {
      return {
        ...defaultState,
        ...saved,
        ui: { ...defaultState.ui, ...(saved.ui || {}) },
        modal: null
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return structuredClone(defaultState);
}

function ensureBuiltInPrograms(draft) {
  let changed = false;
  draft.exerciseDefinitions ||= [];
  draft.programs ||= [];
  draft.ui ||= {};
  draft.ui.importedBuiltIns ||= [];

  if (!draft.ui.importedBuiltIns.includes(UPPER_ONE_PROGRAM_NAME)) {
    const hasUpperOne = draft.programs.some((program) => exerciseKey(program.name) === exerciseKey(UPPER_ONE_PROGRAM_NAME));
    if (!hasUpperOne) {
      const exercises = UPPER_ONE_EXERCISES.map((exercise, index) => {
        let definition = draft.exerciseDefinitions.find((item) => exerciseKey(item.name) === exerciseKey(exercise.name));
        if (!definition) {
          definition = { id: crypto.randomUUID(), ...exercise };
          draft.exerciseDefinitions.push(definition);
        }
        return makeImportedProgramExercise(definition, exercise, index);
      });

      draft.programs.unshift({
        id: crypto.randomUUID(),
        name: UPPER_ONE_PROGRAM_NAME,
        notes: "Upper body dumbbell and pull-up day.",
        exercises
      });
    }

    draft.ui.importedBuiltIns.push(UPPER_ONE_PROGRAM_NAME);
    changed = true;
  }

  return changed;
}

function saveState() {
  const toSave = { ...state, modal: null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function setState(mutator) {
  mutator(state);
  saveState();
  render();
}

function byId(collection, id) {
  return collection.find((item) => item.id === id);
}

function exerciseKey(name) {
  return name.trim().toLocaleLowerCase();
}

function supersetName(value) {
  return String(value || "").trim();
}

function valuesFor(programExercise) {
  const definition = byId(state.exerciseDefinitions, programExercise.definitionId);
  if (!definition) {
    return {
      name: "Exercise",
      setCount: 1,
      repCount: 1,
      weight: 0,
      restSeconds: 90,
      unit: state.settings.unit
    };
  }

  return programExercise.usesSharedDefaults || !programExercise.override
    ? { ...definition }
    : { name: definition.name, ...programExercise.override };
}

function alternativesFor(programExercise) {
  return (programExercise.alternatives || []).map((alternative) => ({
    ...alternative,
    id: alternative.id || crypto.randomUUID()
  }));
}

function formatRest(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (!mins) return `${secs}s`;
  if (!secs) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
  }

  return `${remainder}s`;
}

function durationForSession(session) {
  if (typeof session.durationSeconds === "number") {
    return session.durationSeconds;
  }

  const started = new Date(session.startedAt).getTime();
  const completed = new Date(session.completedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return 0;
  return Math.max(0, Math.round((completed - started) / 1000));
}

function estimatedWorkoutDurationForSets(sets) {
  return sets.reduce((total, set) => total + 60 + (Number(set.restSeconds) || 0), 0);
}

function estimatedWorkoutDurationForProgram(program) {
  return program.exercises.reduce((total, item) => {
    const values = valuesFor(item);
    return total + values.setCount * (60 + (Number(values.restSeconds) || 0));
  }, 0);
}

function h(strings, ...values) {
  return strings.reduce((out, string, index) => out + string + (values[index] ?? ""), "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function icon(name) {
  const icons = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.8 7.8 0 0 0-2-1.1L14 3h-4l-.4 2.7a7.8 7.8 0 0 0-2 1.1l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7.8 7.8 0 0 0 2 1.1L10 21h4l.4-2.7a7.8 7.8 0 0 0 2-1.1l2.4 1 2-3.4-2-1.6c.1-.4.2-.8.2-1.2Z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.8v12.4c0 .8.9 1.3 1.6.8l9.6-6.2c.6-.4.6-1.2 0-1.6L9.6 5c-.7-.5-1.6 0-1.6.8Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m5 12 4 4L19 6"/></svg>'
  };
  return icons[name] || "";
}

function render() {
  app.innerHTML = h`
    ${renderTopbar()}
    <main class="content">${renderTab()}</main>
    ${renderBottomNav()}
    ${renderModal()}
  `;
  bindEvents();
}

function renderTopbar() {
  const titles = {
    programs: ["Programs", "Build and edit your lifting splits."],
    workout: ["Workout", state.activeWorkout ? state.activeWorkout.programName : "Start a saved program."],
    history: ["History", "Review completed workout sessions."],
    settings: ["Settings", "Timer alerts and weight units."]
  };
  const [title, subtitle] = titles[state.activeTab];
  const showAdd = state.activeTab === "programs";

  return h`
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">L</div>
        <div class="title-block">
          <h1 class="screen-title">${title}</h1>
          <p class="screen-subtitle">${subtitle}</p>
        </div>
      </div>
      <div class="toolbar-actions">
        ${showAdd ? `<button class="icon-button" data-action="new-program" aria-label="New program">${icon("plus")}</button>` : ""}
      </div>
    </header>
  `;
}

function renderTab() {
  switch (state.activeTab) {
    case "programs":
      return renderPrograms();
    case "workout":
      return renderWorkout();
    case "history":
      return renderHistory();
    case "settings":
      return renderSettings();
    default:
      return renderPrograms();
  }
}

function renderPrograms() {
  if (!state.programs.length) {
    return emptyState("No Programs", "Create a lifting split to start tracking your workouts.", "new-program");
  }

  return h`
    <section class="list">
      ${state.programs.map(renderProgramRow).join("")}
    </section>
  `;
}

function renderProgramRow(program) {
  const exercises = program.exercises.slice().sort((a, b) => a.order - b.order);
  return h`
    <article class="row">
      <div class="row-header">
        <div>
          <h2 class="row-title">${escapeHtml(program.name)}</h2>
          <div class="meta">
            <span>${exercises.length} exercises</span>
            <span>Estimated ${formatDuration(estimatedWorkoutDurationForProgram(program))}</span>
            ${program.notes ? `<span>${escapeHtml(program.notes)}</span>` : ""}
          </div>
        </div>
        <button class="small-button" data-action="start-program" data-program-id="${program.id}">${icon("play")} Start</button>
      </div>
      <div class="set-list">
        ${exercises.map((item) => renderExerciseLine(program.id, item)).join("")}
      </div>
      <div class="button-row three">
        <button class="secondary-button" data-action="add-exercise" data-program-id="${program.id}">Add</button>
        <button class="secondary-button" data-action="edit-program" data-program-id="${program.id}">Edit</button>
        <button class="secondary-button" data-action="duplicate-program" data-program-id="${program.id}">Copy</button>
      </div>
    </article>
  `;
}

function renderExerciseLine(programId, item) {
  const program = byId(state.programs, programId);
  const exerciseCount = program?.exercises.length || 0;
  const values = valuesFor(item);
  const alternatives = alternativesFor(item);
  const supersetGroup = supersetName(item.supersetGroup);
  return h`
    <div class="set-row program-exercise-row" data-action="edit-exercise" data-program-id="${programId}" data-exercise-id="${item.id}" role="button" tabindex="0">
      <span class="set-dot">${item.order + 1}</span>
      <div class="exercise-row-body">
        <div>
          <strong>${escapeHtml(values.name)}</strong><br>
          <span class="muted">${values.setCount} x ${values.repCount} at ${values.weight} ${values.unit} · ${formatRest(values.restSeconds)}</span>
          ${supersetGroup ? `<br><span class="chip superset-chip">Superset ${escapeHtml(supersetGroup)}</span>` : ""}
          ${alternatives.length ? `<br><span class="muted">${alternatives.length} alternative${alternatives.length === 1 ? "" : "s"}</span>` : ""}
        </div>
        ${alternatives.length ? renderAlternativeSwapList(programId, item.id, alternatives) : ""}
      </div>
      <div class="exercise-row-actions">
        <span class="chip ${item.usesSharedDefaults ? "synced" : "override"}">${item.usesSharedDefaults ? "Synced" : "Override"}</span>
        <div class="reorder-controls" aria-label="Reorder exercise">
          <button class="set-edit-button" data-action="move-exercise" data-program-id="${programId}" data-exercise-id="${item.id}" data-direction="up" ${item.order <= 0 ? "disabled" : ""}>Up</button>
          <button class="set-edit-button" data-action="move-exercise" data-program-id="${programId}" data-exercise-id="${item.id}" data-direction="down" ${item.order >= exerciseCount - 1 ? "disabled" : ""}>Down</button>
        </div>
      </div>
    </div>
  `;
}

function renderAlternativeSwapList(programId, exerciseId, alternatives) {
  return h`
    <div class="alternative-swap-list" aria-label="Alternative exercises">
      ${alternatives.map((alternative) => h`
        <div class="alternative-swap-row">
          <span>
            <strong>${escapeHtml(alternative.name)}</strong><br>
            <span class="muted">${alternative.setCount} x ${alternative.repCount} at ${alternative.weight} ${alternative.unit} · ${formatRest(alternative.restSeconds)}</span>
          </span>
          <button class="set-edit-button" data-action="swap-primary-alternative" data-program-id="${programId}" data-exercise-id="${exerciseId}" data-alternative-id="${alternative.id}">Make Primary</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderWorkout() {
  if (!state.activeWorkout) {
    if (!state.programs.length) {
      return emptyState("No Workout Ready", "Create a program first, then start it here.", "new-program");
    }

    return h`
      <section class="panel">
        <h2 class="section-title">Choose a Program</h2>
        <div class="list">
          ${state.programs.map((program) => h`
            <button class="row" data-action="start-program" data-program-id="${program.id}">
              <div class="row-header">
                <div>
                  <h3 class="row-title">${escapeHtml(program.name)}</h3>
                  <div class="meta">
                    <span>${program.exercises.length} exercises</span>
                    <span>Estimated ${formatDuration(estimatedWorkoutDurationForProgram(program))}</span>
                  </div>
                </div>
                <span class="chip synced">${icon("play")} Start</span>
              </div>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }

  const workout = state.activeWorkout;
  const current = workout.sets[workout.currentIndex];
  const completed = workout.sets.filter((set) => set.done).length;
  const skipped = workout.sets.filter((set) => set.skipped).length;
  const alternatives = current.alternatives || [];
  const nextOpenIndex = findNextOpenSetIndex(workout, workout.currentIndex);
  const restsAfterCurrent = shouldRestAfterSet(workout, current, nextOpenIndex);
  const estimateText = formatDuration(estimatedWorkoutDurationForSets(workout.sets));

  return h`
    <section class="estimate-card">
      <span class="estimate-label">Estimated Duration</span>
      <strong>${estimateText}</strong>
    </section>
    <section class="active-set panel">
      <div class="row-header">
        <div>
          <h2 class="section-title">${escapeHtml(current.exerciseName)} Set ${current.setNumber}</h2>
          <p class="screen-subtitle">
            ${completed} complete · ${skipped} skipped · ${workout.sets.length} total
            ${current.supersetGroup ? ` · Superset ${escapeHtml(current.supersetGroup)} round ${current.supersetRound}` : ""}
          </p>
        </div>
        <span class="chip">${restsAfterCurrent ? formatRest(current.restSeconds) : "No rest"}</span>
      </div>
      ${alternatives.length ? h`
        <label class="field">
          <span>Exercise Choice</span>
          <select data-input="active-alternative" data-group-id="${current.groupId}">
            <option value="primary" ${current.choiceId === "primary" ? "selected" : ""}>${escapeHtml(current.primaryName)}</option>
            ${alternatives.map((alternative) => `
              <option value="${alternative.id}" ${current.choiceId === alternative.id ? "selected" : ""}>${escapeHtml(alternative.name)}</option>
            `).join("")}
          </select>
        </label>
      ` : ""}
      <div class="field-grid">
        <label class="field">
          <span>Reps</span>
          <input data-input="active-reps" type="number" min="1" inputmode="numeric" value="${current.reps}">
        </label>
        <label class="field">
          <span>Weight (${current.unit})</span>
          <input data-input="active-weight" type="number" min="0" step="0.5" inputmode="decimal" value="${current.weight}">
        </label>
      </div>
      <div class="complete-set-actions">
        <button class="skip-set-button" data-action="skip-set" ${current.done || current.skipped ? "disabled" : ""}>Skip Set</button>
        <button class="complete-set-button" data-action="complete-set" ${current.done || current.skipped ? "disabled" : ""}>${icon("check")} Complete Set</button>
      </div>
    </section>
    ${renderTimer()}
    <section class="panel">
      <h2 class="section-title">Planned Sets</h2>
      <div class="set-list">
        ${workout.sets.map((set, index) => h`
          <div class="set-row ${set.done ? "done" : ""} ${set.skipped ? "skipped" : ""} ${index === workout.currentIndex ? "current" : ""}" data-action="select-set" data-set-index="${index}" role="button" tabindex="0">
            <span class="set-dot">${set.done ? "✓" : set.skipped ? "–" : set.setNumber}</span>
            <span>
              <strong>${escapeHtml(set.exerciseName)} Set ${set.setNumber}</strong><br>
              <span class="muted">${set.reps} reps at ${set.weight} ${set.unit}${set.supersetGroup ? ` · Superset ${escapeHtml(set.supersetGroup)} round ${set.supersetRound}` : ""}</span>
            </span>
            <span class="chip">${index === workout.currentIndex ? "Now" : set.done ? "Done" : set.skipped ? "Skipped" : "Open"}</span>
            <button class="set-edit-button" data-action="edit-set" data-set-id="${set.id}" aria-label="Edit ${escapeHtml(set.exerciseName)} set ${set.setNumber}">Edit</button>
          </div>
        `).join("")}
      </div>
    </section>
    <section class="button-row">
      <button class="primary-button" data-action="finish-workout" ${completed || skipped ? "" : "disabled"}>Save Workout</button>
      <button class="danger-button" data-action="discard-workout">Discard</button>
    </section>
  `;
}

function renderTimer() {
  const timer = state.timer;
  const progress = timer.totalSeconds ? 1 - timer.remainingSeconds / timer.totalSeconds : 0;
  return h`
    <section class="timer-card">
      <div class="timer-face" data-timer-face style="background: linear-gradient(135deg, #17201c ${Math.round(progress * 100)}%, #24352d)">
        <div class="timer-time" data-timer-time>${formatTimer(timer.remainingSeconds)}</div>
      </div>
      <div class="button-row three">
        <button class="secondary-button" data-action="timer-toggle" data-timer-toggle ${timer.remainingSeconds ? "" : "disabled"}>${timer.running ? "Pause" : "Resume"}</button>
        <button class="secondary-button" data-action="timer-reset" data-timer-reset ${timer.remainingSeconds ? "" : "disabled"}>Reset</button>
        <button class="secondary-button" data-action="timer-test">Test</button>
      </div>
    </section>
  `;
}

function renderHistory() {
  if (!state.history.length) {
    return emptyState("No History", "Finished workouts will appear here.", "workout");
  }

  return h`
    <section class="list">
      ${state.history.map((session) => {
        const isExpanded = state.ui.expandedHistoryIds.includes(session.id);
        const skippedSets = session.skippedSets || [];
        const durationText = formatDuration(durationForSession(session));
        return h`
        <article class="row">
          <button class="history-summary" data-action="toggle-history" data-session-id="${session.id}" aria-expanded="${isExpanded}">
            <div>
              <h2 class="row-title">${escapeHtml(session.programName)}</h2>
              <p class="history-time">${new Date(session.completedAt).toLocaleString()} · ${durationText}</p>
            </div>
            <span class="history-summary-actions">
              <span class="chip">${durationText}</span>
              <span class="chip synced">${session.sets.length} done</span>
              ${skippedSets.length ? `<span class="chip skipped-chip">${skippedSets.length} skipped</span>` : ""}
              <span class="chevron" aria-hidden="true">${isExpanded ? "⌃" : "⌄"}</span>
            </span>
          </button>
          ${isExpanded ? `<div class="set-list history-details">
            <div class="notice">Workout duration: ${durationText}</div>
            <button class="danger-button" data-action="delete-history-session" data-session-id="${session.id}">Delete Session</button>
            ${session.sets.map((set) => h`
              <div class="set-row done">
                <span class="set-dot">✓</span>
                <span>
                  <strong>${escapeHtml(set.exerciseName)} Set ${set.setNumber}</strong><br>
                  <span class="muted">${set.reps} reps at ${set.weight} ${set.unit}</span>
                </span>
                <span class="chip">${formatRest(set.restSeconds)}</span>
              </div>
            `).join("")}
            ${skippedSets.map((set) => h`
              <div class="set-row skipped">
                <span class="set-dot">–</span>
                <span>
                  <strong>${escapeHtml(set.exerciseName)} Set ${set.setNumber}</strong><br>
                  <span class="muted">${set.reps} reps at ${set.weight} ${set.unit}</span>
                </span>
                <span class="chip skipped-chip">Skipped</span>
              </div>
            `).join("")}
          </div>` : ""}
        </article>
      `; }).join("")}
    </section>
  `;
}

function renderSettings() {
  return h`
    <section class="panel form">
      <label class="field">
        <span>Default Weight Unit</span>
        <select data-input="unit">
          <option value="lb" ${state.settings.unit === "lb" ? "selected" : ""}>Pounds</option>
          <option value="kg" ${state.settings.unit === "kg" ? "selected" : ""}>Kilograms</option>
        </select>
      </label>
      <label class="field">
        <span>Rest Timer Alarm</span>
        <select data-input="alert-mode">
          <option value="visual-audio" ${state.settings.alertMode === "visual-audio" ? "selected" : ""}>Visual + Audio</option>
          <option value="visual" ${state.settings.alertMode === "visual" ? "selected" : ""}>Visual Only</option>
        </select>
      </label>
      <div class="notice">Install this app from your browser menu. Safari uses Share > Add to Home Screen. Chrome uses Add to Home Screen or Install app when available.</div>
      <button class="secondary-button" data-action="export-data">Export Backup</button>
      <label class="secondary-button backup-import-label">
        Import Backup
        <input class="backup-file-input" data-input="import-data-file" type="file" accept="application/json,.json">
      </label>
      <button class="danger-button" data-action="reset-data">Reset All Data</button>
    </section>
  `;
}

function emptyState(title, message, action) {
  return h`
    <section class="empty-state">
      <div class="brand-mark">${icon("dumbbell")}</div>
      <h2>${title}</h2>
      <p>${message}</p>
      <button class="primary-button" data-action="${action}">${action === "new-program" ? "New Program" : "Go to Workout"}</button>
    </section>
  `;
}

function renderBottomNav() {
  const tabs = [
    ["programs", "Programs", "list"],
    ["workout", "Workout", "dumbbell"],
    ["history", "History", "clock"],
    ["settings", "Settings", "gear"]
  ];

  return h`
    <nav class="bottom-nav" aria-label="Main">
      <div class="tabbar">
        ${tabs.map(([id, label, glyph]) => h`
          <button class="tab ${state.activeTab === id ? "active" : ""}" data-action="tab" data-tab="${id}">
            ${icon(glyph)}
            <span>${label}</span>
          </button>
        `).join("")}
      </div>
    </nav>
  `;
}

function renderModal() {
  if (!state.modal) return "";

  switch (state.modal.type) {
    case "program":
      return renderProgramModal(state.modal.programId);
    case "exercise":
      return renderExerciseModal(state.modal.programId, state.modal.exerciseId);
    case "set":
      return renderSetModal(state.modal.setId);
    default:
      return "";
  }
}

function renderSetModal(setId) {
  const set = state.activeWorkout?.sets.find((item) => item.id === setId);
  if (!set) return "";

  return modalShell("Edit Set", h`
    <form class="form" data-form="set" data-set-id="${set.id}">
      <div class="notice">${escapeHtml(set.exerciseName)} · Set ${set.setNumber}</div>
      <div class="field-grid">
        <label class="field">
          <span>Reps</span>
          <input name="reps" type="number" min="1" inputmode="numeric" value="${set.reps}">
        </label>
        <label class="field">
          <span>Weight (${set.unit})</span>
          <input name="weight" type="number" min="0" step="0.5" inputmode="decimal" value="${set.weight}">
        </label>
        <label class="field">
          <span>Rest Seconds</span>
          <input name="restSeconds" type="number" min="0" step="15" inputmode="numeric" value="${set.restSeconds}">
        </label>
        <label class="field">
          <span>Status</span>
          <select name="status">
            <option value="open" ${!set.done && !set.skipped ? "selected" : ""}>Open</option>
            <option value="done" ${set.done ? "selected" : ""}>Completed</option>
            <option value="skipped" ${set.skipped ? "selected" : ""}>Skipped</option>
          </select>
        </label>
      </div>
      <button class="primary-button" type="submit">Save Set</button>
    </form>
  `);
}

function renderProgramModal(programId) {
  const program = programId ? byId(state.programs, programId) : null;
  return modalShell(program ? "Edit Program" : "New Program", h`
    <form class="form" data-form="program">
      <label class="field">
        <span>Name</span>
        <input name="name" required value="${escapeHtml(program?.name ?? "")}" placeholder="Push Pull Legs">
      </label>
      <label class="field">
        <span>Notes</span>
        <textarea name="notes" placeholder="Training focus, schedule, or cues">${escapeHtml(program?.notes ?? "")}</textarea>
      </label>
      <button class="primary-button" type="submit">Save Program</button>
      ${program ? `<button class="danger-button" type="button" data-action="delete-program" data-program-id="${program.id}">Delete Program</button>` : ""}
    </form>
  `);
}

function renderExerciseModal(programId, exerciseId) {
  const program = byId(state.programs, programId);
  const item = program?.exercises.find((exercise) => exercise.id === exerciseId);
  const values = item ? valuesFor(item) : {
    name: "",
    setCount: 3,
    repCount: 8,
    weight: 0,
    restSeconds: 90,
    unit: state.settings.unit
  };
  const alternatives = item ? alternativesFor(item) : [];

  return modalShell(item ? "Edit Exercise" : "Add Exercise", h`
    <form class="form" data-form="exercise" data-program-id="${programId}" data-exercise-id="${exerciseId ?? ""}">
      <label class="field">
        <span>Name</span>
        <input name="name" required list="exercise-names" value="${escapeHtml(values.name)}" placeholder="Bench Press">
        <datalist id="exercise-names">
          ${state.exerciseDefinitions.map((definition) => `<option value="${escapeHtml(definition.name)}"></option>`).join("")}
        </datalist>
      </label>
      <div class="field-grid">
        <label class="field">
          <span>Sets</span>
          <input name="setCount" type="number" min="1" inputmode="numeric" value="${values.setCount}">
        </label>
        <label class="field">
          <span>Reps</span>
          <input name="repCount" type="number" min="1" inputmode="numeric" value="${values.repCount}">
        </label>
        <label class="field">
          <span>Weight</span>
          <input name="weight" type="number" min="0" step="0.5" inputmode="decimal" value="${values.weight}">
        </label>
        <label class="field">
          <span>Rest Seconds</span>
          <input name="restSeconds" type="number" min="0" step="15" inputmode="numeric" value="${values.restSeconds}">
        </label>
      </div>
      <label class="field">
        <span>Unit</span>
        <select name="unit">
          <option value="lb" ${values.unit === "lb" ? "selected" : ""}>Pounds</option>
          <option value="kg" ${values.unit === "kg" ? "selected" : ""}>Kilograms</option>
        </select>
      </label>
      <label class="field">
        <span>Superset Group</span>
        <input name="supersetGroup" value="${escapeHtml(item?.supersetGroup || "")}" placeholder="A">
      </label>
      <label class="toggle-row">
        <span>Sync with same exercise in other programs</span>
        <input type="checkbox" name="usesSharedDefaults" ${item?.usesSharedDefaults ?? true ? "checked" : ""}>
      </label>
      <section class="alternative-editor">
        <div class="row-header">
          <div>
            <h3 class="section-title">Alternatives</h3>
            <p class="screen-subtitle">Optional swaps available during a workout.</p>
          </div>
          <button class="small-button" type="button" data-action="add-alternative-row">Add</button>
        </div>
        <div class="alternative-list" data-alternative-list>
          ${alternatives.map(renderAlternativeEditorRow).join("")}
        </div>
      </section>
      <button class="primary-button" type="submit">Save Exercise</button>
      ${item ? `<button class="danger-button" type="button" data-action="delete-exercise" data-program-id="${programId}" data-exercise-id="${item.id}">Delete Exercise</button>` : ""}
    </form>
  `);
}

function renderAlternativeEditorRow(alternative = {}) {
  return h`
    <div class="alternative-row" data-alternative-row>
      <label class="field">
        <span>Alternative Name</span>
        <input name="alternativeName" list="exercise-names" value="${escapeHtml(alternative.name || "")}" placeholder="Smith Machine Squat">
      </label>
      <div class="field-grid">
        <label class="field">
          <span>Sets</span>
          <input name="alternativeSetCount" type="number" min="1" inputmode="numeric" value="${alternative.setCount || 3}">
        </label>
        <label class="field">
          <span>Reps</span>
          <input name="alternativeRepCount" type="number" min="1" inputmode="numeric" value="${alternative.repCount || 8}">
        </label>
        <label class="field">
          <span>Weight</span>
          <input name="alternativeWeight" type="number" min="0" step="0.5" inputmode="decimal" value="${alternative.weight || 0}">
        </label>
        <label class="field">
          <span>Rest Seconds</span>
          <input name="alternativeRestSeconds" type="number" min="0" step="15" inputmode="numeric" value="${alternative.restSeconds || 90}">
        </label>
      </div>
      <label class="field">
        <span>Unit</span>
        <select name="alternativeUnit">
          <option value="lb" ${(alternative.unit || state.settings.unit) === "lb" ? "selected" : ""}>Pounds</option>
          <option value="kg" ${(alternative.unit || state.settings.unit) === "kg" ? "selected" : ""}>Kilograms</option>
        </select>
      </label>
      <button class="secondary-button" type="button" data-action="remove-alternative-row">Remove Alternative</button>
    </div>
  `;
}

function modalShell(title, body) {
  return h`
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-label="${title}" data-modal>
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="icon-button" data-action="close-modal" aria-label="Close">×</button>
        </div>
        ${body}
      </section>
    </div>
  `;
}

function bindEvents() {
  app.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", handleAction);
  });

  app.querySelectorAll("[data-input]").forEach((element) => {
    element.addEventListener("change", handleInput);
  });

  app.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", handleSubmit);
  });
}

function handleAction(event) {
  event.stopPropagation();
  const target = event.currentTarget;
  const action = target.dataset.action;

  if (action === "close-modal" && target.classList.contains("modal-backdrop") && event.target !== target) {
    return;
  }

  switch (action) {
    case "tab":
      setState((draft) => {
        draft.activeTab = target.dataset.tab;
      });
      break;
    case "new-program":
      openModal({ type: "program" });
      break;
    case "edit-program":
      openModal({ type: "program", programId: target.dataset.programId });
      break;
    case "delete-program":
      deleteProgram(target.dataset.programId);
      break;
    case "duplicate-program":
      duplicateProgram(target.dataset.programId);
      break;
    case "add-exercise":
      openModal({ type: "exercise", programId: target.dataset.programId });
      break;
    case "edit-exercise":
      openModal({ type: "exercise", programId: target.dataset.programId, exerciseId: target.dataset.exerciseId });
      break;
    case "delete-exercise":
      deleteExercise(target.dataset.programId, target.dataset.exerciseId);
      break;
    case "move-exercise":
      moveExercise(target.dataset.programId, target.dataset.exerciseId, target.dataset.direction);
      break;
    case "add-alternative-row":
      addAlternativeRow(target);
      break;
    case "remove-alternative-row":
      removeAlternativeRow(target);
      break;
    case "swap-primary-alternative":
      swapPrimaryAlternative(target.dataset.programId, target.dataset.exerciseId, target.dataset.alternativeId);
      break;
    case "start-program":
      startProgram(target.dataset.programId);
      break;
    case "select-set":
      selectSet(Number(target.dataset.setIndex));
      break;
    case "edit-set":
      openModal({ type: "set", setId: target.dataset.setId });
      break;
    case "toggle-history":
      toggleHistory(target.dataset.sessionId);
      break;
    case "delete-history-session":
      deleteHistorySession(target.dataset.sessionId);
      break;
    case "complete-set":
      completeSet();
      break;
    case "skip-set":
      skipSet();
      break;
    case "finish-workout":
      finishWorkout();
      break;
    case "discard-workout":
      if (confirm("Discard this workout?")) {
        setState((draft) => {
          draft.activeWorkout = null;
          resetTimer(draft);
        });
      }
      break;
    case "timer-toggle":
      toggleTimer();
      break;
    case "timer-reset":
      setState(resetTimer);
      break;
    case "timer-test":
      startTimer(5);
      break;
    case "close-modal":
      if (!target.closest("[data-modal]") || target.classList.contains("icon-button")) {
        openModal(null);
      }
      break;
    case "workout":
      setState((draft) => {
        draft.activeTab = "workout";
      });
      break;
    case "export-data":
      exportData();
      break;
    case "reset-data":
      if (confirm("Reset all LiftLog data on this device?")) {
        localStorage.removeItem(STORAGE_KEY);
        state = structuredClone(defaultState);
        ensureBuiltInPrograms(state);
        saveState();
        render();
      }
      break;
  }
}

function handleInput(event) {
  const input = event.currentTarget;
  const key = input.dataset.input;

  if (key === "unit") {
    setState((draft) => {
      draft.settings.unit = input.value;
    });
  }

  if (key === "alert-mode") {
    setState((draft) => {
      draft.settings.alertMode = input.value;
    });
  }

  if (key === "import-data-file") {
    importDataFile(input);
  }

  if (key === "active-reps" || key === "active-weight") {
    const set = state.activeWorkout?.sets[state.activeWorkout.currentIndex];
    if (!set) return;

    if (key === "active-reps") set.reps = Math.max(1, Number(input.value) || 1);
    if (key === "active-weight") set.weight = Math.max(0, Number(input.value) || 0);
    saveState();
  }

  if (key === "active-alternative") {
    chooseAlternative(input.dataset.groupId, input.value);
  }
}

function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  if (form.dataset.form === "program") {
    saveProgram(data);
  }

  if (form.dataset.form === "exercise") {
    saveExercise(form, data);
  }

  if (form.dataset.form === "set") {
    saveSetRecord(form, data);
  }
}

function openModal(modal) {
  setState((draft) => {
    draft.modal = modal;
  });
}

function saveProgram(data) {
  const name = String(data.get("name") || "").trim();
  if (!name) return;

  setState((draft) => {
    const currentId = draft.modal?.programId;
    const program = currentId ? byId(draft.programs, currentId) : null;
    if (program) {
      program.name = name;
      program.notes = String(data.get("notes") || "").trim();
    } else {
      draft.programs.unshift({
        id: crypto.randomUUID(),
        name,
        notes: String(data.get("notes") || "").trim(),
        exercises: []
      });
    }
    draft.modal = null;
  });
}

function saveExercise(form, data) {
  const programId = form.dataset.programId;
  const exerciseId = form.dataset.exerciseId;
  const name = String(data.get("name") || "").trim();
  if (!name) return;

  setState((draft) => {
    const program = byId(draft.programs, programId);
    if (!program) return;

    let definition = draft.exerciseDefinitions.find((item) => exerciseKey(item.name) === exerciseKey(name));
    const values = {
      name,
      setCount: Math.max(1, Number(data.get("setCount")) || 1),
      repCount: Math.max(1, Number(data.get("repCount")) || 1),
      weight: Math.max(0, Number(data.get("weight")) || 0),
      restSeconds: Math.max(0, Number(data.get("restSeconds")) || 0),
      unit: String(data.get("unit") || draft.settings.unit)
    };

    if (!definition) {
      definition = { id: crypto.randomUUID(), ...values };
      draft.exerciseDefinitions.push(definition);
    }

    const usesSharedDefaults = data.get("usesSharedDefaults") === "on";
    const alternatives = collectAlternatives(form);
    const supersetGroup = supersetName(data.get("supersetGroup"));
    if (usesSharedDefaults) {
      Object.assign(definition, values);
    }

    const existing = program.exercises.find((exercise) => exercise.id === exerciseId);
    if (existing) {
      existing.definitionId = definition.id;
      existing.usesSharedDefaults = usesSharedDefaults;
      existing.override = usesSharedDefaults ? null : values;
      existing.alternatives = alternatives;
      existing.supersetGroup = supersetGroup;
    } else {
      program.exercises.push({
        id: crypto.randomUUID(),
        definitionId: definition.id,
        order: program.exercises.length,
        usesSharedDefaults,
        override: usesSharedDefaults ? null : values,
        alternatives,
        supersetGroup
      });
    }

    draft.modal = null;
  });
}

function collectAlternatives(form) {
  return [...form.querySelectorAll("[data-alternative-row]")]
    .map((row) => {
      const name = row.querySelector('[name="alternativeName"]')?.value.trim() || "";
      if (!name) return null;

      return {
        id: crypto.randomUUID(),
        name,
        setCount: Math.max(1, Number(row.querySelector('[name="alternativeSetCount"]')?.value) || 1),
        repCount: Math.max(1, Number(row.querySelector('[name="alternativeRepCount"]')?.value) || 1),
        weight: Math.max(0, Number(row.querySelector('[name="alternativeWeight"]')?.value) || 0),
        restSeconds: Math.max(0, Number(row.querySelector('[name="alternativeRestSeconds"]')?.value) || 0),
        unit: row.querySelector('[name="alternativeUnit"]')?.value || state.settings.unit
      };
    })
    .filter(Boolean);
}

function addAlternativeRow(button) {
  const list = button.closest("form")?.querySelector("[data-alternative-list]");
  if (!list) return;
  list.insertAdjacentHTML("beforeend", renderAlternativeEditorRow());
  list.lastElementChild?.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", handleAction);
  });
}

function removeAlternativeRow(button) {
  button.closest("[data-alternative-row]")?.remove();
}

function swapPrimaryAlternative(programId, exerciseId, alternativeId) {
  setState((draft) => {
    const program = byId(draft.programs, programId);
    const item = program?.exercises.find((exercise) => exercise.id === exerciseId);
    if (!item) return;

    const alternatives = item.alternatives || [];
    const alternativeIndex = alternatives.findIndex((alternative) => alternative.id === alternativeId);
    const selected = alternatives[alternativeIndex];
    if (!selected) return;

    const currentPrimary = valuesForDraft(draft, item);
    let definition = draft.exerciseDefinitions.find((exercise) => exerciseKey(exercise.name) === exerciseKey(selected.name));
    if (!definition) {
      definition = {
        id: crypto.randomUUID(),
        name: selected.name,
        setCount: selected.setCount,
        repCount: selected.repCount,
        weight: selected.weight,
        restSeconds: selected.restSeconds,
        unit: selected.unit
      };
      draft.exerciseDefinitions.push(definition);
    }

    item.definitionId = definition.id;
    item.usesSharedDefaults = valuesMatchDefinition(definition, selected);
    item.override = item.usesSharedDefaults ? null : {
      name: selected.name,
      setCount: selected.setCount,
      repCount: selected.repCount,
      weight: selected.weight,
      restSeconds: selected.restSeconds,
      unit: selected.unit
    };
    item.alternatives = [
      {
        id: crypto.randomUUID(),
        name: currentPrimary.name,
        setCount: currentPrimary.setCount,
        repCount: currentPrimary.repCount,
        weight: currentPrimary.weight,
        restSeconds: currentPrimary.restSeconds,
        unit: currentPrimary.unit
      },
      ...alternatives.filter((alternative) => alternative.id !== alternativeId)
    ];
  });
}

function deleteProgram(programId) {
  if (!confirm("Delete this program?")) return;

  setState((draft) => {
    draft.programs = draft.programs.filter((program) => program.id !== programId);
    draft.modal = null;
  });
}

function duplicateProgram(programId) {
  setState((draft) => {
    const program = byId(draft.programs, programId);
    if (!program) return;
    draft.programs.unshift({
      id: crypto.randomUUID(),
      name: `${program.name} Copy`,
      notes: program.notes,
      exercises: program.exercises.map((exercise) => ({
        ...structuredClone(exercise),
        id: crypto.randomUUID()
      }))
    });
  });
}

function deleteExercise(programId, exerciseId) {
  if (!confirm("Delete this exercise?")) return;

  setState((draft) => {
    const program = byId(draft.programs, programId);
    if (!program) return;
    program.exercises = program.exercises
      .filter((exercise) => exercise.id !== exerciseId)
      .map((exercise, index) => ({ ...exercise, order: index }));
    draft.modal = null;
  });
}

function moveExercise(programId, exerciseId, direction) {
  setState((draft) => {
    const program = byId(draft.programs, programId);
    if (!program) return;

    const exercises = program.exercises.slice().sort((a, b) => a.order - b.order);
    const currentIndex = exercises.findIndex((exercise) => exercise.id === exerciseId);
    const offset = direction === "up" ? -1 : 1;
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= exercises.length) return;

    [exercises[currentIndex], exercises[targetIndex]] = [exercises[targetIndex], exercises[currentIndex]];
    exercises.forEach((exercise, index) => {
      exercise.order = index;
    });
    program.exercises = exercises;
  });
}

function startProgram(programId) {
  setState((draft) => {
    const program = byId(draft.programs, programId);
    if (!program) return;
    const sets = [];

    const blocks = [];
    const supersetBlocks = new Map();
    program.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((item, exerciseIndex) => {
        const values = valuesForDraft(draft, item);
        const alternatives = alternativesForDraft(item);
        const groupId = item.id;
        const supersetGroup = supersetName(item.supersetGroup);
        const supersetKey = supersetGroup ? exerciseKey(supersetGroup) : "";
        const plan = {
          item,
          values,
          alternatives,
          groupId,
          exerciseIndex,
          blockOrder: exerciseIndex,
          supersetGroup,
          supersetKey
        };

        if (!supersetGroup) {
          blocks.push({ type: "single", order: exerciseIndex, plans: [plan] });
          return;
        }

        if (!supersetBlocks.has(supersetKey)) {
          const block = { type: "superset", order: exerciseIndex, plans: [] };
          supersetBlocks.set(supersetKey, block);
          blocks.push(block);
        }
        supersetBlocks.get(supersetKey).plans.push(plan);
      });

    blocks
      .sort((a, b) => a.order - b.order)
      .forEach((block) => {
        if (block.type === "single") {
          const plan = block.plans[0];
          for (let setIndex = 1; setIndex <= plan.values.setCount; setIndex += 1) {
            sets.push(makeWorkoutSet(plan, setIndex));
          }
          return;
        }

        const roundCount = Math.max(...block.plans.map((plan) => plan.values.setCount));
        block.plans.forEach((plan) => {
          plan.blockOrder = block.order;
        });
        for (let round = 1; round <= roundCount; round += 1) {
          block.plans.forEach((plan) => {
            if (round <= plan.values.setCount) {
              sets.push(makeWorkoutSet(plan, round));
            }
          });
        }
      });

    draft.activeWorkout = {
      id: crypto.randomUUID(),
      programName: program.name,
      startedAt: new Date().toISOString(),
      currentIndex: 0,
      sets: sortWorkoutSets(sets)
    };
    draft.activeTab = "workout";
    resetTimer(draft);
  });
}

function makeWorkoutSet(plan, setNumber) {
  return {
    id: crypto.randomUUID(),
    groupId: plan.groupId,
    choiceId: "primary",
    primaryName: plan.values.name,
    primaryValues: plan.values,
    alternatives: plan.alternatives,
    exerciseName: plan.values.name,
    exerciseOrder: plan.exerciseIndex,
    blockOrder: plan.blockOrder,
    supersetGroup: plan.supersetGroup,
    supersetKey: plan.supersetKey,
    supersetRound: plan.supersetGroup ? setNumber : null,
    setNumber,
    reps: plan.values.repCount,
    weight: plan.values.weight,
    restSeconds: plan.values.restSeconds,
    unit: plan.values.unit,
    done: false,
    skipped: false,
    completedAt: null
  };
}

function sortWorkoutSets(sets) {
  return sets.sort((a, b) => {
    if (a.supersetKey && a.supersetKey === b.supersetKey) {
      if (a.supersetRound !== b.supersetRound) return a.supersetRound - b.supersetRound;
      return a.exerciseOrder - b.exerciseOrder;
    }

    if (a.blockOrder !== b.blockOrder) return a.blockOrder - b.blockOrder;
    if (a.exerciseOrder !== b.exerciseOrder) return a.exerciseOrder - b.exerciseOrder;
    return a.setNumber - b.setNumber;
  });
}

function shouldRestAfterSet(workout, set, nextIndex) {
  const nextSet = workout.sets[nextIndex];
  return !nextSet
    || !set.supersetKey
    || set.supersetKey !== nextSet.supersetKey
    || set.supersetRound !== nextSet.supersetRound;
}

function valuesForDraft(draft, programExercise) {
  const definition = draft.exerciseDefinitions.find((item) => item.id === programExercise.definitionId);
  if (!definition) return valuesFor(programExercise);
  return programExercise.usesSharedDefaults || !programExercise.override
    ? { ...definition }
    : { name: definition.name, ...programExercise.override };
}

function alternativesForDraft(programExercise) {
  return (programExercise.alternatives || []).map((alternative) => ({
    ...structuredClone(alternative),
    id: alternative.id || crypto.randomUUID()
  }));
}

function chooseAlternative(groupId, choiceId) {
  setState((draft) => {
    const workout = draft.activeWorkout;
    if (!workout) return;

    const groupSets = workout.sets.filter((set) => set.groupId === groupId && !set.done && !set.skipped);
    if (!groupSets.length) return;

    const currentSetNumber = groupSets[0].setNumber;
    const referenceSet = groupSets[0];
    const selected = choiceId === "primary"
      ? referenceSet.primaryValues
      : referenceSet.alternatives.find((alternative) => alternative.id === choiceId);

    if (!selected) return;

    const allGroupSets = workout.sets.filter((set) => set.groupId === groupId);
    const targetSetCount = selected.setCount || allGroupSets.length;
    const completedGroupSets = allGroupSets.filter((set) => set.done || set.skipped);
    workout.sets = workout.sets.filter((set) => set.groupId !== groupId || set.done || set.skipped);

    const remainingCount = Math.max(0, targetSetCount - completedGroupSets.length);
    for (let offset = 0; offset < remainingCount; offset += 1) {
      workout.sets.push({
        id: crypto.randomUUID(),
        groupId,
        choiceId,
        primaryName: referenceSet.primaryName,
        primaryValues: referenceSet.primaryValues,
        alternatives: referenceSet.alternatives,
        exerciseName: selected.name,
        exerciseOrder: referenceSet.exerciseOrder,
        blockOrder: referenceSet.blockOrder,
        supersetGroup: referenceSet.supersetGroup,
        supersetKey: referenceSet.supersetKey,
        supersetRound: referenceSet.supersetRound ? currentSetNumber + offset : null,
        setNumber: currentSetNumber + offset,
        reps: selected.repCount,
        weight: selected.weight,
        restSeconds: selected.restSeconds,
        unit: selected.unit,
        done: false,
        skipped: false,
        completedAt: null
      });
    }

    sortWorkoutSets(workout.sets);

    const nextGroupIndex = workout.sets.findIndex((set) => set.groupId === groupId && !set.done && !set.skipped);
    const nextOpenIndex = workout.sets.findIndex((set) => !set.done && !set.skipped);
    workout.currentIndex = Math.max(0, nextGroupIndex >= 0 ? nextGroupIndex : nextOpenIndex);
  });
}

function selectSet(index) {
  setState((draft) => {
    if (!draft.activeWorkout?.sets[index]) return;
    draft.activeWorkout.currentIndex = index;
  });
}

function completeSet() {
  setState((draft) => {
    const workout = draft.activeWorkout;
    if (!workout) return;
    const set = workout.sets[workout.currentIndex];
    if (!set) return;

    set.done = true;
    set.skipped = false;
    set.completedAt = new Date().toISOString();
    set.skippedAt = null;

    const nextIndex = findNextOpenSetIndex(workout, workout.currentIndex);
    if (nextIndex >= 0) {
      workout.currentIndex = nextIndex;
      if (shouldRestAfterSet(workout, set, nextIndex)) {
        startTimerInDraft(draft, set.restSeconds);
      } else {
        resetTimer(draft);
      }
    } else {
      resetTimer(draft);
      vibrateOrBeep();
    }
  });
}

function skipSet() {
  setState((draft) => {
    const workout = draft.activeWorkout;
    if (!workout) return;
    const set = workout.sets[workout.currentIndex];
    if (!set) return;

    set.done = false;
    set.skipped = true;
    set.completedAt = null;
    set.skippedAt = new Date().toISOString();

    const nextIndex = findNextOpenSetIndex(workout, workout.currentIndex);
    if (nextIndex >= 0) {
      workout.currentIndex = nextIndex;
    } else {
      resetTimer(draft);
    }
  });
}

function saveSetRecord(form, data) {
  const setId = form.dataset.setId;
  setState((draft) => {
    const workout = draft.activeWorkout;
    const set = workout?.sets.find((item) => item.id === setId);
    if (!set) return;

    set.reps = Math.max(1, Number(data.get("reps")) || 1);
    set.weight = Math.max(0, Number(data.get("weight")) || 0);
    set.restSeconds = Math.max(0, Number(data.get("restSeconds")) || 0);

    const status = String(data.get("status") || "open");
    set.done = status === "done";
    set.skipped = status === "skipped";
    set.completedAt = set.done ? set.completedAt || new Date().toISOString() : null;
    set.skippedAt = set.skipped ? set.skippedAt || new Date().toISOString() : null;

    const setIndex = workout.sets.findIndex((item) => item.id === set.id);
    if (!set.done && !set.skipped && setIndex >= 0) {
      workout.currentIndex = setIndex;
    } else if (setIndex === workout.currentIndex) {
      const nextIndex = findNextOpenSetIndex(workout, workout.currentIndex);
      if (nextIndex >= 0) workout.currentIndex = nextIndex;
    }

    draft.modal = null;
  });
}

function findNextOpenSetIndex(workout, currentIndex) {
  const afterCurrent = workout.sets.findIndex((item, index) => index > currentIndex && !item.done && !item.skipped);
  if (afterCurrent >= 0) return afterCurrent;
  return workout.sets.findIndex((item) => !item.done && !item.skipped);
}

function finishWorkout() {
  setState((draft) => {
    const workout = draft.activeWorkout;
    if (!workout) return;
    const completedSets = workout.sets.filter((set) => set.done);
    const skippedSets = workout.sets.filter((set) => set.skipped);
    if (!completedSets.length && !skippedSets.length) return;

    const completedAt = new Date();
    const startedAt = new Date(workout.startedAt);
    const durationSeconds = Number.isFinite(startedAt.getTime())
      ? Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000))
      : 0;

    draft.history.unshift({
      id: crypto.randomUUID(),
      programName: workout.programName,
      startedAt: workout.startedAt,
      completedAt: completedAt.toISOString(),
      durationSeconds,
      sets: completedSets,
      skippedSets
    });
    draft.activeWorkout = null;
    draft.activeTab = "history";
    resetTimer(draft);
  });
}

function toggleHistory(sessionId) {
  setState((draft) => {
    const expanded = new Set(draft.ui.expandedHistoryIds);
    if (expanded.has(sessionId)) {
      expanded.delete(sessionId);
    } else {
      expanded.add(sessionId);
    }
    draft.ui.expandedHistoryIds = [...expanded];
  });
}

function deleteHistorySession(sessionId) {
  if (!confirm("Delete this workout session from history?")) return;

  setState((draft) => {
    draft.history = draft.history.filter((session) => session.id !== sessionId);
    draft.ui.expandedHistoryIds = draft.ui.expandedHistoryIds.filter((id) => id !== sessionId);
  });
}

function startTimer(seconds) {
  setState((draft) => {
    startTimerInDraft(draft, seconds);
  });
}

function startTimerInDraft(draft, seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  draft.timer = {
    totalSeconds: safeSeconds,
    remainingSeconds: safeSeconds,
    running: safeSeconds > 0,
    targetTime: safeSeconds > 0 ? Date.now() + safeSeconds * 1000 : null
  };
}

function toggleTimer() {
  setState((draft) => {
    if (!draft.timer.remainingSeconds) return;
    draft.timer.running = !draft.timer.running;
    draft.timer.targetTime = draft.timer.running ? Date.now() + draft.timer.remainingSeconds * 1000 : null;
  });
}

function resetTimer(draft) {
  draft.timer = {
    totalSeconds: 0,
    remainingSeconds: 0,
    running: false,
    targetTime: null
  };
}

function tickTimer() {
  if (!state.timer.running || !state.timer.targetTime) return;

  const remaining = Math.max(0, Math.ceil((state.timer.targetTime - Date.now()) / 1000));
  if (remaining !== state.timer.remainingSeconds) {
    state.timer.remainingSeconds = remaining;
    saveState();
    if (state.activeTab === "workout") {
      updateTimerDisplay();
    }
  }

  if (remaining <= 0) {
    state.timer.running = false;
    state.timer.targetTime = null;
    saveState();
    vibrateOrBeep();
    alert("Rest complete. Your next set is ready.");
    if (state.activeTab === "workout") {
      updateTimerDisplay();
    }
  }
}

function updateTimerDisplay() {
  const time = app.querySelector("[data-timer-time]");
  const face = app.querySelector("[data-timer-face]");
  const toggle = app.querySelector("[data-timer-toggle]");
  const reset = app.querySelector("[data-timer-reset]");
  const timer = state.timer;

  if (time) {
    time.textContent = formatTimer(timer.remainingSeconds);
  }

  if (face) {
    const progress = timer.totalSeconds ? 1 - timer.remainingSeconds / timer.totalSeconds : 0;
    face.style.background = `linear-gradient(135deg, #17201c ${Math.round(progress * 100)}%, #24352d)`;
  }

  if (toggle) {
    toggle.textContent = timer.running ? "Pause" : "Resume";
    toggle.disabled = timer.remainingSeconds === 0;
  }

  if (reset) {
    reset.disabled = timer.remainingSeconds === 0;
  }
}

function vibrateOrBeep() {
  if (state.settings.alertMode === "visual-audio") {
    if (navigator.vibrate) navigator.vibrate([160, 80, 160]);
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      oscillator.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
    } catch {
      // Some mobile browsers block audio until the next user gesture.
    }
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify({ ...state, modal: null }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `liftlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importDataFile(input) {
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result || ""));
      if (!isValidBackup(imported)) {
        alert("This file does not look like a LiftLog backup.");
        return;
      }

      if (!confirm("Import this backup and replace the data on this device?")) {
        return;
      }

      state = normalizeImportedState(imported);
      ensureBuiltInPrograms(state);
      saveState();
      render();
      alert("Backup imported.");
    } catch {
      alert("Could not read this backup file.");
    } finally {
      input.value = "";
    }
  };
  reader.onerror = () => {
    input.value = "";
    alert("Could not read this backup file.");
  };
  reader.readAsText(file);
}

function isValidBackup(imported) {
  return imported
    && Array.isArray(imported.exerciseDefinitions)
    && Array.isArray(imported.programs)
    && Array.isArray(imported.history);
}

function normalizeImportedState(imported) {
  return {
    ...defaultState,
    ...imported,
    settings: { ...defaultState.settings, ...(imported.settings || {}) },
    ui: { ...defaultState.ui, ...(imported.ui || {}) },
    timer: { ...defaultState.timer },
    modal: null
  };
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

timerInterval = setInterval(tickTimer, 500);
render();
