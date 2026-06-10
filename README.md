# LearnAnything AI

An AI-native learning planner built with Next.js, React, TypeScript, and CSS. The app helps a learner turn any subject into a 90-day roadmap with monthly plans, weekly milestones, practice charts, model-chain routing, and a mastery capstone.

## Features

- Dark mode by default with a front-end light mode toggle
- Interactive topic, outcome, and intensity controls
- 90-day plan with monthly roadmap tabs
- Weekly practice-load chart and mastery confidence visualization
- Process-flow view for intake, knowledge graphing, model routing, practice loops, milestones, and proof of mastery
- LLM chain concept for Gemini, Groq, DeepSeek, and Claude specialist routing
- Generated local hero image in `public/assets/ai-learning-cockpit.png`
- GitHub Actions CI for install, typecheck, and production build

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
