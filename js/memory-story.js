/* 경로: js/memory-story.js */

/**
 * memory-story.html 전용 로직입니다. 크게 두 부분으로 나뉩니다.
 * 1) Memory Finder : STEP 1~3 질문에 답하면 PERFUMES 데이터 중
 *    가장 어울리는 향 하나를 계산해 보여줍니다.
 * 2) Share Your Memory : 방문자가 남긴 기억을 localStorage에 저장하고,
 *    제출 직후에는 완료 안내 모달을 띄우는 프론트엔드 데모입니다
 *    (실제 서버 전송 없음. 저장된 기억은 Archive 페이지에서 모아볼 수 있습니다).
 */
document.addEventListener("DOMContentLoaded", () => {
  initMemoryFinder();
  initShareMemoryForm();
});

/* ==========================================================================
   1. MEMORY FINDER
   ========================================================================== */

/**
 * 각 스텝의 질문/선택지 정의입니다.
 * - tags : PERFUMES의 memoryTags(순간/감정) 또는 scentTags(향)와 매칭되는 값들.
 *   하나의 선택지가 여러 태그를 가질 수 있어(예: "소중한 사람과 함께한 하루" →
 *   가족 + 설렘), 조금 더 폭넓게 어울리는 향을 찾을 수 있습니다.
 * - matchField : 이 스텝의 태그가 PERFUMES의 어떤 필드와 비교되는지 표시합니다.
 */
const FINDER_STEPS = [
  {
    id: "moment",
    question: "가장 오래 기억하고 싶은 순간은 언제인가요?",
    matchField: "memoryTags",
    weight: 1,
    options: [
      { emoji: "🌅", label: "햇살이 비치던 아침", tags: ["따뜻한 햇살"] },
      { emoji: "🌧", label: "비가 내리던 오후", tags: ["비 오는 날"] },
      { emoji: "🌊", label: "바다를 바라보던 순간", tags: ["바다"] },
      { emoji: "🚆", label: "낯선 곳으로 떠난 여행", tags: ["여행"] },
      { emoji: "📖", label: "조용히 책을 읽던 시간", tags: ["혼자만의 시간"] },
      { emoji: "💌", label: "소중한 사람과 함께한 하루", tags: ["가족", "설렘"] },
      { emoji: "🍂", label: "문득 떠오른 오래된 추억", tags: ["어린 시절", "첫 기억"] },
    ],
  },
  {
    id: "emotion",
    question: "그때의 감정은 어땠나요?",
    matchField: "memoryTags",
    weight: 1,
    options: [
      { label: "편안했어요", tags: ["혼자만의 시간", "숲"] },
      { label: "설렜어요", tags: ["설렘", "첫사랑", "고백"] },
      { label: "행복했어요", tags: ["가족", "따뜻한 햇살"] },
      { label: "그리웠어요", tags: ["그리움", "이별", "짝사랑"] },
      { label: "자유로웠어요", tags: ["여행", "도전", "변화"] },
      { label: "기대됐어요", tags: ["희망", "목표", "새로운 시작"] },
      { label: "위로받았어요", tags: ["숲", "비 오는 날"] },
    ],
  },
  {
    id: "scent",
    question: "어떤 향을 좋아하시나요?",
    matchField: "scentTags",
    weight: 1.5, // 향 취향은 더 직접적인 신호라 가중치를 조금 더 둡니다
    options: [
      { emoji: "🍋", label: "상큼한 향", tags: ["Bergamot"] },
      { emoji: "🌹", label: "꽃향기", tags: ["Rose", "Fig"] },
      { emoji: "🌿", label: "숲 향기", tags: ["Cedarwood", "Green Tea"] },
      { emoji: "🌧", label: "비 오는 날 같은 향", tags: ["Rain Accord"] },
      { emoji: "🪵", label: "우디한 향", tags: ["Sandalwood"] },
      { emoji: "☁️", label: "포근한 향", tags: ["Vanilla", "Amber"] },
      { emoji: "🌊", label: "깨끗한 향", tags: ["Musk"] },
    ],
  },
];

