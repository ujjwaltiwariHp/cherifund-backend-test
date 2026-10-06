---
name: create-pr
description: >-
  Use this skill whenever the user asks you to create a Pull Request (PR) or Draft PR for the backend.
  It automatically runs installation checks locally before opening the PR via the GitHub CLI.
---

# Backend PR Creation Strategy

Whenever the user asks you to create a PR in the backend repository, you MUST follow this workflow to ensure code stability.

## Phase 1: Local Checks
Before creating the PR, you MUST verify that the backend dependencies install successfully without crashing.
Run this command in the terminal:
```bash
npm install
```
- If the installation fails, STOP and fix the `package.json` before opening the PR.

## Phase 2: Create the Draft PR
Once local checks pass, ensure the branch is pushed to origin (`git push -u origin <branch>`).
Then, use the `gh pr create` command to create a Draft PR.

```bash
gh pr create \
  --draft \
  --title "<branch-name-or-commit-title>" \
  --body "## Overview
Brief summary of the backend changes.

## Changes
- What files or logic were modified.

## Verification
- [x] Local \`npm install\` passed successfully."
```

## Phase 3: Check CI Status
After creating the PR, run `gh pr checks` to monitor the GitHub Actions. If the GitHub Action fails, fetch the logs and fix the issue.
