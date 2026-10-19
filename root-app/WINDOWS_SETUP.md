# Velceron Root App — Windows setup

This guide sets up the **separate Root App** without replacing the existing Velceron Bot.

## Safety boundaries

- Keep the existing Root Bot and its `root-manifest.json` unchanged.
- Do not commit `.env`, `DEV_TOKEN`, access tokens, or passwords to GitHub.
- Never paste a `DEV_TOKEN` into chat or client-side React code.
- The dashboard prototype in `client/VelceronDashboard.tsx` is not connected to live data yet.

## 1. Install the development tools

On the Windows computer, install:
- Node.js 22 or newer.
- Visual Studio Code.
- The Root desktop client.

After installing Node, open **PowerShell** and check:

```powershell
node --version
npm --version
```

## 2. Create a separate Root App project

1. Open the Root Developer Portal and sign in with the same Root account you use in Root.
2. Open **My apps** and choose **New app**.
3. Name it **Velceron Dashboard** and create it.
4. Open the new App's **Settings** and generate a development token for its test community.
5. Keep the token private. Store it only in the local environment file requested by the official starter; never in GitHub.

This creates a distinct App identity. It does not modify the existing Bot.

## 3. Generate the official App starter locally

Open PowerShell and navigate to a separate working folder (not the Bot's root folder), then run:

```powershell
mkdir $HOME\VelceronAppWork
cd $HOME\VelceronAppWork
npx create-root@latest --app VelceronDashboard
cd VelceronDashboard
npm install
```

Follow the generated project's official instructions for adding the App's local development token and building/testing it. Use the token only for the App's test community.

Official guide: https://docs.rootapp.com/docs/app-docs/get-started/

## 4. Bring the App into the repository safely

Do not copy the App's manifest over the Bot manifest. Keep the App as its own project folder, with its own App manifest, client, server, networking and dependencies. Once the starter builds successfully, its files can be added to this repository under a separate folder such as `root-app/VelceronDashboard/`.

The dashboard prototype currently at `root-app/client/VelceronDashboard.tsx` can then be integrated into the generated client entry point and tested.

## 5. Integration plan

The App and Bot are separate Root projects and do not automatically share a database. First make the App run safely in its test community. Then implement only capabilities supported by the documented Root App API, with server-side permission checks for moderation actions. Do not expose the Bot token or attempt to connect to an undocumented private endpoint.

## Current status

- Existing Bot: preserved.
- Dashboard UI prototype: committed on the feature branch.
- Official Root App starter: not yet generated or compiled.
- Live community data and moderation actions: not connected.
- Publishing: not done.
