// Canada Day Crossword Sprint — GitHub Pages + Firebase Firestore ready
// Features: random question order every play, live leaderboard, local fallback.

import { USE_FIREBASE, firebaseConfig } from "./firebase-config.js";

const TOTAL_TIME = 90;
const QUESTIONS_PER_GAME = 10;
const FIREBASE_COLLECTION = "canadaDayLeaderboard";

let db = null;
let firebaseReady = false;
let firebaseFns = {};

async function initFirebase() {
  if (!USE_FIREBASE) {
    setConnectionStatus("Local leaderboard mode");
    return;
  }

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js");
    const {
      getFirestore,
      collection,
      addDoc,
      query,
      orderBy,
      limit,
      onSnapshot,
      serverTimestamp
    } = await import("https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseFns = { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp };
    firebaseReady = true;
    setConnectionStatus("Live leaderboard connected");
    listenLeaderboard();
  } catch (err) {
    console.warn("Firebase not connected. Using local leaderboard only.", err);
    setConnectionStatus("Firebase not connected — local mode");
    loadLocalLeaderboard();
  }
}

const allQuestions = [
  { clue: "Canada's capital city", answer: "ottawa", accepted: ["ottawa"] },
  { clue: "Leaf on Canada's flag", answer: "maple", accepted: ["maple", "maple leaf"] },
  { clue: "Canada Day month", answer: "july", accepted: ["july"] },
  { clue: "Canada's national winter sport", answer: "hockey", accepted: ["hockey", "ice hockey"] },
  { clue: "Famous fries, cheese curds, and gravy dish", answer: "poutine", accepted: ["poutine"] },
  { clue: "Canada's one-dollar coin", answer: "loonie", accepted: ["loonie"] },
  { clue: "Canada's two-dollar coin", answer: "toonie", accepted: ["toonie", "twoonie"] },
  { clue: "Famous waterfall in Ontario", answer: "Niagara", accepted: ["niagara", "niagara falls"] },
  { clue: "Animal known for building dams", answer: "beaver", accepted: ["beaver"] },
  { clue: "Canada has English and French, so it is ____", answer: "bilingual", accepted: ["bilingual"] },
  { clue: "Canada's national summer sport", answer: "lacrosse", accepted: ["lacrosse"] },
  { clue: "Canada's largest city", answer: "Toronto", accepted: ["toronto"] },
  { clue: "Province where Montreal is located", answer: "Quebec", accepted: ["quebec", "québec"] },
  { clue: "Canadian police known by the red serge uniform", answer: "RCMP", accepted: ["rcmp", "mounties", "mounted police", "royal canadian mounted police"] },
  { clue: "Canada's national anthem", answer: "O Canada", accepted: ["o canada", "ocanada"] },
  { clue: "Canadian territory known for Arctic landscapes", answer: "Nunavut", accepted: ["nunavut"] },
  { clue: "Mountain range in western Canada", answer: "Rockies", accepted: ["rockies", "rocky mountains", "canadian rockies"] },
  { clue: "Canadian province famous for red sand beaches", answer: "PEI", accepted: ["pei", "prince edward island"] },
  { clue: "Animal featured on Canada's nickel", answer: "beaver", accepted: ["beaver"] },
  { clue: "Canada celebrates Canada Day on July ____", answer: "1", accepted: ["1", "first", "july 1", "july first"] }
];

let playerName = "";
let gameQuestions = [];
let currentIndex = 0;
let score = 0;
let correct = 0;
let timeLeft = TOTAL_TIME;
let timer = null;
let startedAt = null;
let leaderboard = [];
let submittedThisGame = false;

const $ = (id) => document.getElementById(id);
const screens = ["welcomeScreen", "nameScreen", "gameScreen", "gameOverScreen", "leaderboardScreen"];

