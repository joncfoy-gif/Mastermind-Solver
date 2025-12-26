import React, { useEffect, useMemo, useState } from "react";
import {
  ALL_CODES,
  Code,
  Feedback,
  Step,
  codeToString,
  filterRemaining,
  firstGuess,
  isValidFeedback,
  recommendNextGuess
} from "./mastermind";

type ElimInfo = {
  eliminatedAtStep: number | null;
};

const STORAGE_KEY = "mastermind_solver_v1";

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function makeEmptyGuess(): Code {
  return [1, 1, 1, 1];
}

function loadState(): { steps: Step[]; figmaUrl: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { steps: Step[]; figmaUrl?: string };
    if (!Array.isArray(parsed.steps)) return null;
    return { steps: parsed.steps, figmaUrl: parsed.figmaUrl ?? "" };
  } catch {
    return null;
  }
}

function saveState(steps: Step[], figmaUrl: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ steps, figmaUrl }));
}

function PegSelect(props: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      className="pegSelect"
      value={props.value}
      onChange={(e) => props.onChange(Number(e.target.value))}
    >
      <option value={1}>1</option>
      <option value={2}>2</option>
      <option value={3}>3</option>
      <option value={4}>4</option>
      <option value={5}>5</option>
      <option value={6}>6</option>
    </select>
  );
}

function CodeEditor(props: { code: Code; onChange: (c: Code) => void }) {
  const c = props.code;
  return (
    <div className="codeEditor">
      <PegSelect
        value={c[0]}
        onChange={(v) => props.onChange([v as any, c[1], c[2], c[3]])}
      />
      <PegSelect
        value={c[1]}
        onChange={(v) => props.onChange([c[0], v as any, c[2], c[3]])}
      />
      <PegSelect
        value={c[2]}
        onChange={(v) => props.onChange([c[0], c[1], v as any, c[3]])}
      />
      <PegSelect
        value={c[3]}
        onChange={(v) => props.onChange([c[0], c[1], c[2], v as any])}
      />
      <div className="codeString">{codeToString(c)}</div>
    </div>
  );
}

