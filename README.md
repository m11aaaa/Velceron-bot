# Velceron Bot

Velceron Bot is a public moderation bot for Root communities, built with Root's official `@rootsdk/server-bot` SDK.

## Commands

Commands are entered as channel messages beginning with `/` (Root bots receive and process channel-message events):

- `/help` — show command help.
- `/ping` — check that the bot responds.
- `/warn @member reason` — store a warning for a member.
- `/warnings @member` — view the last ten stored warnings.
- `/kick @member reason` — remove a member from the community.
- `/ban @member reason` — ban a member.
- `/unban USER_ID` — remove a ban by Root user ID.

## Moderator access

Before using moderation commands, a community administrator must open the bot settings and select the allowed members and/or roles under **Moderation → Moderators**. The bot checks this setting before processing moderation commands and fails closed if it is unavailable. It also prevents kicking or banning members selected as moderators.

Warnings are stored in Root's per-community persistent data store, so each community has its own warning records.

## Permissions

The manifest requests only the permissions currently needed by implemented commands: create messages, ban members, unban members, and kick members. Communities must grant the bot these permissions during installation. Root may still reject actions if the bot lacks permission or the target is protected.

## Local testing vs. production

- `npm run bot` runs Root's **local DevHost** for testing. It is not a production hosting command and will fail on Railway if no Root DevHost is running there.
- Build the package with `npm run package`; the resulting file is `velceron-bot.pkg`.
- Root production hosting uses the official package/upload flow. A successful upload is not proof that the runtime is online.
- Upload requires the `ROOT_AUTH_TOKEN` GitHub Actions secret. Never commit that token or your `DEV_TOKEN` to the repository.
- For local DevHost testing, provide `DEV_TOKEN` in your environment. Do not place real tokens in source files.

## Deployment workflow

GitHub Actions builds and packages the bot on pushes to `fix/root-sdk-migration` and supports manual runs. It saves a `velceron-bot-package` artifact and attempts to upload it to Root when `ROOT_AUTH_TOKEN` is configured.

## Bot ID

The Root manifest uses `ADHy9PMKjwmAAr5BEWHChA`, matching the ID previously shown under **Quick Start → ID** in the Root Developer Portal. Confirm this still matches the bot entry in the portal before publishing.
