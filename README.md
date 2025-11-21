# FireSQL Editor

A SQL-like interface for querying, editing, and managing Cloud Firestore collections directly from your browser.

## Features

*   **SQL Syntax**: Query Firestore using familiar syntax (`SELECT * FROM users WHERE age > 21`).
*   **CRUD Operations**: 
    *   `INSERT INTO collection JSON {...}`
    *   `UPDATE collection SET JSON {...} WHERE id = '...'`
    *   `DELETE FROM collection WHERE id = '...'`
*   **Inline Editing**: Click any cell in the result table to edit it directly.
*   **Dynamic Pagination**: Navigate through large collections with Next/Previous controls.
*   **Client-Side Only**: No backend required. Connects directly to Firebase using your Web SDK config.
*   **Security**: Works with your existing Firestore Security Rules.

## Getting Started

### 1. Clone and Install
```bash
git clone https://github.com/your-username/firesql-editor.git
cd firesql-editor
npm install
```

### 2. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Log In
*   **Username**: `admin`
*   **Password**: `password123`

### 4. Connect Firebase
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Project Settings -> General -> Your Apps -> Web App (</>).
3.  Copy the `firebaseConfig` object.
4.  Paste it into the **Database Config** modal in the app.

## Deployment (GitHub Pages)

This repository includes a GitHub Action to automatically deploy to GitHub Pages.

1.  Push this code to a GitHub repository.
2.  Go to your repository **Settings** -> **Pages**.
3.  Under **Build and deployment** > **Source**, select **GitHub Actions**.
4.  The workflow defined in `.github/workflows/deploy.yml` will run on the next push to `main` (or `master`).
5.  Your app will be live at `https://<username>.github.io/<repo-name>/`.

## Firestore Security Rules

Since this is a client-side app, you must configure your Firestore Security Rules to allow access.

**For Development/Testing (Allow All):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note**: For production data, ensure you write strict rules based on your needs.

## Tech Stack
*   React 18
*   TypeScript
*   Vite
*   Tailwind CSS
*   Firebase Web SDK v10
