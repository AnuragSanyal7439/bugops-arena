# Deployment Guide

BugOps Arena is a static app. It does not require a build step.

## Vercel

1. Import the GitHub repository.
2. Choose **Other** as the framework preset.
3. Leave the build command empty.
4. Use `.` as the output directory.
5. Deploy.

## Netlify

1. Create a new site from GitHub.
2. Leave the build command empty.
3. Set the publish directory to `.`.
4. Deploy.

## Static Files Included

- `vercel.json` for clean static hosting behavior
- `netlify.toml` for Netlify publish settings
- `_redirects` for SPA-style fallback routing
- `manifest.webmanifest` for installable app metadata
