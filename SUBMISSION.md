# AI BuildFest 2026, Track 1, Case Study 3

## AI HR and Recruitment Bot

TalentBridge Screening Assistant. A first-pass CV screen that scores candidates
against a published rubric, shows the evidence behind every number, and leaves
the decision with the recruiter.

---

## 1. The business problem

TalentBridge Consulting recruits on behalf of client organisations. A single
vacancy can attract hundreds of applications, and recruiters currently compare
each CV against the job description by hand.

Three things go wrong when that happens at volume.

**It does not finish.** A careful first pass takes a few minutes per CV. At 200
applications that is more than a full working day before anybody has been
spoken to, so in practice the pile gets skimmed and the bottom of it gets less
attention than the top.

**It is not consistent.** The same CV read on Friday afternoon scores
differently from Monday morning, and two recruiters on the same vacancy do not
apply the same bar. Nobody can point at where a shortlisting decision came from.

**It carries bias nobody chose.** A CV header is the first thing read and it
carries a name, an age, a gender and an address, none of which predict whether
somebody can do the job.

The recruitment team needs the first pass done quickly, applied identically to
every candidate, and explainable afterwards.

---

## 2. What was built

A web application. The recruiter pastes a job description, uploads a stack of
CVs, and gets back a ranked list where every score can be taken apart.

Four decisions shape it.

**The rubric is fixed and published.** Five weighted criteria totalling 100
points, set before any candidate is seen, printed at the top of the screen. It
does not change per candidate.

**The model rates, the code scores.** The model rates each criterion 0 to 5 and
must quote the words from the CV that justify the rating. It is explicitly
forbidden from producing a total. The total is calculated in code as
`rating / 5 × weight`, summed. That is why the same ratings always produce the
same score, and why a recruiter can recompute any number by hand.

**Scoring is blind.** Name, email, phone, address, date of birth, age, gender,
marital status, nationality, religion and profile links are stripped out before
the text reaches the model, which sees "Candidate C". The recruiter still sees
every real name. Each candidate carries a receipt of what was removed.

**It does not decide.** Nobody is filtered out or rejected. Every candidate
keeps their row, their score and their working. The shortlist is a tick box the
recruiter ticks.

---

## 3. The rubric

| Criterion | Weight | What it measures |
|---|---|---|
| Core skills match | 30 | Coverage of the must-have skills named in the job description |
| Relevant experience | 25 | Closeness of the work history to this role's scope, seniority and domain |
| Tools and technologies | 15 | Hands-on use of the specific tools the job description names |
| Education and certifications | 10 | Only what the job description actually requires |
| Evidence of impact | 20 | Measurable outcomes rather than a list of duties |

Bands: 80 and above is a strong match, 60 and above possible, 40 and above weak,
below 40 not a match. A band is a recommended action, never a decision.

Two rules stop the rubric drifting. Nothing the job description does not ask for
can count as a gap. Any criterion with no supporting evidence in the CV is rated
0 rather than skipped, because skipping would shrink the denominator and quietly
inflate the score.

---

## 4. The workflow

```
Job description  ─┐
                  ├─→  Extract CV text (unpdf)
CV files ─────────┘         │
                            ↓
                    Strip identity  ──→  receipt of what was removed
                            │
                            ↓
              Rate 5 criteria 0-5, with quoted evidence
                    (Claude, one call per CV, 5 in parallel)
                            │
                            ↓
                 Score in code:  Σ (rating / 5 × weight)
                            │
                            ↓
                     Band, rank, explain
                            │
                            ↓
                  Recruiter reads and ticks  ──→  shortlist CSV
```

Failures are isolated per candidate. A CV that cannot be read appears in the
list marked as unreadable rather than scoring zero, because "we could not open
this file" is not the same as "this person is weak", and sorting the two
together would bury a good candidate behind a formatting problem.

---

## 5. Tools, platforms and models used

| Layer | Choice | Why |
|---|---|---|
| Model | Claude Sonnet 5 (`claude-sonnet-5`) | Structured extraction and rating at low latency and low cost. Switchable to Claude Opus 5 with one environment variable |
| Model access | Anthropic API, `@anthropic-ai/sdk` | Structured outputs with a Zod schema, so a malformed response is caught rather than parsed hopefully |
| Reasoning setting | Adaptive thinking, effort `low` | Measured: same ranking as `medium` at roughly a tenth of the time |
| PDF text extraction | `unpdf` | Runs serverless with no native dependencies |
| Schema validation | `zod` | The contract between the model and the scoring code |
| Framework | Next.js 16, React 19, TypeScript | One codebase for the interface and the API route |
| Styling | Tailwind CSS v4 | No component library needed at this size |
| Sample data generation | `pdf-lib` | Builds the 10 sample CVs as real PDFs so the demo exercises the real extraction path |

Prompt caching is enabled on the system prompt. The rubric is byte-identical
across every CV in a batch, so from the second candidate onward it is read from
cache instead of being paid for again.

---

## 6. Sample inputs and outputs

**Input.** One job description for "Data Analyst, Commercial" (1,522 characters,
in `sample-data/job-description.txt`) and 10 CVs as PDFs, in `public/samples/`.
The 10 were written to span the range on purpose: three strong, one borderline,
two weak, and four that should not pass, including one strong software engineer
who is simply the wrong shape for the role, and one CV that lists only duties
with no outcomes.

**Output.** One run, 10 CVs, 24.6 seconds:

