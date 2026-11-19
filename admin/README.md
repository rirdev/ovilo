# Ovilo Admin Console & Release Manager

**Location:** `/run/media/rir790/WINSSD/ovilio/admin/`

## Quick Start
You can launch the Admin Console in any browser:
```bash
# Option 1: Using the launcher script
bash /run/media/rir790/WINSSD/ovilio/admin/launch.sh

# Option 2: Direct browser open
xdg-open /run/media/rir790/WINSSD/ovilio/admin/index.html
# or in Zen Browser
zen-browser file:///run/media/rir790/WINSSD/ovilio/admin/index.html
```

---

## Features

### 1. User Directory & Cloud Accounts
- Real-time live synchronization with Firebase Cloud Firestore (`users` collection).
- Lists all registered accounts with:
  - Avatar & Name
  - `@username`
  - Registered Email
  - Theme preference (Cobalt / Dark / Light)
  - Account creation timestamp & last synced timestamp
- Search & filter by username, email, or name.
- View detailed user profile modal (bio, creation, and full cloud sync metadata).

### 2. Live Update Push Manager
- View the current active release in Cloud Firestore.
- Publish a new release with:
  - **Version String** (e.g. `0.2.0`)
  - **Release Title** (e.g. `Ovilo v0.2.0 - Major Upgrade`)
  - **Download URL** (GitHub Release asset or direct package URL)
  - **Android, Linux & Windows Package Links**
  - **Changelog / Release Notes** (bullet points of what's new)
  - **Critical / Mandatory Update** flag
- Real-time Push: When you tap **"Publish Release & Push Notification Now"**, Firestore `system_updates/latest` is updated immediately.
- Every running Ovilo desktop app receives an instant real-time notification popup.
- Reset / Clear: Click **"Reset to Up-to-Date (Clear)"** to revert to an up-to-date state.
