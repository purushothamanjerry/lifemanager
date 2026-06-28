# Deployment Guide

## Backend → Render

1. Push the `backend/` folder (or whole repo) to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add Environment Variables in Render dashboard:
   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | `mongodb+srv://...` (your Atlas URI) |
   | `FRONTEND_URL` | `https://your-app.netlify.app` |
5. Deploy. Copy the Render URL (e.g. `https://life-manager-api.onrender.com`).

## Frontend → Netlify

1. Push the `frontend/` folder to GitHub.
2. Create a new site on [netlify.com](https://netlify.com).
3. Set:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. Add Environment Variable in Netlify dashboard:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://life-manager-api.onrender.com` ← your Render URL |
5. Deploy.

## MongoDB Atlas

- Allow network access from **0.0.0.0/0** (any IP) so Render can connect.
- Use a connection string like:
  `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/life-manager?retryWrites=true&w=majority`

## Note on File Uploads (Images)

Render's free tier has **ephemeral disk** — uploaded files (profile photos, memory photos) will be lost on redeploy. For a permanent fix, migrate to Cloudinary or AWS S3. For now it works but images won't persist across deploys.
