# Contributing Guide

Thank you for your interest in contributing to this project! This guide explains how to contribute cleanly and efficiently.

## Getting Started

1. Fork the repository.
2. Clone your fork:

```bash
git clone https://github.com/<your-username>/your-repo.git
cd your-repo
```

3. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

4. Install dependencies:

```bash
npm install
npm run install:all
```

## Development Workflow

- Make small, focused commits.
- Keep your branch up to date with the main branch.
- Run tests and linting before submitting a pull request.

## Code Style

- Use `camelCase` for JavaScript variables and functions.
- Use `PascalCase` for React components.
- Keep components and modules small and easy to reason about.
- Prefer `const` and `let` over `var`.
- Add comments only when the code is not self-explanatory.
- Keep files organized by feature and purpose.

## Commit Messages

Use clear, concise commit messages. Example:

```
feat(auth): add JWT refresh token support
fix(ui): resolve map marker rendering issue
chore: update package dependencies
```

## Pull Request Guidelines

- Provide a descriptive PR title.
- Summarize the change in the PR description.
- Reference any related issues.
- Describe how to test the change.
- Ensure the code compiles and the app runs successfully.

## Testing

Run the frontend or backend test commands if available:

```bash
cd frontend
npm test
```

```bash
cd backend
npm test
```

If no formal test suite exists, document manual verification steps in your PR.

## Reporting Issues

If you find a bug or want to request a feature, use the templates in `.github/ISSUE_TEMPLATE/`.

## Thank You

Your contributions help make this project stronger. We appreciate your effort and care when contributing.
