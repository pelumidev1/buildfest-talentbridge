# TalentBridge Screening Assistant

A first-pass CV screen for recruiters. You give it a job description and a stack
of CVs. It reads each one, strips the candidate's identity, scores the CV against
a fixed rubric, shows the evidence behind every rating, and hands you a ranked
list. You decide who gets interviewed.

Built for AI BuildFest 2026, Track 1, Case Study 3.

## Try it

**https://buildfest-talentbridge.vercel.app** — access code `talentbridge-1fc26f39`

The code is a shared passphrase, not an auth system. It is there because every
screening run spends real Anthropic credit, and the door should not stand open
on the public internet. Once you are in, click "Load the sample role and 10 CVs"
and screen them.

## Run it locally

```bash
npm install
```

Copy `.env.example` to `.env.local` and add your Anthropic API key:

```bash
cp .env.example .env.local
```

Then start it:

```bash
npm run dev
```

Open http://localhost:3000 and click "Load the sample role and 10 CVs" to see it
work without uploading anything.

## What it does, in order

1. **Reads the CV.** PDF text extraction with `unpdf`. Plain text files work too.
   A scanned, image-only PDF is flagged rather than scored, because a CV the
   system could not read must not look like a weak candidate.
2. **Removes the identity.** Name, email, phone, address, date of birth, age,
   gender, marital status, nationality, religion and profile links are stripped
   before the text goes anywhere near the model. The model sees "Candidate C".
3. **Rates five criteria.** One call per CV. The model rates each criterion 0 to
   5 and must quote the words from the CV that justify the rating.
4. **Calculates the score in code.** The model never returns a total. Points for
   a criterion are `rating / 5 × weight`, summed. Same ratings, same score, every
   time, and a recruiter can recompute any number by hand.
5. **Ranks and explains.** Every candidate keeps their row, their score, their
   evidence and their gaps. Nobody is filtered out.
6. **Waits for you.** The shortlist is a tick box. The system never ticks it.

## The rubric

| Criterion | Weight | What it measures |
|---|---|---|
| Core skills match | 30 | Coverage of the must-have skills in the job description |
| Relevant experience | 25 | Closeness of the work history to this role's scope and domain |
| Tools and technologies | 15 | Hands-on use of the specific tools named in the job description |
| Education and certifications | 10 | Only what the job description actually requires |
| Evidence of impact | 20 | Measurable outcomes rather than a list of duties |

Bands: 80+ strong match, 60+ possible match, 40+ weak match, below 40 not a match.
A band is a recommended action, not a decision.

The weights are set in `src/lib/rubric.ts` before any CV is seen and do not change
per candidate. Edit that file to re-weight the screen for a different role.

## Project layout

```
src/lib/rubric.ts     the criteria, weights, bands, and the scoring arithmetic
src/lib/redact.ts     identity stripping, and the receipt of what was removed
src/lib/extract.ts    PDF and plain-text extraction
src/lib/screen.ts     the Claude call: prompt, schema, and result normalising
src/app/api/screen/   the batch route, concurrency pool, and error isolation
src/components/       the result card and shared UI
sample-data/          the sample job description and 10 CVs as plain text
public/samples/       the same 10 CVs as PDFs, for the demo loader
scripts/              tests and the sample PDF generator
```

## Tests

```bash
npm run test:redact
```

Checks that identity is removed and that employment date ranges, impact numbers
and business figures survive the redaction pass.

```bash
npm run test:extract
```

Runs all 10 sample PDFs through extraction and redaction and checks that no
contact detail or name survives into what the model would read.

```bash
npm run test:screen
```

Screens all 10 sample CVs against the sample role and prints the ranked result.
This one calls the API and costs money.

```bash
npm run test:consistency
```

Screens the same 10 CVs three times and reports how far any single score moved
and whether any candidate changed band. This is the test that says how much
weight a single number can carry. It calls the API three times over and is the
most expensive of the four.

## Model

Defaults to Claude Sonnet 5. Set `SCREENER_MODEL=claude-opus-5` in `.env.local`
for a sharper read when it matters more than the bill.

## What this does not do

- It does not decide who is hired, and it does not reject anyone.
- It does not read scanned CVs. Those need OCR first and are flagged.
- It does not check references, verify claims, or detect a CV that is lying.
- It removes the obvious identity signals. It cannot remove every possible one,
  and a school name or a city can still carry information. Blind screening
  reduces bias. It does not end it.
