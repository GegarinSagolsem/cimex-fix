# Cited sources — industry numbers for the video, slides and README

Every number we show must come from `docs/benchmark.md` (our own runs) or from this file. Each entry below was
checked against the primary source on 2026-09-26. Use the wording in **Safe to say**; the caveats say why.

## 1. AI fixes that are "almost right" — Stack Overflow Developer Survey 2025

- **Source:** Stack Overflow, *2025 Developer Survey — AI*, <https://survey.stackoverflow.co/2025/ai>
  (press release: <https://stackoverflow.co/company/press/archive/stack-overflow-2025-developer-survey/>)
- **Primary figures:** biggest frustration with AI tools — "AI solutions that are almost right, but not quite": **66%**;
  "Debugging AI-generated code is more time-consuming": **45.2%**. Base: 31,476 respondents who answered the question.
- **Safe to say:** "In Stack Overflow's 2025 survey, 66% of developers said their top frustration with AI is solutions that
  are almost right, but not quite — and 45% said debugging AI-generated code takes longer."
- **Caveat:** self-reported survey of AI users; it measures frustration, not time.

## 2. Half of programming time goes to debugging — Cambridge Judge Business School, 2013

- **Source:** Cambridge Judge Business School news, 25 January 2013,
  <https://www.jbs.cam.ac.uk/2013/research-by-cambridge-mbas-for-tech-firm-undo-finds-software-bugs-cost-the-industry-316-billion-a-year/>
- **Primary figures:** developers "spend 50 per cent of their programming time finding and fixing bugs"; projected cost
  "$312 billion every year" (the page's headline says $316 billion).
- **Safe to say:** "A 2013 Cambridge study estimated developers spend about half their programming time finding and fixing bugs."
- **Caveat:** an MBA student project done *for Undo*, a vendor of debugging tools. Prefer the percentage; if you use the
  dollar figure, use $312 billion from the body text, not the headline's $316 billion.

## 3. 17 hours a week on maintenance — Stripe, *The Developer Coefficient*, September 2018

- **Source:** Stripe with Harris Poll, <https://stripe.com/files/reports/the-developer-coefficient.pdf>
- **Primary figures:** "the average developer spends more than 17 hours a week dealing with maintenance issues, such as
  debugging and refactoring. In addition, they spend approximately four hours a week on 'bad code'" (survey mean 17.3 h).
- **Safe to say:** "Stripe's 2018 Developer Coefficient found developers spend more than 17 hours a week on maintenance
  such as debugging and refactoring."
- **Caveat:** respondents' own estimates; "maintenance" is broader than debugging, so don't call it "17 hours debugging".

## Not used

- **A human-vs-Bob time comparison:** we have no manual baseline (see `context.md` → Decisions), so we claim none.
