# Demo script

Four minutes. Written to be talked over, not read out.

Before you start: `npm run dev`, open http://localhost:3000, and have the page
loaded but empty. Do not pre-load the sample. The click is part of the demo.

---

## 0:00 to 0:30, the problem

> "TalentBridge recruits for client companies. One vacancy pulls in a couple of
> hundred CVs, and a recruiter reads each one against the job description by
> hand. At four minutes a CV, that is a day and a half before anybody has been
> interviewed. So in practice the pile gets skimmed, the bar drifts between the
> first CV and the last, and six weeks later nobody can say why a particular
> person was cut."

Do not oversell. Three sentences and move.

---

## 0:30 to 1:00, the rubric first

Point at the rubric strip at the top of the page before uploading anything.

> "Before we look at a single candidate, this is the rubric. Five criteria,
> fixed weights, adding to a hundred. It is set before any CV arrives and it is
> printed on the page, because a score nobody can recompute is not a score."

This is the moment that separates the build from a wrapper around a chat box.
Spend the time here.

---

## 1:00 to 1:45, run it

Click **Load the sample role and 10 CVs**, then **Screen 10 CVs**.

While it runs, roughly 25 seconds, say what is happening:

> "It is pulling the text out of each PDF, then stripping the identity, the
> name, the email, the phone, the date of birth, the gender, before anything is
> sent to the model. The model is screening 'Candidate C'. Five at a time."

Do not fill the silence with apologies for the wait. Narrate the pipeline.

---

## 1:45 to 2:45, the ranking, then the working

Let the ranked list land. Give it a beat.

> "Ten CVs, twenty five seconds. Three strong, one possible, and the rest below
> the line. Nobody has been rejected. Every candidate is still on this list."

Now click **Show working** on the top candidate. This is the centre of the demo.

> "Every rating has the words from the CV that earned it. Five out of five on
> impact, and here is the quote it came from. The model rated the five
> criteria. It never produced this total. The total is arithmetic in code,
> rating over five times weight, which is why I can recompute any number on this
> page by hand."

Then scroll to the redaction receipt at the bottom of the expanded card:

> "And here is what the model never saw."

---

## 2:45 to 3:15, the one that proves it works

Scroll to Kelechi Eze, 34, and expand.

> "This CV has the right degree, the right three years, and all three tools
> named. It scores 34. Look at impact: one out of five. The word 'responsible'
> appears six times in this CV and not once is there an outcome attached to it.
> That is the difference between a keyword match and a screen."

If you only have time for one expanded candidate, make it this one rather than
the top scorer. Anyone can rank a great CV first.

---

## 3:15 to 3:45, testing

> "I screened the same ten CVs three times to see whether the scores hold. The
> widest any single score moved was six points, and nine of ten candidates kept
> their band. The one that moved was sitting two points off the boundary. So I
> would tell a recruiter to trust the bands and the ranking, and read the
> evidence before acting on any single number."

Volunteering the limitation is stronger than being asked about it.

---

## 3:45 to 4:00, close

Tick three candidates. The shortlist bar fills. Click **Export shortlist**.

> "The recruiter ticks the box. The system never does. It does the reading, and
> it shows its working, and the hiring decision stays with the person
> accountable for it."

---

## If you are asked

**"Why not just use ChatGPT for this?"**
Three reasons, and none of them are the model. The rubric is fixed and published
rather than improvised per CV. The arithmetic happens in code, so the score is
reproducible. And the model never sees the candidate's name, which you cannot do
by pasting a CV into a chat window.

**"How do you know it is not biased?"**
I do not, and I would not claim it. What I can show is that the identity signals
are removed before the request is sent, not filtered out of the answer
afterwards, and that every rating carries a quote you can check against the CV.
Bias reduced and audited, not bias solved.

**"What if the CV is a scan?"**
It gets flagged as needing OCR, not scored. That was deliberate. A CV the system
cannot read must never look like a weak candidate.

**"What does it cost to run?"**
Fractions of a cent per CV on Sonnet 5. The rubric is cached across a batch, so
only the first CV in a run pays for the system prompt.

**"Could it handle a thousand CVs?"**
The screening is per CV and runs in parallel, so it scales by widening the pool.
At that volume I would add a queue and stream results in as they land, rather
than making the recruiter wait for the batch.
