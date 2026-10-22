# Velceron — Root App

Velceron is a Root App for community support and moderation, with a built-in settings interface.

## Features in this branch
- React-based app settings UI with one Save button.
- Persistent module toggles for tickets, moderation, welcome messages, and logs.
- Editable ticket title, description, button text, staff ping behavior, transcript delivery options, and transcript log channel.
- Editable welcome message and destination channel. Supported placeholders: `{user}` and `{community}`.
- Private setup channels for commands, help, and technical logs.
- Configurable staff role/member access for the private channels.
- Private ticket channels, one open ticket per member, ticket closing, transcript posting, and optional creator notification.
- Permission-gated moderation commands: `/moderation ban <user-id> [reason]`, `/moderation kick <user-id>`, and `/moderation unban <user-id>`.
- Audit log entries for ticket and moderation actions when logging is enabled.
- CI build workflow.

## Initial setup and test checklist
1. Build using the Root SDK DevKit app workflow.
2. Install the app in a test community, not a live community first.
3. Run `/setup` to create private command, help, and technical log channels.
4. Open the app settings, choose a welcome channel ID if needed, customize the ticket template, and click Save.
5. Use `/staff role add <role-id>` and/or `/staff member add <user-id>`, then run `/staff save`.
6. Test tickets, transcripts, welcome messages, moderation permissions, and audit logs with a non-admin test account.
7. Check the technical log channel if an action fails.

## Status
The app networking, server, and client have passed a GitHub Actions build on commit `9a22dcb73dbd9788c2ac96d6ede330075d1e7951`. Later audit-log and UI refinements are still going through CI. A successful build does not replace an in-Root runtime test; do not replace the existing bot on `main` until runtime behavior and permissions have been verified.

The app ID is configured in `root-manifest.json`. Keep credentials and local environment files out of Git.
