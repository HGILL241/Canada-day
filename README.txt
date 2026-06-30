CANADA DAY MCQ CHALLENGE — GITHUB + FIREBASE VERSION

FILES TO UPLOAD TO GITHUB:
- index.html
- style.css
- script.js
- firebase-config.js
- README.txt

WHAT CHANGED:
- Game is now MCQ/multiple-choice.
- Questions appear in random order every time.
- Answer choices also shuffle.
- Firebase leaderboard query was fixed to avoid composite index errors.
- Leaderboard shows a Firebase connection status message.

GITHUB UPDATE STEPS:
1. Download/unzip this project.
2. Open your GitHub repo: https://github.com/hgill241/Canada-day
3. Upload/replace all 5 files listed above.
4. Commit changes.
5. Wait 1–5 minutes.
6. Open: https://hgill241.github.io/Canada-day/

FIREBASE SETUP:
1. Go to Firebase Console.
2. Create/select your project.
3. Add a Web App.
4. Copy the firebaseConfig object.
5. Open firebase-config.js.
6. Replace the placeholder config.
7. Change:
   export const USE_FIREBASE = false;
   to:
   export const USE_FIREBASE = true;
8. Commit changes to GitHub.

FIRESTORE DATABASE:
1. Firebase Console → Build → Firestore Database.
2. Create database.
3. Start in test mode for quick event testing.
4. Choose a location close to Canada/US.

RECOMMENDED TEMPORARY FIRESTORE RULES FOR TESTING:
Use only for the event/testing window, then tighten later.

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /canadaDayLeaderboard/{docId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}

HOW TO VERIFY LIVE LEADERBOARD:
1. Open the site on your phone.
2. Open the same site in an incognito/private browser or another phone.
3. Play once on both.
4. Go to View Leaderboard.
5. If Firebase is connected, both scores appear on both devices.

COMMON ISSUE:
If leaderboard says Firebase failed, check:
- USE_FIREBASE is true.
- firebaseConfig is pasted correctly.
- Firestore Database is created.
- Firestore rules allow read/create for canadaDayLeaderboard.
- File name is exactly firebase-config.js.
