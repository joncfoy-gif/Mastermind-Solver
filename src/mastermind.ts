export type Peg = 1 | 2 | 3 | 4 | 5 | 6;
export type Code = [Peg, Peg, Peg, Peg];

export type Feedback = {
  black: number;
  white: number;
};

export type Step = {
  guess: Code;
  feedback: Feedback;
};

export const ALL_CODES: Code[] = generateAllCodes();

export function generateAllCodes(): Code[] {
  const out: Code[] = [];
  for (let a = 1 as Peg; a <= 6; a = (a + 1) as Peg) {
    for (let b = 1 as Peg; b <= 6; b = (b + 1) as Peg) {
      for (let c = 1 as Peg; c <= 6; c = (c + 1) as Peg) {
        for (let d = 1 as Peg; d <= 6; d = (d + 1) as Peg) {
          out.push([a, b, c, d]);
        }
      }
    }
  }
  return out;
}

export function codeToString(code: Code): string {
  return code.join("");
}

export function parseCodeString(s: string): Code | null {
  const t = s.trim();
  if (!/^[1-6]{4}$/.test(t)) return null;
  const nums = t.split("").map((x) => Number(x)) as Peg[];
  return [nums[0], nums[1], nums[2], nums[3]];
}

export function feedbackFor(secret: Code, guess: Code): Feedback {
  let black = 0;

  const secretCounts = new Map<number, number>();
  const guessCounts = new Map<number, number>();

  for (let i = 0; i < 4; i++) {
    if (secret[i] === guess[i]) {
      black++;
    } else {
      secretCounts.set(secret[i], (secretCounts.get(secret[i]) ?? 0) + 1);
      guessCounts.set(guess[i], (guessCounts.get(guess[i]) ?? 0) + 1);
    }
  }

  let white = 0;
  for (const [peg, gCount] of guessCounts.entries()) {
    const sCount = secretCounts.get(peg) ?? 0;
    white += Math.min(sCount, gCount);
  }

  return { black, white };
}

export function isValidFeedback(fb: Feedback): boolean {
  if (fb.black < 0 || fb.white < 0) return false;
  if (fb.black > 4 || fb.white > 4) return false;
  if (fb.black + fb.white > 4) return false;
  return true;
}

export function filterRemaining(steps: Step[], candidates: Code[] = ALL_CODES): Code[] {
  let remaining = candidates;
  for (const step of steps) {
    remaining = remaining.filter((secret) => {
      const fb = feedbackFor(secret, step.guess);
      return fb.black === step.feedback.black && fb.white === step.feedback.white;
    });
  }
  return remaining;
}

function feedbackKey(fb: Feedback): string {
  return `${fb.black}${fb.white}`;
}

export function recommendNextGuess(remaining: Code[], allGuesses: Code[] = ALL_CODES): Code {
  if (remaining.length === 0) return [1, 1, 2, 2];
  if (remaining.length === 1) return remaining[0];

  const remainingSet = new Set(remaining.map(codeToString));
  let bestGuess: Code = [1, 1, 2, 2];
  let bestScore = Infinity;
  let bestIsRemaining = false;

  for (const guess of allGuesses) {
    const partitions = new Map<string, number>();

    for (const secret of remaining) {
      const fb = feedbackFor(secret, guess);
      const k = feedbackKey(fb);
      partitions.set(k, (partitions.get(k) ?? 0) + 1);
    }

    let worst = 0;
    for (const v of partitions.values()) {
      if (v > worst) worst = v;
      if (worst >= bestScore) break;
    }

    const isInRemaining = remainingSet.has(codeToString(guess));
    if (worst < bestScore) {
      bestScore = worst;
      bestGuess = guess;
      bestIsRemaining = isInRemaining;
    } else if (worst === bestScore) {
      if (isInRemaining && !bestIsRemaining) {
        bestGuess = guess;
        bestIsRemaining = true;
      } else if (isInRemaining === bestIsRemaining) {
        if (codeToString(guess) < codeToString(bestGuess)) {
          bestGuess = guess;
        }
      }
    }
  }

  return bestGuess;
}

export function firstGuess(): Code {
  return [1, 1, 2, 2];
}
