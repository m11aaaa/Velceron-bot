# Hideouter Root Bot

This project uses Root's official `@rootsdk/server-bot` SDK.

## Bot ID

The manifest currently uses `ADHy9PMKjwmAAr5BEWHChA`, matching the ID shown under **Quick Start → ID** in the Root Developer Portal. If the portal shows a different ID for this bot, update `root-manifest.json` to match it.

## What the bot does

Only the Root user configured in `SETUP_ALLOWED_USER_ID` can run `!setup`. The bot checks for existing channel groups and channels and creates only missing items:

- **INFO CENTER:** welcome, rules, announcements
- **THE LOUNGE:** main-chat, memes, media, food-porn
- **BOT ZONE:** ai-art, bot-commands

Required permissions are declared in `root-manifest.json`.

## Local testing vs. production

- `npm run bot` runs Root's **local DevHost** for testing. It is not a production hosting command and will fail on Railway if no Root DevHost is running there.
- Root production hosting uses the official package and upload flow. Build a package with `npm run package`; the resulting file is `hideouter-root-bot.pkg`.
- Upload requires a valid upload/authentication token from the Root Developer Portal. Never commit this token or `DEV_TOKEN` to the repository.

## Automated package and upload

The GitHub Actions workflow builds a package and saves it as an artifact. If you add a repository secret named `ROOT_AUTH_TOKEN`, the workflow will also attempt to upload the package to Root's cloud. This is a deployment upload, not the same thing as publishing/unlocking the app in the Root Store.

The bot's test environment also needs a valid `DEV_TOKEN` and `SETUP_ALLOWED_USER_ID`. Do not put secrets in source files.


## CI status

The GitHub Actions workflow builds the bot package on pushes to `fix/root-sdk-migration`. If `ROOT_AUTH_TOKEN` is available as a repository secret, it also attempts the Root cloud upload. Check the workflow run to confirm the upload step itself succeeded.
