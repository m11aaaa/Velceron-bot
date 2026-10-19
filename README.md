# Hideouter Root Bot

This branch migrates the old custom WebSocket script to Root's official `@rootsdk/server-bot` SDK.

## Required before running

1. In the Root Developer Portal, create/open this bot and copy its actual Bot ID into `root-manifest.json`, replacing `REPLACE_WITH_ROOT_DEVELOPER_PORTAL_BOT_ID`.
2. Create a valid `DEV_TOKEN` for this bot.
3. Configure `DEV_TOKEN` and `SETUP_ALLOWED_USER_ID` as environment variables in your test environment. Never commit either secret.
4. The account associated with `SETUP_ALLOWED_USER_ID` is the only one allowed to trigger `!setup`.
5. Install dependencies with `npm install`, build with `npm run build`, and test using `npm run bot`.

The bot creates missing channel groups and channels without duplicating existing ones:
- INFO CENTER: welcome, rules, announcements
- THE LOUNGE: main-chat, memes, media, food-porn
- BOT ZONE: ai-art, bot-commands

Root's documented production flow packages and uploads the bot to Root hosting. `rootsdk start devhost` is for testing; a third-party host is not a substitute for Root's production publish flow.
