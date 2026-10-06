---
name: branch-naming-convention
description: >-
  Use this skill whenever the user asks you to create a new Git branch OR merge a branch to main.
  It enforces branch naming conventions and auto-increments counts, and ensures branches are squashed and deleted upon merging.
---

# Git Branching Strategy

Whenever you are asked to create a new branch, you MUST follow these conventions:

## Naming Conventions
- **Bug Fixes:** `fix/PROD-<COUNT>-<issue-name>`
  - Example: `fix/PROD-0001-banner-title-issue`
  - *Reasoning: Bug fixes generally target production issues.*
- **New Features:** `feature/DEV-<COUNT>-<feature-name>`
  - Example: `feature/DEV-0001-payment-gateway`
  - *Reasoning: Features are always deployed to dev first.*

## Numbering Rule
The `<COUNT>` must always be a 4-digit zero-padded number (e.g., `0001`, `0002`).

Before creating the branch, you MUST:
1. Check the existing remote branches to find the latest count for either `PROD` or `DEV`. (e.g., `git ls-remote --heads origin`).
2. Increment the latest count by 1.
3. If no branches exist yet, start the count at `0001`.

## Instructions
1. Run `git ls-remote --heads origin` or `git branch -a` to see existing remote branches.
2. Determine the next available count for `PROD` (if fixing a bug) or `DEV` (if adding a feature).
3. Create the branch locally: `git checkout -b <branch-name>`.
4. Ensure you use lowercase and hyphens for the `<issue-name>` or `<feature-name>` suffix.

## Merging to Main
Whenever the user asks you to merge a branch into `main` (or `master`), you MUST:
1. Ask the user if they want to **Squash and Merge** the branch to keep the commit history clean.
2. Ask the user if they want to **Delete the branch** locally and remotely after the merge is complete.
3. Wait for the user's confirmation before executing the merge commands (e.g., `git merge --squash <branch>`, `git branch -D <branch>`, `git push origin --delete <branch>`).
