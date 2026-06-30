// Canada Day Crossword Sprint
// Firebase is optional but recommended for a true live leaderboard across devices.
// 1) Create a Firebase project
// 2) Enable Realtime Database
// 3) Replace firebaseConfig below
// 4) Set USE_FIREBASE = true

const USE_FIREBASE = false;

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

let db = null;
let firebaseReady = false;

async function initFirebase() {
  if (!USE_FIREBASE) return;
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js");
    const { getDatabase, ref, push, onValue } = await import("https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js");
    window.firebaseDB = { ref, push, onValue };
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    firebaseReady = true;
    listenLeaderboard();
  } catch (err) {
    console.warn("Firebase not connected. Using local leaderboard only.", err);
  }
}

const questions = [
  { clue: "Canada's capital city", answer: "ottawa" },
  { clue: "Leaf on Canada's flag", answer: "maple" },
  { clue: "Canada Day month", answer: "july" },
  { clue: "Canada's national winter sport", answer: "hockey" },
  { clue: "Famous fries, cheese curds, and gravy dish", answer: "poutine" },
  { clue: "Canada's one-dollar coin", answer: "loonie" },
  { clue: "Canada's two-dollar coin", answer: "toonie" },
  { clue: "Famous waterfall in Ontario", answer: "niagara" },
  { clue: "Animal known for building dams", answer: "beaver" },
  { clue: "Canada has English and French, so it is ____", answer: "bilingual" }
];

const TOTAL_TIME = 90;
let playerName = "";
let currentIndex = 0;
let score = 0;
let correct = 0;
let timeLeft = TOTAL_TIME;
let timer = null;
let startedAt = null;
let leaderboard = [];

const $ = (id) => document.getElementById(id);
const screens = ["welcomeScreen", "nameScreen", "gameScreen", "gameOverScreen", "leaderboardScreen"];

function showScreen(id) {
  screens.forEach(s => $(s).classList.toggle("active", s === id));
}

function normalize(text) {
  return text.toLowerCase().trim().replace(/[^a-z]/g, "");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startGame() {
  currentIndex = 0;
  score = 0;
  correct = 0;
  timeLeft = TOTAL_TIME;
  startedAt = Date.now();
  $("currentPlayer").textContent = playerName;
  $("scoreDisplay").textContent = score;
  $("timerDisplay").textContent = formatTime(timeLeft);
  $("progressBar").style.width = "100%";
  showScreen("gameScreen");
  loadQuestion();
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    $("timerDisplay").textContent = formatTime(timeLeft);
    $("progressBar").style.width = `${Math.max(0, timeLeft / TOTAL_TIME) * 100}%`;
    if (timeLeft <= 0) finishGame();
  }, 1000);
}

function loadQuestion() {
  if (currentIndex >= questions.length) return finishGame();
  $("questionCount").textContent = `${currentIndex + 1} / ${questions.length}`;
  $("clueText").textContent = questions[currentIndex].clue;
  $("answerInput").value = "";
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("answerInput").focus();
}

function submitAnswer() {
  const userAnswer = normalize($("answerInput").value);
  const realAnswer = normalize(questions[currentIndex].answer);
  if (!userAnswer) return;

  if (userAnswer === realAnswer) {
    correct++;
    score += 10;
    $("feedback").textContent = "Correct!";
    $("feedback").className = "feedback good";
  } else {
    $("feedback").textContent = `Answer: ${questions[currentIndex].answer}`;
    $("feedback").className = "feedback bad";
  }

  $("scoreDisplay").textContent = score;
  currentIndex++;
  setTimeout(loadQuestion, 450);
}

function skipQuestion() {
  currentIndex++;
  loadQuestion();
}

function finishGame() {
  clearInterval(timer);
  const timeUsed = Math.min(TOTAL_TIME, Math.round((Date.now() - startedAt) / 1000));
  let bonus = 0;
  if (correct === questions.length && timeUsed <= 60) bonus = 20;
  else if (correct === questions.length && timeUsed <= 90) bonus = 10;
  score += bonus;

  const entry = {
    name: playerName,
    score,
    correct,
    timeUsed,
    createdAt: Date.now()
  };

  $("finalName").textContent = playerName;
  $("finalScore").textContent = score;
  $("finalCorrect").textContent = correct;
  $("finalTime").textContent = `${timeUsed}s`;

  saveScore(entry);
  showScreen("gameOverScreen");
}

function saveScore(entry) {
  if (firebaseReady) {
    const { ref, push } = window.firebaseDB;
    push(ref(db, "canadaDayLeaderboard"), entry);
  } else {
    const saved = JSON.parse(localStorage.getItem("canadaDayLeaderboard") || "[]");
    saved.push(entry);
    localStorage.setItem("canadaDayLeaderboard", JSON.stringify(saved));
    leaderboard = saved;
    renderLeaderboard();
  }
}

function listenLeaderboard() {
  if (!firebaseReady) return;
  const { ref, onValue } = window.firebaseDB;
  onValue(ref(db, "canadaDayLeaderboard"), (snapshot) => {
    leaderboard = [];
    snapshot.forEach(child => leaderboard.push(child.val()));
    renderLeaderboard();
  });
}

function renderLeaderboard() {
  const list = $("leaderboardList");
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score || a.timeUsed - b.timeUsed).slice(0, 10);
  if (!sorted.length) {
    list.innerHTML = `<div class="empty">No scores yet.</div>`;
    return;
  }
  list.innerHTML = sorted.map((item, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    const isMe = item.name === playerName && item.score === score;
    return `<div class="rank-row ${isMe ? "me" : ""}">
      <div class="rank">${medal}</div>
      <div>${escapeHtml(item.name)}</div>
      <div>${item.score} pts</div>
      <div>${item.timeUsed}s</div>
    </div>`;
  }).join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[tag]));
}

$("startBtn").addEventListener("click", () => showScreen("nameScreen"));
$("playBtn").addEventListener("click", () => {
  const name = $("playerName").value.trim();
  if (!name) {
    $("nameError").textContent = "Please enter your name.";
    return;
  }
  playerName = name;
  $("nameError").textContent = "";
  startGame();
});
$("submitBtn").addEventListener("click", submitAnswer);
$("skipBtn").addEventListener("click", skipQuestion);
$("answerInput").addEventListener("keydown", e => { if (e.key === "Enter") submitAnswer(); });
$("leaderboardBtn").addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboardScreen"); });
$("restartBtn").addEventListener("click", () => showScreen("nameScreen"));
$("playAgainFromBoardBtn").addEventListener("click", () => showScreen("nameScreen"));

initFirebase();
leaderboard = JSON.parse(localStorage.getItem("canadaDayLeaderboard") || "[]");
renderLeaderboard();
