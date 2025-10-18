// basit yerel giriş (geçici)
const auth = document.getElementById("auth");
const app = document.getElementById("app");
const navBtns = document.getElementById("navBtns");
document.getElementById("btnLocalLogin").onclick = () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  if (!u || !p) return alert("Kullanıcı adı ve şifre gir.");
  // sadece oturum açtığımızı varsayalım
  auth.style.display = "none";
  app.style.display = "";
  navBtns.style.display = "";
  show("upload");
  renderReview();
};

// sekmeler
const uploadSec = document.getElementById("upload");
const quizSec = document.getElementById("quiz");
const reviewSec = document.getElementById("review");
document.getElementById("btnUpload").onclick = () => show("upload");
document.getElementById("btnQuiz").onclick = () => show("quiz");
document.getElementById("btnReview").onclick = () => { show("review"); renderReview(); };

function show(which){
  uploadSec.style.display = (which==="upload") ? "" : "none";
  quizSec.style.display   = (which==="quiz")   ? "" : "none";
  reviewSec.style.display = (which==="review") ? "" : "none";
}

// soru üretimi
const inputText = document.getElementById("inputText");
const btnGen = document.getElementById("btnGen");
const genInfo = document.getElementById("genInfo");
const quizBox = document.getElementById("quizBox");
const reviewList = document.getElementById("reviewList");

let questions = [];
let quizIndex = 0;

btnGen.onclick = () => {
  const text = inputText.value;
  if(!text.trim()) return alert("Metin boş");
  questions = buildQuestions(text);
  genInfo.textContent = `${questions.length} soru hazır.`;
  quizIndex = 0;
  buildQuiz();
  show("quiz");
};

function buildQuestions(text){
  const out = [];
  const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for(const line of lines){
    const i = line.indexOf(":");
    if(i>0){
      const left = line.slice(0,i).trim();
      const right = line.slice(i+1).trim();
      if(left && right){
        out.push({ type:"definition", stem:`${left} nedir?`, answer:right });
        continue;
      }
    }
    const words = line.split(/\s+/);
    if(words.length>5){
      const idx = Math.floor(Math.random()*words.length);
      const ans = words[idx];
      words[idx] = "_____";
      out.push({ type:"fill", stem: words.join(" "), answer: ans });
    }
  }
  // her 3. soruyu MC yap
  out.forEach((q,ix)=>{
    if(ix%3===2 && out.length>=4){
      const pool = out.map(x=>x.answer).filter(a=>a!==q.answer);
      const distractors = shuffle(pool).slice(0,3);
      if(distractors.length===3){
        q.type="mc"; q.choices = shuffle([...distractors, q.answer]);
      }
    }
  });
  return out;
}

function buildQuiz(){
  quizBox.innerHTML = "";
  if(quizIndex>=questions.length){
    quizBox.innerHTML = "<p><strong>Quiz bitti.</strong></p>";
    return;
  }
  const q = questions[quizIndex];
  const wrap = document.createElement("div");
  wrap.innerHTML = `<h4>Soru ${quizIndex+1}</h4><p>${q.stem}</p>`;
  if(q.type==="mc"){
    q.choices.forEach(choice=>{
      const lbl = document.createElement("label");
      lbl.style.display="block";
      const r = document.createElement("input");
      r.type="radio"; r.name="ans"; r.value=choice;
      lbl.appendChild(r); lbl.appendChild(document.createTextNode(" "+choice));
      wrap.appendChild(lbl);
    });
  }else{
    const inp = document.createElement("input");
    inp.type="text"; inp.id="userAnswer";
    wrap.appendChild(inp);
  }
  const btn = document.createElement("button");
  btn.textContent="Cevabı Gönder";
  btn.onclick=submitAnswer;
  wrap.appendChild(btn);
  quizBox.appendChild(wrap);
}

function submitAnswer(){
  const q = questions[quizIndex];
  let userAns = "";
  if(q.type==="mc"){
    const sel = document.querySelector('input[name="ans"]:checked');
    if(sel) userAns = sel.value.trim();
  }else{
    const inp = document.getElementById("userAnswer");
    if(inp) userAns = inp.value.trim();
  }
  const wrong = userAns.toLowerCase() !== (q.answer||"").toLowerCase();
  if(wrong) saveWrong(q, userAns);
  quizIndex++; buildQuiz();
}

// yanlışları localStorage’a yaz (geçici)
function saveWrong(q, userAnswer){
  const now = Date.now();
  const card = {
    stem: q.stem,
    answer: q.answer,
    type: q.type,
    choices: q.choices||[],
    userAnswer,
    nextReview: now + 24*60*60*1000 // 1 gün sonra
  };
  const arr = JSON.parse(localStorage.getItem("mq_wrong")||"[]");
  arr.push(card);
  localStorage.setItem("mq_wrong", JSON.stringify(arr));
}

function renderReview(){
  const arr = JSON.parse(localStorage.getItem("mq_wrong")||"[]");
  reviewList.innerHTML="";
  if(!arr.length){ reviewList.innerHTML="<li>Yanlış kart yok.</li>"; return; }
  arr.sort((a,b)=>a.nextReview-b.nextReview);
  const now = Date.now();
  for(const row of arr){
    const due = new Date(row.nextReview).toLocaleString("tr-TR");
    const li = document.createElement("li");
    li.innerHTML = `<strong>${row.stem}</strong><br>Doğru: ${row.answer}<br>Senin: ${row.userAnswer||"-"}<br>Tekrar: ${due} ${row.nextReview<=now? "<span style='color:#3f83f8'>(Süre doldu)</span>":""}`;
    reviewList.appendChild(li);
  }
}

// helpers
function shuffle(a){ const arr=[...a]; for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]} return arr; }