| Rank | Candidate | Score | Band |
|---|---|---|---|
| 1 | Chiamaka Nwosu | 98 | Strong match |
| 2 | Ibrahim Sani | 93 | Strong match |
| 3 | Ada Obieze | 91 | Strong match |
| 4 | Fatima Bello | 73 | Possible match |
| 5 | Tunde Bakare | 47 | Weak match |
| 6 | Zainab Yusuf | 40 | Weak match |
| 7 | Bisi Lawal | 38 | Not a match |
| 8 | Kelechi Eze | 34 | Not a match |
| 9 | Emeka Okafor | 19 | Not a match |
| 10 | Segun Adeyemi | 18 | Not a match |

**One score taken apart.** Kelechi Eze, 34 of 100:

| Criterion | Rating | Points | Evidence quoted from the CV |
|---|---|---|---|
| Core skills match | 2/5 | 12 | "Responsible for writing SQL queries to extract data from the core system" |
| Relevant experience | 2/5 | 10 | "Data analyst with three years of experience in reporting and business intelligence" |
| Tools and technologies | 2/5 | 6 | "Used Python (pandas) for data cleaning tasks... maintaining dashboards in Power BI" |
| Education and certifications | 3/5 | 6 | "BSc Mathematics, University of Port Harcourt, 2022" |
| Evidence of impact | 1/5 | 4 | "Responsible for producing weekly and monthly management reports" |

The system caught what that CV was doing: the word "responsible" appears
throughout with no outcome attached to it, so impact rated 1 while the tenure
requirement was still credited.

Screenshots of both views are in `evidence/`.

---

## 7. Evidence that the solution was tested

Four test suites, all runnable. Raw output is saved in `evidence/`.

**De-identification, 12 checks.** All pass. Confirms names, emails, phones,
dates of birth, gender and profile links are removed, and confirms the things
that must survive do: employment date ranges, impact numbers, and business
figures. This suite exists because of a real bug it caught. The first phone
pattern also matched employment date ranges like `(2023-2026)`, which deleted
the work history the experience rating depends on. The fix requires nine digits
before a match counts as a phone number. A year range has eight.

**Extraction, all 10 PDFs.** All pass. Every sample PDF extracts, and no contact
detail or name survives into the text the model reads.

**Full batch.** 10 of 10 screened in 13.2 seconds from the command line, and
every score recomputes exactly from its own ratings. That check runs on every
candidate, every time.

**Consistency, the same 10 CVs screened 3 times.** This is the test that matters
most, because a rubric that moves is not a rubric. Two independent runs:

| Run | Widest spread on any one CV | Candidates whose band changed |
|---|---|---|
| A | 6 points | 1 of 10 |
| B | 6 points | 2 of 10 |

Every candidate that moved band was sitting within 3 points of the 40 boundary.
Nobody in the strong or possible bands moved out of them. Reported honestly:
this system reproduces a ranking, not an identical number, and a score should be
read as roughly plus or minus 3.

Two bugs were found by testing and fixed. The token ceiling was too low, so a
long deliberation could truncate the JSON mid-string and lose the candidate. And
the schema capped the gaps list at four items, which meant a CV with five gaps
failed validation entirely. Both now fail softly: the caps are applied in code
after parsing, and a failed parse retries once before the row is marked.

---

## 8. Expected business impact

The honest version, with the assumption stated rather than buried.

**Assume** a careful manual first pass takes 4 minutes per CV, and a vacancy
draws 200 applications.

| | Manual | With the assistant |
|---|---|---|
| First pass over 200 CVs | 13.3 hours | About 8 minutes of machine time |
| Recruiter time after that | 13.3 hours | Roughly 2 hours reading the top two bands and their evidence |
| Same bar applied to CV 1 and CV 200 | No | Yes |
| Can explain a shortlisting decision six weeks later | Rarely | Yes, the evidence is attached to the score |

The time saved is real but it is not the strongest argument. Two other things
matter more.

**Consistency.** The 200th CV is read against exactly the same five criteria as
the first, by something that does not get tired.

**Defensibility.** When a client or a rejected candidate asks why, there is a
rubric, a rating per criterion, and a quote from the CV behind each one. That is
a materially better position than "the recruiter felt they were not a fit".

And the thing recruiters get back is not time in the abstract. It is the hours
that currently go into skimming, which can go into interviewing instead.

---

## 9. Responsible AI

The case study is explicit that the solution should support the recruiter rather
than make the hiring decision. Four things enforce that rather than promise it.

**The AI never sees who the candidate is.** Telling a model to ignore a name is
not the same as it not having one, because a name carries gender, ethnicity and
nationality signals whether or not you asked for them. So the name is removed
before the request is sent, not filtered out of the answer afterwards.

**The AI cannot produce a score.** It rates five criteria. The arithmetic is
code. There is no path by which a model can hand back a number nobody can check.

**The AI cannot reject anybody.** There is no filter, no cutoff, no auto-decline.
All 10 candidates appear in every screenshot in this submission, including the
ones scoring 18.

**Every rating carries its evidence.** A rating with no quote behind it is a
rating a recruiter cannot audit, so the schema requires one, and "No evidence in
CV" is an allowed and expected answer.

### What this does not do

- It does not verify anything. A confident lie on a CV scores well.
- It does not read scanned or image-only PDFs. Those are flagged for OCR, not
  scored, so a formatting problem never looks like a weak candidate.
- It reduces bias, it does not end it. A school name or a city still carries
  information, and removing those would break education and location matching.
  That trade-off was made deliberately and is worth revisiting with a real
  client.
- The scores move by a few points between runs. Use the bands and the ranking,
  and read the evidence before acting on any single number.