function initMemoryFinder() {
  const progressEl = document.getElementById("finderProgress");
  const questionEl = document.getElementById("finderQuestion");
  const optionsEl = document.getElementById("finderOptions");
  const backBtn = document.getElementById("finderBack");
  const nextBtn = document.getElementById("finderNext");
  const quizPanel = document.getElementById("finderQuiz");
  const resultPanel = document.getElementById("finderResult");
  if (!optionsEl) return;

  // 현재 스텝 인덱스와, 스텝별로 선택된 옵션을 기억해두는 상태값
  let currentStep = 0;
  const selectedOptions = {}; // { moment: option, emotion: option, scent: option }

  /* ---------- 진행 상태(1-2-3) 표시 갱신 ---------- */
  function renderProgress() {
    progressEl.querySelectorAll(".finder-progress__step").forEach((stepEl) => {
      const stepIndex = Number(stepEl.dataset.step);
      stepEl.classList.toggle("is-active", stepIndex === currentStep);
      stepEl.classList.toggle("is-done", stepIndex < currentStep);
    });
  }

  /* ---------- 현재 스텝의 질문 + 선택지 렌더링 ---------- */
  function renderStep() {
    const step = FINDER_STEPS[currentStep];
    questionEl.textContent = step.question;

    const savedChoice = selectedOptions[step.id];

    optionsEl.innerHTML = step.options
      .map((option, index) => {
        const isSelected = savedChoice && savedChoice.label === option.label;
        return `
          <button
            type="button"
            class="finder-option"
            data-index="${index}"
            aria-pressed="${isSelected}"
          >
            ${option.emoji ? `<span class="finder-option__emoji" aria-hidden="true">${option.emoji}</span>` : ""}
            <span>${option.label}</span>
          </button>
        `;
      })
      .join("");

    backBtn.disabled = currentStep === 0;
    nextBtn.textContent = currentStep === FINDER_STEPS.length - 1 ? "결과 보기" : "Next";
    nextBtn.disabled = !savedChoice;

    renderProgress();
  }

  /* ---------- 선택지 클릭 : 같은 스텝 안에서 단일 선택 ---------- */
  optionsEl.addEventListener("click", (event) => {
    const optionBtn = event.target.closest(".finder-option");
    if (!optionBtn) return;

    const step = FINDER_STEPS[currentStep];
    const chosen = step.options[Number(optionBtn.dataset.index)];
    selectedOptions[step.id] = chosen;

    optionsEl.querySelectorAll(".finder-option").forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    optionBtn.setAttribute("aria-pressed", "true");

    nextBtn.disabled = false;
  });

  /* ---------- Back 버튼 ---------- */
  backBtn.addEventListener("click", () => {
    if (currentStep === 0) return;
    currentStep -= 1;
    renderStep();
  });

  /* ---------- Next 버튼 : 마지막 스텝이면 결과를 계산해 보여줍니다 ---------- */
  nextBtn.addEventListener("click", () => {
    if (currentStep < FINDER_STEPS.length - 1) {
      currentStep += 1;
      renderStep();
      return;
    }

    if (!window.requireLogin("Memory Finder 결과는<br />로그인 후 확인하실 수 있습니다.")) return;

    showResult(selectedOptions);
  });

  /* ---------- 결과 화면에서 "다시 질문에 답하기" ---------- */
  document.getElementById("finderRetry").addEventListener("click", () => {
    currentStep = 0;
    Object.keys(selectedOptions).forEach((key) => delete selectedOptions[key]);

    resultPanel.hidden = true;
    quizPanel.hidden = false;
    document.getElementById("finderResultPerfume").classList.remove("is-revealed");

    renderStep();
  });

  /* ---------- 결과 계산 + 렌더링 ---------- */
  function showResult(answers) {
    const perfume = computeRecommendedPerfume(answers);

    document.getElementById("resultImage").src = perfume.image;
    document.getElementById("resultImage").alt = `${perfume.name} 향수 이미지`;
    document.getElementById("resultName").textContent = perfume.name;
    document.getElementById("resultTagline").textContent = `“${perfume.tagline}”`;
    document.getElementById("resultDesc").textContent = perfume.description;

    const notesEl = document.getElementById("resultNotes");
    notesEl.innerHTML = [
      { label: "Top", items: perfume.notes.top },
      { label: "Middle", items: perfume.notes.middle },
      { label: "Base", items: perfume.notes.base },
    ]
      .map((group) => `<div><dt>${group.label}</dt><dd>${group.items.join(", ")}</dd></div>`)
      .join("");

    document.getElementById("resultViewCollection").href = `collection.html?collection=${perfume.collectionId}`;

    setupResultActionButtons(perfume);

    quizPanel.hidden = true;
    resultPanel.hidden = false;

    // 다음 프레임에서 클래스를 붙여야 opacity/transform 트랜지션이 재생됩니다.
    const perfumeCard = document.getElementById("finderResultPerfume");
    perfumeCard.classList.remove("is-revealed");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => perfumeCard.classList.add("is-revealed"));
    });

    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Add Wishlist / 장바구니 담기 버튼 ---------- */
  function setupResultActionButtons(perfume) {
    const wishBtn = document.getElementById("resultWishBtn");
    const cartBtn = document.getElementById("resultAddCartBtn");

    // 매번 새 결과가 나올 때마다 이전 결과에 연결됐던 리스너가 중첩되지 않도록,
    // 두 버튼 모두 노드를 복제해 이벤트 리스너를 깨끗하게 초기화합니다.
    const freshWishBtn = wishBtn.cloneNode(true);
    wishBtn.replaceWith(freshWishBtn);

    const freshCartBtn = cartBtn.cloneNode(true);
    cartBtn.replaceWith(freshCartBtn);

    function updateWishButton() {
      const wished = Store.isInWishlist(perfume.id);
      freshWishBtn.setAttribute("aria-pressed", String(wished));
      freshWishBtn.querySelector("#resultWishIcon").textContent = wished ? "♥" : "♡";
      freshWishBtn.querySelector("#resultWishLabel").textContent = wished ? "찜 완료" : "Add Wishlist";
    }
    updateWishButton();

    freshWishBtn.addEventListener("click", () => {
      const wished = Store.toggleWishlist(perfume.id);
      Store.showToast(wished ? "찜 목록에 추가했어요" : "찜 목록에서 제거했어요");
      updateWishButton();
    });

    freshCartBtn.addEventListener("click", () => {
      Store.addToCart(perfume.id, 1);
      Store.showToast("장바구니에 담았어요");
    });
  }

  renderStep();
}

