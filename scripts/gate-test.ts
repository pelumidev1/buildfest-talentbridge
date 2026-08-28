// The gate decides whether a stranger gets to spend our Anthropic credit, so
// its three states are worth pinning down. isUnlocked() needs a live request
// context for the cookie, so it is exercised against the deployed URL instead;
// what is checkable here is which state the environment puts us in.
//
// gateState() reads process.env on every call rather than at module load, so
// setting the variables between assertions is enough to move between states.

import { codeMatches, gateIsMisconfigured } from "../src/lib/gate";

const checks: [string, boolean][] = [];

function setEnv(env: { NODE_ENV?: string; SCREENER_ACCESS_CODE?: string }): void {
  // NODE_ENV is readonly in the Next type definitions but writable at runtime,
  // which is the whole point of the test.
  // Assigning undefined to a process.env key stores the string "undefined",
  // which would leave the gate looking configured with a nonsense code. Delete.
  const target = process.env as Record<string, string | undefined>;
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete target[key];
    else target[key] = value;
  }
  for (const key of ["NODE_ENV", "SCREENER_ACCESS_CODE"]) {
    if (!(key in env)) delete target[key];
  }
}

const original = { NODE_ENV: process.env.NODE_ENV, SCREENER_ACCESS_CODE: process.env.SCREENER_ACCESS_CODE };

setEnv({ NODE_ENV: "development" });
checks.push(["dev with no code is not flagged as misconfigured", !gateIsMisconfigured()]);
checks.push(["dev has no door, so no code 'matches'", !codeMatches("anything")]);

setEnv({ NODE_ENV: "production" });
checks.push(["production with no code IS misconfigured", gateIsMisconfigured()]);
// The regression this guards: an unset code used to mean "open to everyone",
// so a fresh environment would let any visitor spend real credit.
checks.push(["production with no code refuses an empty code", !codeMatches("")]);
checks.push(["production with no code refuses a guess", !codeMatches("talentbridge-1fc26f39")]);

setEnv({ NODE_ENV: "production", SCREENER_ACCESS_CODE: "correct-horse" });
checks.push(["configured production is not misconfigured", !gateIsMisconfigured()]);
checks.push(["the right code opens it", codeMatches("correct-horse")]);
checks.push(["a near-miss does not", !codeMatches("correct-hors")]);
checks.push(["a longer wrong code does not", !codeMatches("correct-horse-battery")]);
checks.push(["an empty code does not", !codeMatches("")]);

setEnv(original);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
process.exit(failed > 0 ? 1 : 0);