function showScreen(id) {
  screens.forEach(s => $(s).classList.toggle("active", s === id));
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function setConnectionStatus(text) {
  const el = $("connectionStatus");
  if (el) el.textContent = text;
}

function startGame() {
  gameQuestions = shuffle(allQuestions).slice(0, QUESTIONS_PER_GAME);
  currentIndex = 0;
  score = 0;
  correct = 0;
  timeLeft = TOTAL_TIME;
  submittedThisGame = false;
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
  if (currentIndex >= gameQuestions.length) return finishGame();
  $("questionCount").textContent = `${currentIndex + 1} / ${gameQuestions.length}`;
  $("clueText").textContent = gameQuestions[currentIndex].clue;
  $("answerInput").value = "";
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  setTimeout(() => $("answerInput").focus(), 50);
}

function isCorrectAnswer(userAnswer, question) {
  const normalizedUser = normalize(userAnswer);
  return question.accepted.some(ans => normalize(ans) === normalizedUser);
}

function submitAnswer() {
  if (currentIndex >= gameQuestions.length) return;
  const question = gameQuestions[currentIndex];
  const userAnswer = $("answerInput").value;
  if (!normalize(userAnswer)) return;

  if (isCorrectAnswer(userAnswer, question)) {
    correct++;
    score += 10;
    $("feedback").textContent = "Correct!";
    $("feedback").className = "feedback good";
  } else {
    $("feedback").textContent = `Answer: ${question.answer}`;
    $("feedback").className = "feedback bad";
  }

  $("scoreDisplay").textContent = score;
  currentIndex++;
  setTimeout(loadQuestion, 450);
}

function skipQuestion() {
  if (currentIndex >= gameQuestions.length) return;
  currentIndex++;
  loadQuestion();
}

function finishGame() {
  if (submittedThisGame) return;
  submittedThisGame = true;
  clearInterval(timer);

  const timeUsed = Math.min(TOTAL_TIME, Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
  const timeRemaining = Math.max(0, TOTAL_TIME - timeUsed);
  const perfectBonus = correct === gameQuestions.length ? 20 : 0;
  const timeBonus = correct > 0 ? timeRemaining : 0;
  score += perfectBonus + timeBonus;

  const entry = {
    name: playerName,
    score,
    correct,
    total: gameQuestions.length,
    timeUsed,
    timeRemaining,
    perfectBonus,
    createdAt: Date.now()
  };

  $("finalName").textContent = playerName;
  $("finalScore").textContent = score;
  $("finalCorrect").textContent = correct;
  $("finalTotal").textContent = gameQuestions.length;
  $("finalTime").textContent = `${timeUsed}s`;
  $("finalBonus").textContent = `${timeBonus + perfectBonus}`;

  saveScore(entry);
  showScreen("gameOverScreen");
}

async function saveScore(entry) {
  if (firebaseReady) {
    try {
      const { collection, addDoc, serverTimestamp } = firebaseFns;
      await addDoc(collection(db, FIREBASE_COLLECTION), {
        ...entry,
        createdAtServer: serverTimestamp()
      });
      return;
    } catch (err) {
      console.warn("Score could not be saved to Firebase. Saving locally.", err);
      setConnectionStatus("Firebase save failed — local mode");
    }
  }

  const saved = JSON.parse(localStorage.getItem(FIREBASE_COLLECTION) || "[]");
  saved.push(entry);
  localStorage.setItem(FIREBASE_COLLECTION, JSON.stringify(saved));
  leaderboard = saved;
  renderLeaderboard();
}

function listenLeaderboard() {
  if (!firebaseReady) return;
  const { collection, query, orderBy, limit, onSnapshot } = firebaseFns;
  const q = query(collection(db, FIREBASE_COLLECTION), orderBy("score", "desc"), orderBy("timeUsed", "asc"), limit(25));

  onSnapshot(q, (snapshot) => {
    leaderboard = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderLeaderboard();
  }, (err) => {
    console.warn("Leaderboard listener failed.", err);
    setConnectionStatus("Leaderboard listener failed — check Firestore rules/index");
    loadLocalLeaderboard();
  });
}

function loadLocalLeaderboard() {
  leaderboard = JSON.parse(localStorage.getItem(FIREBASE_COLLECTION) || "[]");
  renderLeaderboard();
}

function renderLeaderboard() {
  const list = $("leaderboardList");
  const sorted = [...leaderboard]
    .sort((a, b) => b.score - a.score || a.timeUsed - b.timeUsed || b.createdAt - a.createdAt)
    .slice(0, 10);

  if (!sorted.length) {
    list.innerHTML = `<div class="empty">No scores yet.</div>`;
    return;
  }

  list.innerHTML = sorted.map((item, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    const isMe = item.name === playerName && item.score === score && item.timeUsed <= TOTAL_TIME;
    return `<div class="rank-row ${isMe ? "me" : ""}">
      <div class="rank">${medal}</div>
      <div class="rank-name">${escapeHtml(item.name || "Player")}</div>
      <div>${Number(item.score || 0)} pts</div>
      <div>${Number(item.correct || 0)}/${Number(item.total || QUESTIONS_PER_GAME)}</div>
      <div>${Number(item.timeUsed || 0)}s</div>
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
  playerName = name.slice(0, 24);
  $("nameError").textContent = "";
  startGame();
});
$("submitBtn").addEventListener("click", submitAnswer);
$("skipBtn").addEventListener("click", skipQuestion);
$("answerInput").addEventListener("keydown", e => { if (e.key === "Enter") submitAnswer(); });
$("leaderboardBtn").addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboardScreen"); });
$("restartBtn").addEventListener("click", () => showScreen("nameScreen"));
$("playAgainFromBoardBtn").addEventListener("click", () => showScreen("nameScreen"));
$("viewBoardFromWelcomeBtn").addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboardScreen"); });

initFirebase();
loadLocalLeaderboard();