/**
 * STEP 1~3에서 선택한 태그들을 PERFUMES 각 항목과 비교해 점수를 매기고,
 * 가장 점수가 높은 향수를 반환합니다.
 * - moment/emotion 선택지의 태그는 memoryTags와, scent 선택지의 태그는
 *   scentTags와 비교합니다.
 * - 점수가 같으면 평점(rating)이 더 높은 쪽을 우선합니다.
 */
function computeRecommendedPerfume(answers) {
  let best = PERFUMES[0];
  let bestScore = -Infinity;

  PERFUMES.forEach((perfume) => {
    let score = 0;

    FINDER_STEPS.forEach((step) => {
      const chosen = answers[step.id];
      if (!chosen) return;

      const targetTags = perfume[step.matchField] || [];
      const matchCount = chosen.tags.filter((tag) => targetTags.includes(tag)).length;
      score += matchCount * step.weight;
    });

    if (score > bestScore || (score === bestScore && perfume.rating > best.rating)) {
      bestScore = score;
      best = perfume;
    }
  });

  return best;
}

/* ==========================================================================
   2. SHARE YOUR MEMORY (localStorage 데모)
   -------------------------------------------------------------------------
   - 실제 서버 전송 없이, 방문자가 남긴 기억을 브라우저에만 저장합니다.
   - 저장/조회는 store.js의 Store.addSharedStory() 등으로 위임합니다.
     (마이페이지의 "공유한 기억" 탭, Archive의 Shared Memories가 모두
      Store를 통해 같은 저장소를 읽고 쓰기 때문에, 여기서 저장한 기억은
      두 화면에 곧바로 함께 반영됩니다)
   - 제출한 기억은 이 페이지에 목록으로 계속 쌓아 보여주지 않고, 완료 안내
     모달만 띄웁니다.
   ========================================================================== */
function initShareMemoryForm() {
  const form = document.getElementById("shareForm");
  const emotionGroup = document.getElementById("shareEmotions");
  const errorEl = document.getElementById("shareFormError");
  if (!form) return;

  let selectedEmotion = null;

  /* ---------- 감정 칩 : 단일 선택 ---------- */
  emotionGroup.addEventListener("click", (event) => {
    const chip = event.target.closest(".emotion-chip");
    if (!chip) return;

    emotionGroup.querySelectorAll(".emotion-chip").forEach((el) => el.setAttribute("aria-pressed", "false"));
    chip.setAttribute("aria-pressed", "true");
    selectedEmotion = chip.dataset.emotion;
  });

  /* ---------- 완료 안내 모달 ---------- */
  const modal = document.getElementById("shareModal");
  const modalCloseBtn = document.getElementById("shareModalClose");

  function openShareModal() {
    modal.hidden = false;
    // hidden을 지운 다음 프레임에서 클래스를 붙여야 opacity/transform 트랜지션이 재생됩니다.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add("is-open"));
    });
  }

  function closeShareModal() {
    modal.classList.remove("is-open");
    // 트랜지션이 끝난 뒤 hidden을 다시 붙여 스크린 리더/탭 포커스에서 제외합니다.
    setTimeout(() => {
      modal.hidden = true;
    }, 200);
  }

  modalCloseBtn.addEventListener("click", closeShareModal);

  // 모달 바깥(어두운 배경) 클릭 시 닫기
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeShareModal();
  });

  // Esc 키로 닫기
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeShareModal();
  });

  /* ---------- 폼 제출 ---------- */
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = document.getElementById("storyTitle").value.trim();
    const content = document.getElementById("storyContent").value.trim();

    if (!title || !content || !selectedEmotion) {
      errorEl.textContent = "제목, 내용, 감정을 모두 선택해 주세요.";
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;

    // 실제 서버 대신 Store를 통해 localStorage에 저장합니다. 로그인한 사용자의
    // 이메일이 함께 저장되어, 마이페이지의 "공유한 기억" 탭에서 본인 글만
    // 걸러 보여주고 수정/삭제할 수 있습니다.
    Store.addSharedStory({ title, content, emotion: selectedEmotion });

    form.reset();
    emotionGroup.querySelectorAll(".emotion-chip").forEach((el) => el.setAttribute("aria-pressed", "false"));
    selectedEmotion = null;

    openShareModal();
  });
}
