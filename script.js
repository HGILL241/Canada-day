// Canada Day MCQ Challenge — GitHub Pages + Firebase Firestore ready
// Features: MCQ format, random question order, shuffled options, live Firebase leaderboard, local fallback.

import { USE_FIREBASE, firebaseConfig } from "./firebase-config.js";

const TOTAL_TIME = 90;
const QUESTIONS_PER_GAME = 10;
const FIREBASE_COLLECTION = "canadaDayLeaderboard";

let db = null;
let firebaseReady = false;
let firebaseFns = {};
let unsubscribeLeaderboard = null;

async function initFirebase() {
  if (!USE_FIREBASE) {
    setConnectionStatus("Local leaderboard mode — Firebase is OFF");
    loadLocalLeaderboard();
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
    setConnectionStatus("✅ Live leaderboard connected");
    listenLeaderboard();
  } catch (err) {
    console.error("Firebase not connected. Using local leaderboard only.", err);
    setConnectionStatus("❌ Firebase not connected — check config/rules");
    loadLocalLeaderboard();
  }
}

const allQuestions = [
  { question: "What is Canada's capital city?", options: ["Toronto", "Ottawa", "Vancouver", "Montreal"], answer: "Ottawa" },
  { question: "Which leaf is on Canada's flag?", options: ["Oak", "Maple", "Pine", "Birch"], answer: "Maple" },
  { question: "Canada Day is celebrated in which month?", options: ["June", "July", "August", "September"], answer: "July" },
  { question: "What is Canada's national winter sport?", options: ["Hockey", "Curling", "Skiing", "Basketball"], answer: "Hockey" },
  { question: "Which Canadian dish has fries, cheese curds, and gravy?", options: ["Butter tart", "Poutine", "Nanaimo bar", "Tourtière"], answer: "Poutine" },
  { question: "What is Canada's one-dollar coin called?", options: ["Toonie", "Loonie", "Nickel", "Quarter"], answer: "Loonie" },
  { question: "What is Canada's two-dollar coin called?", options: ["Loonie", "Toonie", "Dime", "Penny"], answer: "Toonie" },
  { question: "Which famous waterfall is in Ontario?", options: ["Athabasca Falls", "Niagara Falls", "Helmcken Falls", "Takakkaw Falls"], answer: "Niagara Falls" },
  { question: "Which animal is known for building dams?", options: ["Moose", "Beaver", "Polar bear", "Goose"], answer: "Beaver" },
  { question: "Canada has English and French as official languages, so it is…", options: ["Bilingual", "Tropical", "Monolingual", "Island-based"], answer: "Bilingual" },
  { question: "What is Canada's national summer sport?", options: ["Soccer", "Lacrosse", "Baseball", "Volleyball"], answer: "Lacrosse" },
  { question: "What is Canada's largest city by population?", options: ["Calgary", "Toronto", "Ottawa", "Quebec City"], answer: "Toronto" },
  { question: "Montreal is located in which province?", options: ["Ontario", "Quebec", "Manitoba", "Alberta"], answer: "Quebec" },
  { question: "Which Canadian police force is known for the red serge uniform?", options: ["RCMP", "OPP", "TPS", "VPD"], answer: "RCMP" },
  { question: "What is Canada's national anthem called?", options: ["The Maple Song", "O Canada", "True North", "God Save Canada"], answer: "O Canada" },
  { question: "Which territory is known for Arctic landscapes?", options: ["Nunavut", "Prince Edward Island", "Nova Scotia", "Saskatchewan"], answer: "Nunavut" },
  { question: "Which mountain range is in western Canada?", options: ["Appalachians", "Rockies", "Andes", "Alps"], answer: "Rockies" },
  { question: "Which province is famous for red sand beaches?", options: ["PEI", "Ontario", "British Columbia", "Newfoundland and Labrador"], answer: "PEI" },
  { question: "Which animal appears on Canada's nickel?", options: ["Beaver", "Moose", "Loon", "Bear"], answer: "Beaver" },
  { question: "Canada Day is celebrated on July…", options: ["1", "4", "15", "31"], answer: "1" },
  { question: "How many provinces does Canada have?", options: ["8", "10", "12", "13"], answer: "10" },
  { question: "How many territories does Canada have?", options: ["2", "3", "4", "5"], answer: "3" },
  { question: "Which ocean is on Canada's east coast?", options: ["Pacific", "Atlantic", "Indian", "Arctic only"], answer: "Atlantic" },
  { question: "Which city is the capital of Alberta?", options: ["Calgary", "Edmonton", "Banff", "Red Deer"], answer: "Edmonton" }
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
let answerLocked = false;

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

function prepareQuestions() {
  return shuffle(allQuestions)
    .slice(0, QUESTIONS_PER_GAME)
    .map(q => ({ ...q, options: shuffle(q.options) }));
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
  gameQuestions = prepareQuestions();
  currentIndex = 0;
  score = 0;
  correct = 0;
  timeLeft = TOTAL_TIME;
  submittedThisGame = false;
  answerLocked = false;
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
  answerLocked = false;
  const q = gameQuestions[currentIndex];
  $("questionCount").textContent = `${currentIndex + 1} / ${gameQuestions.length}`;
  $("questionText").textContent = q.question;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("optionsList").innerHTML = q.options.map(option => `
    <button class="option-btn" data-answer="${escapeHtml(option)}">${escapeHtml(option)}</button>
  `).join("");

  document.querySelectorAll(".option-btn").forEach(btn => {
    btn.addEventListener("click", () => selectAnswer(btn.dataset.answer, btn));
  });
}

function selectAnswer(selectedAnswer, selectedButton) {
  if (answerLocked || currentIndex >= gameQuestions.length) return;
  answerLocked = true;
  const q = gameQuestions[currentIndex];
  const isCorrect = selectedAnswer === q.answer;

  document.querySelectorAll(".option-btn").forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.answer === q.answer) btn.classList.add("correct");
  });

  if (isCorrect) {
    correct++;
    score += 10;
    selectedButton.classList.add("correct");
    $("feedback").textContent = "Correct!";
    $("feedback").className = "feedback good";
  } else {
    selectedButton.classList.add("wrong");
    $("feedback").textContent = `Correct answer: ${q.answer}`;
    $("feedback").className = "feedback bad";
  }

  $("scoreDisplay").textContent = score;
  currentIndex++;
  setTimeout(loadQuestion, 650);
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
      setConnectionStatus("✅ Score saved live");
      return;
    } catch (err) {
      console.error("Score could not be saved to Firebase. Saving locally.", err);
      setConnectionStatus("❌ Firebase save failed — check Firestore rules");
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

  // IMPORTANT: only one orderBy to avoid Firebase composite-index errors on GitHub Pages.
  const q = query(collection(db, FIREBASE_COLLECTION), orderBy("score", "desc"), limit(50));

  if (unsubscribeLeaderboard) unsubscribeLeaderboard();
  unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
    leaderboard = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setConnectionStatus("✅ Live leaderboard connected");
    renderLeaderboard();
  }, (err) => {
    console.error("Leaderboard listener failed.", err);
    setConnectionStatus("❌ Live leaderboard failed — check Firestore rules");
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
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || Number(a.timeUsed || 999) - Number(b.timeUsed || 999) || Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 10);

  if (!sorted.length) {
    list.innerHTML = `<div class="empty">No scores yet.</div>`;
    return;
  }

  list.innerHTML = sorted.map((item, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    const isMe = item.name === playerName && Number(item.score || 0) === score && Number(item.timeUsed || 0) <= TOTAL_TIME;
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
$("playerName").addEventListener("keydown", e => { if (e.key === "Enter") $("playBtn").click(); });
$("leaderboardBtn").addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboardScreen"); });
$("restartBtn").addEventListener("click", () => showScreen("nameScreen"));
$("playAgainFromBoardBtn").addEventListener("click", () => showScreen("nameScreen"));
$("viewBoardFromWelcomeBtn").addEventListener("click", () => { renderLeaderboard(); showScreen("leaderboardScreen"); });

initFirebase();
