// ----- BURAYI KENDİ BİLGİLERİNLE DOLDUR -----
const SUPABASE_URL  = "https://pnjifzrvawxeohrtcicn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlmenJ2YXd4ZW9ocnRjaWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODQ1OTksImV4cCI6MjA3NjM2MDU5OX0.BpKVmZFHtha3Inpr-MQ7ssDkpLdlLsuu9xaxPNW_B5A";
// --------------------------------------------
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// UI refs
const authSection = document.getElementById("authSection");
const appMain = document.getElementById("app");
const authedActions = document.getElementById("authedActions");
const authMsg = document.getElementById("authMsg");
const btnSignUp = document.getElementById("btnSignUp");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignOut = document.getElementById("btnSignOut");

const navUpload = document.getElementById("navUpload");
const navQuiz = document.getElementById("navQuiz");
const navReview = document.getElementById("navReview");

const uploadSection = document.getElementById("uploadSection");
const quizSection = document.getElementById("quizSection");
const reviewSection = document.getElementById("reviewSection");

const inputText = document.getElementById("inputText");
const btnGen = document.getElementById("btnGen");
const genInfo = document.getElementById("genInfo");
const quizBox = document.getElementById("quizBox");
const reviewList = document.getElementById("reviewList");

let user = null;
let questions = [];
let quizIndex = 0;

// ---------- Auth ----------
btnSignUp.onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const { error } = await supabase.auth.signUp({ email, password });
  authMsg.textContent = error ? error.message : "Kayıt başarılı. Giriş yapabilirsin.";
};

btnSignIn.onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return authMsg.textContent = error.message;
  user = data.user;
  enterApp();
};

btnSignOut.onclick = async () => {
  await supabase.auth.signOut();
  user = null;
  authSection.style.display = "";
  appMain.style.display = "none";
  authedActions.style.display = "none";
};

// sayfa açılışında eğer oturum varsa içeri al
supabase.auth.getUser().then(({ data }) => {
  if (data?.user) { user = data.user; enterApp(); }
});

function enterApp() {
  authSection.style.display = "none";
  appMain.style.display = "";
  authedActions.style.display = "";
  showSection("upload");
  refreshReview();
}

// ---------- Nav ----------
navUpload.onclick = () => showSection("upload");
navQuiz.onclick = () => showSection("quiz");
navReview.onclick = () => { showSection("review"); refreshReview(); };

function showSection(key) {
  uploadSection.style.display = (key === "upload") ? "" : "none";
  quizSection.style.display = (key === "quiz") ? "" : "none";
  reviewSection.style.display = (key === "review") ? "" : "none";
}

// ---------- Soru üretimi ----------
btnGen.onclick = () => {
  const text = inputText.value;
  if (!text.trim()) { genInfo.textContent = "Metin boş."; return; }
  questions = buildQuestions(text);
  genInfo.textContent = `${questions.length} soru hazır.`; 
  quizIndex = 0;
  buildQuizUI();
  showSection("quiz");
};

function buildQuestions(text) {
  const out = [];
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  for (const line of lines) {
    const i = line.indexOf(":");
    if (i > 0) {
      const left = line.slice(0, i).trim();
      const right = line.slice(i+1).trim();
      if (left && right) {
        out.push({ type: "definition", stem: `${left} nedir?`, answer: right });
        continue;
      }
    }
    const words = line.split(/\s+/);
    if (words.length > 5) {
      const idx = Math.floor(Math.random() * words.length);
      const ans = words[idx];
      words[idx] = "_____";
      out.push({ type: "fill", stem: words.join(" "), answer: ans });
    }
  }

  // her 3. soruyu çoktan seçmeli yap
  out.forEach((q, ix) => {
    if (ix % 3 === 2 && out.length >= 4) {
      const pool = out.map(x => x.answer).filter(a => a !== q.answer);
      const distractors = shuffle(pool).slice(0,3);
      if (distractors.length === 3) {
        q.type = "mc";
        q.choices = shuffle([...distractors, q.answer]);
      }
    }
  });
  return out;
}

// ---------- Quiz ----------
function buildQuizUI() {
  quizBox.innerHTML = "";
  if (quizIndex >= questions.length) {
    quizBox.innerHTML = "<p><strong>Quiz bitti.</strong></p>";
    return;
  }
  const q = questions[quizIndex];
  const wrap = document.createElement("div");
  wrap.innerHTML = `<h4>Soru ${quizIndex+1}</h4><p>${q.stem}</p>`;
  if (q.type === "mc") {
    q.choices.forEach(choice => {
      const lbl = document.createElement("label");
      lbl.style.display = "block";
      const r = document.createElement("input");
      r.type = "radio"; r.name = "ans"; r.value = choice;
      lbl.appendChild(r);
      lbl.appendChild(document.createTextNode(" " + choice));
      wrap.appendChild(lbl);
    });
  } else {
    const inp = document.createElement("input");
    inp.type = "text"; inp.id = "userAnswer"; 
    wrap.appendChild(inp);
  }
  const btn = document.createElement("button");
  btn.textContent = "Cevabı Gönder";
  btn.onclick = submitAnswer;
  wrap.appendChild(btn);
  quizBox.appendChild(wrap);
}

async function submitAnswer() {
  const q = questions[quizIndex];
  let userAns = "";
  if (q.type === "mc") {
    const sel = document.querySelector('input[name="ans"]:checked');
    if (sel) userAns = sel.value.trim();
  } else {
    const inp = document.getElementById("userAnswer");
    if (inp) userAns = inp.value.trim();
  }
  const wrong = userAns.toLowerCase() !== (q.answer||"").toLowerCase();
  if (wrong) await saveWrongCard(q, userAns);
  quizIndex++;
  buildQuizUI();
}

// ---------- DB: wrong_cards ----------
async function saveWrongCard(q, userAnswer) {
  const { data: { user: u } } = await supabase.auth.getUser();
  if (!u) return;

  const next = new Date(Date.now() + 24*60*60*1000); // 1 gün sonra
  const { error } = await supabase.from("wrong_cards").insert({
    user_id: u.id,
    question_stem: q.stem,
    question_type: q.type,
    choices: q.choices || null,
    correct_answer: q.answer,
    user_answer: userAnswer,
    repetitions: 0,
    interval_days: 1,
    ease: 2.5,
    next_review_at: next.toISOString()
  });
  if (error) console.error(error);
}

// Listele
async function refreshReview() {
  const { data: { user: u } } = await supabase.auth.getUser();
  if (!u) return;
  const { data, error } = await supabase
    .from("wrong_cards")
    .select("*")
    .eq("user_id", u.id)
    .order("next_review_at", { ascending: true });
  if (error) return console.error(error);

  reviewList.innerHTML = "";
  if (!data.length) {
    reviewList.innerHTML = "<li>Yanlış kart yok.</li>"; 
    return;
  }
  const now = new Date();
  for (const row of data) {
    const due = new Date(row.next_review_at);
    const dueText = due.toLocaleString("tr-TR");
    const li = document.createElement("li");
    li.innerHTML = `<strong>${row.question_stem}</strong><br>
      Doğru: ${row.correct_answer}<br>
      Senin: ${row.user_answer || "-"}<br>
      Tekrar: ${dueText} ${due <= now ? "<span style='color:#3f83f8'>(Süre doldu)</span>" : ""}`;
    reviewList.appendChild(li);
  }
}

// helpers
function shuffle(arr) {
  const a = [...arr];
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j]]=[a[i],a[j]] }
  return a;
  }
