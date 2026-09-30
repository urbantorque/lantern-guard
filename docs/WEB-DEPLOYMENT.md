# Hosted game

The public demo is [Nightward on GitHub Pages](https://urbantorque.github.io/lantern-guard/). The existing URL remains stable after the rename. It opens without a download or sign-in and respects the player's saved sound preference. Use the speaker button to enable sound if it was previously muted.

For background browser work, append `?muted=1`. That preview stays silent for the visit without changing saved preferences. Return to the normal address to test audio. The publishing script labels the normal play link and silent preview separately.

## GitHub Pages

GitHub serves the static production build from the root of the `gh-pages` branch. The `main` branch contains the source. Relative asset URLs work beneath `/lantern-guard/`; `.nojekyll` keeps the compiled files unchanged.

To update the public demo from a clean, committed checkout, run `./scripts/publish-pages.ps1` in PowerShell. It builds the game, uses a temporary Git index to commit only `dist/` to `gh-pages`, then pushes it without switching the working branch. It preserves deployment history and refuses to overwrite another Pages configuration. The GitHub CLI must be signed in as a repository administrator. Confirm the resulting Pages build has completed before sharing an update.

## Private Sites build

The earlier [Sites deployment](https://lantern-guard.chic-bee-3413.chatgpt.site/?muted=1) remains a separate owner-private build and may ask for ChatGPT sign-in.

The game is a static Vite build. The Sites project is recorded in `.openai/hosting.json`; reuse its `project_id` for future releases. The deployment serves `dist/` and needs no application secrets or database.

### Sites release steps

1. Commit the source, including `.openai/hosting.json`.
2. Run `npm run build` from that commit.
3. Push the exact commit to the Sites source repository using a short-lived repository credential. Keep the credential in memory only.
4. Package `.openai/hosting.json` and `dist/` into a tar archive under ignored `dist-artifact/`.
5. Save a Sites version with that archive and the pushed commit SHA, then deploy the saved version. Preserve the site's existing access settings.
6. Confirm deployment success, open the resulting HTTPS URL and test the game with audio muted.

The Sites source repository is separate from a GitHub remote. A successful Sites publication does not mean the game has been pushed to GitHub.

Browser saves belong to each origin and browser. Localhost progress does not automatically appear on the hosted URL. Hosting does not add server-side progress storage.
