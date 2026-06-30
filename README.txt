CANADA DAY CROSSWORD SPRINT — GITHUB + FIREBASE VERSION

WHAT IS NEW
- Questions are randomized every time someone starts the game.
- The game pulls 10 questions from a larger question bank.
- Firebase Firestore live leaderboard is included.
- If Firebase is not turned on, it safely uses local browser storage.

HOW TO UPDATE ON GITHUB
1. Unzip this folder.
2. Upload/replace these files in your GitHub repo:
   - index.html
   - style.css
   - script.js
   - firebase-config.js
   - README.txt
3. Commit changes.
4. Wait 1–5 minutes for GitHub Pages to update.
5. Your QR code and URL stay the same.

FIREBASE LIVE LEADERBOARD SETUP
1. Go to https://console.firebase.google.com/
2. Create a project.
3. Go to Build → Firestore Database.
4. Click Create database.
5. Start in TEST MODE for the event.
6. Choose a region and create.
7. Go to Project settings → General.
8. Under Your apps, click Web app: </>
9. Register app, example name: Canada Day Game.
10. Copy the firebaseConfig object.
11. Open firebase-config.js.
12. Paste your firebaseConfig values.
13. Change:
    export const USE_FIREBASE = false;
    to:
    export const USE_FIREBASE = true;
14. Upload firebase-config.js to GitHub and commit.

IMPORTANT FIRESTORE INDEX NOTE
The leaderboard sorts by score and timeUsed. Firebase may ask you to create an index the first time it runs.
If you see an index error in the browser console, click the Firebase link it gives you and create the index.

TEMPORARY TEST MODE RULES FOR EVENT
Use test mode only for a short internal event. For public use, tighten rules later.

PLAY LINK
Your current GitHub Pages URL:
https://hgill241.github.io/Canada-day/

QR CODE
Your existing QR code does not need to change as long as the URL stays the same.
