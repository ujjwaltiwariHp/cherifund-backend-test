---
name: draft-pr-creation
description: >-
  Use this skill whenever the user asks you to create a Pull Request (PR) or Draft PR.
  It enforces creating Draft PRs via the GitHub CLI (gh) with a proper description format.
---

# PR Creation Strategy

Whenever the user asks you to create a PR, you MUST create a **Draft PR** using the GitHub CLI (`gh`) and follow this standardized template.

## Requirements
- Use the `gh pr create` command.
- Always include the `--draft` flag unless instructed otherwise.
- The title must match the branch naming convention (e.g. `fix: ...` or `feat: ...`).

## PR Body Template
Your PR body MUST include these sections:
1. **Overview**: A one-sentence summary of the problem and solution.
2. **Changes**: Bulleted list of exactly what files/logic were changed.
3. **Testing**: How the changes were verified.

## Example Command
```bash
gh pr create \
  --draft \
  --title "fix: update banner title and subtitle limits to 60 words" \
  --body "## Overview
This PR removes the hardcoded 150-character limit and replaces it with a strict 60-word limit for both English and Hindi text on Banners.

## Changes
- Updated \`addBanner\` and \`updateBanner\` in \`banner.js\` to split text by whitespace and count words.
- Updated \`errors/banner.js\` messages to reflect the new 60-word rule.

## Testing
- Verified locally that strings exceeding 60 words throw the proper 400 error.
- Verified that strings under 60 words save successfully."
```

## Instructions for Agent
1. Ensure the branch has been pushed to the remote (`git push -u origin <branch-name>`).
2. Run the `gh pr create` command directly in the terminal.
3. If the user does not have `gh` installed or authenticated, provide them with the exact command to run.
