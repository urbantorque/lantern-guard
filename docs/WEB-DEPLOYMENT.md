# Hosted game

The game is a static Vite build. The Sites project is recorded in `.openai/hosting.json`; reuse its `project_id` for future releases. The deployment serves `dist/` and needs no application secrets or database.

## Release steps

1. Commit the source, including `.openai/hosting.json`.
2. Run `npm run build` from that commit.
3. Push the exact commit to the Sites source repository using a short-lived repository credential. Keep the credential in memory only.
4. Package `.openai/hosting.json` and `dist/` into a tar archive under ignored `dist-artifact/`.
5. Save a Sites version with that archive and the pushed commit SHA, then deploy the saved version. Preserve the site's existing access settings.
6. Confirm deployment success, open the resulting HTTPS URL and test the game with audio muted.

The Sites source repository is separate from a GitHub remote. A successful Sites publication does not mean the game has been pushed to GitHub.

Browser saves belong to each origin and browser. Localhost progress does not automatically appear on the hosted URL. Hosting does not add server-side progress storage.
