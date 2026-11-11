# Personal Tracker

A private all-in-one tracker for Justin. It is a personal project, separate from any business app. It runs in the browser with no account and no server.

Use it for:

- Sober days, with a streak, milestones, a day log, and past streaks kept after a reset
- Fasting, with a live timer and a history of completed fasts
- Personal goals, with targets, progress, and dated check-ins
- Weight, with a trend chart
- Gym workouts, with sets and history for each exercise
- Savings, with deposits, withdrawals, and goals
- Extra trackers you add yourself: a counter or a dated log

## Privacy

Everything you type stays in this browser, in local storage on this device. The app does not send entries to a server, does not use analytics, and does not load libraries, fonts, or anything else from the internet. There is no account.

A backup file exists only if you choose Export. That file is yours. Import reads it back on a device you choose.

If this project is published with GitHub Pages, the website address can be public. Anyone who opens it sees the empty app. The entries you log are still stored only in your browser, not on GitHub.

## Download and run

**Download ZIP.** On the GitHub repository, choose **Code**, then **Download ZIP**. Unzip it. Open `index.html` in Chrome, Safari, Firefox, or Edge.

**Or clone it:**

```bash
git clone https://github.com/saintjohnjunk-maker/sj-personal-tracker.git
cd sj-personal-tracker
```

Then either open `index.html`, or start a small local server from that folder:

```bash
python3 -m http.server
```

Open `http://localhost:8000`.

Opening the file directly works for logging. Use the local server, or GitHub Pages, when you want the home-screen install and offline shell.

## Host it free on GitHub Pages

1. Push the project to a GitHub repository on the `main` branch.
2. On GitHub, open **Settings > Pages**.
3. Under **Build and deployment**, deploy from the `main` branch, folder `/ (root)`. Save.
4. After a minute, open the Pages URL GitHub shows. For this repository that is `https://saintjohnjunk-maker.github.io/sj-personal-tracker/`.

## Install it on a phone home screen

Host the app on GitHub Pages, or open it from the local server, before installing. Home-screen install uses the web app manifest. It does not install from a `file://` page.

**iPhone (Safari)**

1. Open the Pages URL in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Name it and tap **Add**.

**Android (Chrome)**

1. Open the Pages URL in Chrome.
2. Tap the menu.
3. Tap **Install app** or **Add to Home screen**.

After the first successful load over http or https, a service worker stores the app files so the shell can open offline. Logged entries are on the device either way. Offline support is best-effort: it works in browsers that support service workers, and the page still works normally when they do not. Opening `index.html` as a file skips the service worker on purpose.

The name on the home screen comes from `manifest.json` and is **Tracker**. The title inside the app is separate. Change that title in **Settings**.

## Customize modules and labels

Open **Settings** (or **Settings & data** on a wide screen).

- Rename a module in the list. Move it **Up** or **Down**. **Remove** asks you to confirm, then deletes that module's entries from this browser.
- **Add a module** to create another copy of a built-in tracker, or a custom **Counter** or **Log**.
- **Labels & units**, or **Customize** on a module, edits the words on headings and buttons, plus units: lb or kg for weight and the gym, a currency symbol for savings, the step size for a counter, and milestone days for a sober streak.
- Changing lb/kg or the currency symbol does not convert numbers already saved. It only changes the label.
- **Edit**, **Delete**, **Save**, and **Cancel** stay the same on every module so those controls stay familiar.

## Back up and restore

In **Settings**:

- **Export backup** downloads a JSON file. Keep it somewhere you control (Files, a drive, a message to yourself).
- **Import backup** replaces the data on this device with that file, after you confirm.
- **Clear all data** erases this browser's copy after you confirm. It does not delete a JSON file you already exported.

Export before you clear data, before you remove a module you might want back, and whenever you want the same log on another phone. Each browser keeps its own copy. Private windows are separate too. Two phones do not sync by themselves: export on one, import on the other.

## Limits

- Storage is the browser's local storage, usually about 5 MB. That is enough for years of personal logs, not for photos or video.
- There is no cloud sync, no account, and no reminders or push notifications.
- The charts are simple trend lines drawn in the page.
- The fasting timer runs while the page is open and catches up from the saved start time when you come back.
- The service worker and home-screen install need http or https. They are skipped for `file://`.
- The installed home-screen name stays **Tracker** unless you edit `manifest.json`.
- This is a personal log. It is not a medical, financial, or counseling product.

There is no build step. `index.html`, `css/styles.css`, and the files in `js/` are the whole app.
