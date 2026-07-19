# Contributing to FounDesk

We love contributions from the community! This guide outlines how to contribute to FounDesk effectively.

---

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive in all interactions
- Use welcoming and professional language
- Accept constructive criticism gracefully
- Focus on what's best for the community and project
- Show empathy towards other community members

Unacceptable behaviors include harassment, trolling, personal attacks, and other unprofessional conduct.

---

## How to Report Bugs

1. **Check existing issues** — Search the issue tracker to see if the bug has already been reported
2. **Use a clear title** — Summarize the problem in a concise way
3. **Provide reproduction steps:**
   - Steps to reproduce the behavior
   - Expected behavior vs actual behavior
   - Screenshots or logs if applicable
   - Environment details (OS, browser, Python/Node versions)

---

## How to Suggest Features

1. **Describe the problem** — What is the use case? Why is this feature needed?
2. **Propose a solution** — How should the feature work? Include mockups if possible
3. **Consider alternatives** — What other approaches have you considered?
4. **Tag appropriately** — Use the `enhancement` or `feature-request` label

---

## Development Workflow

### 1. Set Up Your Environment

```bash
git clone https://github.com/your-org/foundesk.git
cd foundesk

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd frontend
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix-name
```

### 3. Make Changes

- Follow the existing code style and patterns
- Write tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

### 4. Run Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test        # Unit tests
npm run e2e    # Playwright E2E tests
```

### 5. Lint and Type Check

```bash
# Backend
ruff check .

# Frontend
cd frontend
npm run lint
npm run build  # Also runs TypeScript checks
```

---

## Pull Request Process

1. **Ensure your branch is up to date** with `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all tests** and ensure they pass

3. **Update documentation** if your changes affect:
   - API endpoints
   - Environment variables
   - Configuration
   - User-facing features

4. **Write a descriptive PR title and body:**
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?
   - Screenshots for UI changes

5. **Request review** from maintainers

6. **Address review feedback** promptly

7. **Merge** after approval (squash commits recommended)

---

## Coding Standards

### Python (Backend)

- Follow **PEP 8** style guidelines
- Use **type hints** for function signatures
- Use **Flask Blueprints** for route organization
- Use **SQLAlchemy** for all database operations
- Name models in singular form (`User`, `Task`, `Goal`)
- Use `snake_case` for functions and variables
- Use `UPPER_CASE` for constants
- Keep functions focused and under 100 lines where possible

### JavaScript/React (Frontend)

- Use **ES6+** syntax
- Use **functional components** with hooks
- Use **React Router** for navigation
- Use **Tailwind CSS** for styling
- Use `camelCase` for variables and functions
- Use `PascalCase` for components
- Keep components focused and extract reusable logic into hooks

### Commit Messages

Follow conventional commits format:

```
type(scope): description

feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes (formatting)
refactor: Code refactoring
test:     Test additions/changes
chore:    Build/config changes
```

---

## Testing Guidelines

- **Backend**: Write pytest tests for routes, services, and models
- **Frontend**: Write Playwright E2E tests for critical user flows
- **Coverage**: Aim for 80%+ code coverage on new code
- **Test data**: Use fixtures and factories for test data
- **Mocking**: Mock external APIs and LLM calls in tests
- **Run before push**: Always run the full test suite before pushing

---

## Questions?

Open a [Discussion](https://github.com/your-org/foundesk/discussions) or reach out to the maintainers.
