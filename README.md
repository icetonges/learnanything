# LearnAnything AI

An AI-native learning planner built with Next.js, React, TypeScript, and CSS. The app helps a learner turn any subject into a 90-day roadmap with monthly plans, weekly milestones, practice charts, model-chain routing, and a mastery capstone.

## Features

- Dark mode by default with a front-end light mode toggle
- Interactive topic, outcome, level, weekly-load, and model controls
- 20-hour accelerated learning sprint with exercises and proof gates
- 90-day mastery roadmap with foundation, fluency, and mastery phases
- Agent chain for Scout, Tutor, Drillmaster, Builder, and Examiner roles
- Weekly operating system that turns study time into concrete outputs
- Cost-aware model marketplace for Gemini, Groq, and Claude options
- API route at `/api/plan` that validates input and returns a structured plan
- Generated local hero image in `public/assets/ai-learning-cockpit.png`
- GitHub Actions CI for install, typecheck, and production build

## Model chain

Model configuration lives in `src/lib/models.ts`. The default planner model is `gemini-3.5-flash`, with additional Google, Groq, and Anthropic options available in the front-end model selector.

The current `/api/plan` route uses a deterministic local planner so the product works without paid keys. It is intentionally shaped as a server-side boundary so live provider adapters can be added without exposing secrets in the browser.

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

This project is ready for Vercel. Import the GitHub repo into Vercel, keep the default Next.js settings, and add model provider keys later as needed:

```bash
GEMINI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
ANTHROPIC_API_KEY=
```
