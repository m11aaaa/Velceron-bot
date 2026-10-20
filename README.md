# Velceron Bot

Velceron is a server-only Root Bot built with the official `@rootsdk/server-bot` SDK.

## Commands

- `/velceron help`
- `/velceron ping`
- `/velceron info`
- `/velceron settings`
- `/velceron setup`

The bot also accepts `!velceron` as a text-command fallback.

## Important setup requirement

Before building or packaging, replace the placeholder `id` in `root-manifest.json` with the Bot ID assigned to this project in the Root Developer Portal. Do not reuse the separate dashboard App ID.

## Local test

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Create a local `.env` file based on `.env.example` and set your Root `DEV_TOKEN`. Never commit the real token.
4. Run `npm run build`.
5. Run `npm run bot`.

The bot needs channel visibility and the ability to create messages in the channels where you test it. The manifest currently requests only the `channel.createMessage` permission.
