# Velceron — Root App

Velceron is being converted from the original bot project into a Root App with a built-in settings interface.

## Current app workspace
- `client/`: React settings interface with module toggles, ticket-template fields, behavior options, live preview, and a single Save button.
- `server/`: Root app server, existing community commands, ticket workflow, and settings RPC service.
- `networking/`: Root SDK protocol definition connecting the settings UI to the server.
- `root-manifest.json`: Root App manifest using the new app ID.

## Initial setup
1. Build using the Root SDK DevKit workflow for apps.
2. Install the app in a test community first.
3. Run `/setup` in the community to create private command, help, and technical log channels.
4. Open the app settings interface and test saving configuration.
5. Test ticket creation, permissions, ticket closing, and transcript delivery with a non-admin test account before using it in a live community.

## Important status
This branch is an in-progress migration. The settings UI and RPC scaffold have been added, but a successful build and in-Root runtime test are still required. The moderation and welcome switches are configuration flags; they do not yet represent a complete moderation/welcome feature set. Do not replace the working bot on `main` until the app branch passes tests.

The app uses the Root app ID configured in `root-manifest.json`. Keep credentials and local environment files out of Git.
