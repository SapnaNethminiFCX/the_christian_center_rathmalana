# /run_sprints — Run a Sprint

Run sprint number: **$ARGUMENTS**

## Instructions

1. Load `_sprints/v01/sprint-{N}.md` (use the most recent version if multiple exist).
2. Read the full sprint — goal, branches, features, checklist.
3. Check current git status: branch, uncommitted changes.

## Before starting any feature

- **Always ask permission** before creating a new branch.
- If there are uncommitted changes on the current branch:
  1. Commit and push current changes.
  2. Create a PR.
  3. Wait for confirmation before continuing.
- Create the branch following the naming pattern in the sprint file.

## For each feature in the sprint

1. Confirm the correct branch is active (or ask to create it).
2. Implement all tasks listed under that feature.
3. Run `npm run type-check` after implementation.
4. Commit with a proper conventional commit message (see `/commit_message`).
5. Push and create a PR.
6. Mark checklist items complete in the sprint file.

## After all features are done

- Report what was completed, what was skipped, and any blockers.
- Update the sprint file status to `Completed` with today's date.

## Notes

- Never skip the branch permission check — always ask even if it seems obvious.
- Never merge PRs yourself — leave that to the user.
- If a feature is blocked (e.g., backend endpoint not ready), note it and move to the next feature.