export default function App() {
  const loaded = useMemo(() => loadState(), []);
  const [tab, setTab] = useState<"solve" | "possibilities" | "figma">("solve");
  const [steps, setSteps] = useState<Step[]>(loaded?.steps ?? []);
  const [figmaUrl, setFigmaUrl] = useState<string>(loaded?.figmaUrl ?? "");

  const [currentGuess, setCurrentGuess] = useState<Code>(() => {
    if (steps.length === 0) return firstGuess();
    return makeEmptyGuess();
  });

  const [blackPins, setBlackPins] = useState<number>(0);
  const [whitePins, setWhitePins] = useState<number>(0);

  useEffect(() => {
    saveState(steps, figmaUrl);
  }, [steps, figmaUrl]);

  const remaining = useMemo(() => filterRemaining(steps, ALL_CODES), [steps]);
  const recommended = useMemo(() => recommendNextGuess(remaining, ALL_CODES), [remaining]);

  const eliminationMap = useMemo(() => {
    const info = new Map<string, ElimInfo>();
    for (const code of ALL_CODES) {
      info.set(codeToString(code), { eliminatedAtStep: null });
    }

    for (let i = 0; i < steps.length; i++) {
      const prefix = steps.slice(0, i + 1);
      const keep = new Set(filterRemaining(prefix, ALL_CODES).map(codeToString));
      for (const code of ALL_CODES) {
        const k = codeToString(code);
        const entry = info.get(k)!;
        if (entry.eliminatedAtStep === null && !keep.has(k)) {
          entry.eliminatedAtStep = i + 1;
        }
      }
    }

    return info;
  }, [steps]);

  function addStep() {
    const fb: Feedback = { black: clampInt(blackPins, 0, 4), white: clampInt(whitePins, 0, 4) };
    if (!isValidFeedback(fb)) return;

    const step: Step = { guess: currentGuess, feedback: fb };
    const nextSteps = [...steps, step];
    setSteps(nextSteps);

    setBlackPins(0);
    setWhitePins(0);

    const nextRemaining = filterRemaining(nextSteps, ALL_CODES);
    const nextRec = recommendNextGuess(nextRemaining, ALL_CODES);
    setCurrentGuess(nextRec);
  }

  function resetAll() {
    setSteps([]);
    setCurrentGuess(firstGuess());
    setBlackPins(0);
    setWhitePins(0);
  }

  const invalidFeedback = !isValidFeedback({ black: blackPins, white: whitePins });

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brand">
          <div className="brandTitle">Mastermind Solver</div>
          <div className="brandSub">6 colors, 4 pegs, 1,296 solutions, Knuth minimax</div>
        </div>
        <nav className="tabs">
          <button className={tab === "solve" ? "tab active" : "tab"} onClick={() => setTab("solve")}>
            Solve
          </button>
          <button
            className={tab === "possibilities" ? "tab active" : "tab"}
            onClick={() => setTab("possibilities")}
          >
            Possibilities
          </button>
          <button
            className={tab === "figma" ? "tab active" : "tab"}
            onClick={() => setTab("figma")}
          >
            Figma
          </button>
        </nav>
      </header>

      {tab === "solve" && (
        <main className="content">
          <section className="panel">
            <h2>Step entry</h2>

            <div className="row">
              <div className="label">Recommended guess</div>
              <div className="value mono">{codeToString(recommended)}</div>
              <div className="hint">If you already guessed something else, enter your actual guess instead.</div>
            </div>

            <div className="row">
              <div className="label">Guess</div>
              <div className="value">
                <CodeEditor code={currentGuess} onChange={setCurrentGuess} />
              </div>
            </div>

            <div className="row">
              <div className="label">Feedback pins</div>
              <div className="value pins">
                <label className="pinField">
                  Black
                  <input
                    type="number"
                    value={blackPins}
                    min={0}
                    max={4}
                    onChange={(e) => setBlackPins(clampInt(Number(e.target.value), 0, 4))}
                  />
                </label>
                <label className="pinField">
                  White
                  <input
                    type="number"
                    value={whitePins}
                    min={0}
                    max={4}
                    onChange={(e) => setWhitePins(clampInt(Number(e.target.value), 0, 4))}
                  />
                </label>
                <div className={invalidFeedback ? "warn" : "ok"}>
                  {invalidFeedback ? "Invalid feedback. Black plus white must be 4 or less." : "Looks valid."}
                </div>
              </div>
            </div>

            <div className="actions">
              <button className="primary" onClick={addStep} disabled={invalidFeedback}>
                Add step
              </button>
              <button className="secondary" onClick={resetAll}>
                Reset
              </button>
            </div>

            <div className="row">
              <div className="label">Remaining solutions</div>
              <div className="value mono">{remaining.length}</div>
            </div>

            {remaining.length > 0 && remaining.length <= 20 && (
              <div className="row">
                <div className="label">Remaining list</div>
                <div className="value mono wrap">{remaining.map(codeToString).join(", ")}</div>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>History</h2>
            {steps.length === 0 ? (
              <div className="muted">No steps yet.</div>
            ) : (
              <ol className="history">
                {steps.map((s, idx) => (
                  <li key={idx} className="historyItem">
                    <div className="mono big">{codeToString(s.guess)}</div>
                    <div className="muted">
                      Black {s.feedback.black}, White {s.feedback.white}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </main>
      )}

      {tab === "possibilities" && (
        <main className="content">
          <section className="panel wide">
            <h2>All 1,296 solutions</h2>
            <div className="muted">
              Each code shows whether it is still possible, or which step eliminated it.
            </div>

            <div className="gridMeta">
              <div>
                Total <span className="mono">{ALL_CODES.length}</span>
              </div>
              <div>
                Remaining <span className="mono">{remaining.length}</span>
              </div>
              <div>
                Eliminated <span className="mono">{ALL_CODES.length - remaining.length}</span>
              </div>
            </div>

            <div className="codesGrid">
              {ALL_CODES.map((c) => {
                const k = codeToString(c);
                const elim = eliminationMap.get(k)?.eliminatedAtStep ?? null;
                const cls = elim === null ? "codeTile okTile" : "codeTile elimTile";
                return (
                  <div key={k} className={cls} title={elim === null ? "Remaining" : `Eliminated at step ${elim}`}>
                    <div className="mono">{k}</div>
                    <div className="tileSub">{elim === null ? "In" : `Out ${elim}`}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {tab === "figma" && (
        <main className="content">
          <section className="panel wide">
            <h2>Figma reference</h2>
            <div className="muted">
              Paste a Figma file or prototype URL and the app will remember it locally.
            </div>

            <div className="row">
              <div className="label">Figma URL</div>
              <div className="value">
                <input
                  className="textInput"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  placeholder="https://www.figma.com/file/..."
                />
              </div>
            </div>

            {figmaUrl.trim().length > 0 ? (
              <div className="figmaFrameWrap">
                <iframe className="figmaFrame" src={figmaUrl} allowFullScreen />
              </div>
            ) : (
              <div className="muted">Add a URL to show it here.</div>
            )}
          </section>
        </main>
      )}

      <footer className="footer">
        <div className="muted">
          Tip: You can enter your actual past guesses and pins. The recommendation adapts from your history.
        </div>
      </footer>
    </div>
  );
}
