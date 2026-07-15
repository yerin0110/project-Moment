/* 경로: js/main.js */

/**
 * 전역 스코프 오염을 막기 위해 DOMContentLoaded 안에서만 코드를 실행합니다.
 * 각 기능은 독립된 함수로 분리해 "무엇을 하는 코드인지" 이름만으로 알 수 있게 합니다.
 */
document.addEventListener("DOMContentLoaded", () => {
  initHomeCollectionCards();
  initIntroSequence();
  initHeaderScrollState();
  initAuthToggle();
  initAuthRequiredModal();
  initLoginGateLinks();
  initMemoryPreview();
  initNewsletterForm();
  initMobileMenu();
});

/* ==========================================================================
   0. HOME Collection 카드 렌더링 (perfumes-data.js 기반)
   -------------------------------------------------------------------------
   - 예전에는 이 자리에 향수 카드 4개(Healing/Love/New Beginning/Nostalgia)가
     HTML에 직접 하드코딩되어 있었습니다.
   - 이제는 js/data/perfumes-data.js 의 COLLECTIONS 배열(컬렉션 "인트로" 정보:
     name / tagline / meaning / memoryTags / image)을 그대로 읽어와 카드를 그려줍니다.
   - 장점 : 컬렉션 소개 문구나 태그가 바뀌어도 index.html은 건드릴 필요 없이
     perfumes-data.js 안의 COLLECTIONS 객체만 수정하면 됩니다.
   ========================================================================== */
function initHomeCollectionCards() {
  const grid = document.getElementById("perfumeGrid");

  // COLLECTIONS는 perfumes-data.js가 만들어주는 전역 상수입니다.
  // 혹시 스크립트 로드 순서가 꼬여 COLLECTIONS가 없다면 조용히 종료합니다.
  if (!grid || typeof COLLECTIONS === "undefined") return;

  // 배열 각 항목을 카드 HTML 문자열로 변환한 뒤 한 번에 그리드에 삽입합니다.
  // (반복마다 DOM을 직접 건드리지 않고 문자열을 모아 한 번만 innerHTML에 대입 → 성능상 유리)
  const cardsHTML = COLLECTIONS.map((collection) => {
    // memoryTags(예: ["숲", "바다", ...]) 배열을 <li> 칩 목록으로 변환
    const tagsHTML = collection.memoryTags
      .map((tag) => `<li>${tag}</li>`)
      .join("");

    return `
      <li class="perfume-card" style="background-image: url('${collection.image}')">
        <a class="perfume-card__link" href="collection.html?collection=${collection.id}">
          <div class="perfume-card__notes">
            <span class="perfume-card__eyebrow">${collection.tagline}</span>
            <span class="perfume-card__name">${collection.name}</span>
            <p class="perfume-card__desc">${collection.meaning}</p>
            <ul class="perfume-card__tags">${tagsHTML}</ul>
          </div>
        </a>
      </li>
    `;
  }).join("");

  grid.innerHTML = cardsHTML;
}

/* ==========================================================================
   1. 인트로 텍스트 시퀀스
   -------------------------------------------------------------------------
   - .intro__line 요소들을 순서대로 보여주고(is-active) 숨깁니다.
   - 마지막 문구까지 끝나면 .intro 에 is-done 클래스를 붙여 사라지게 하고,
     아래에 깔려 있던 영상 히어로가 자연스럽게 드러나도록 합니다.
   ========================================================================== */
function initIntroSequence() {
  const intro = document.getElementById("intro");
  const heroVideo = document.getElementById("heroVideo");
  const heroCaption = document.getElementById("heroCaption");
  const header = document.getElementById("siteHeader");
  if (!intro) return;

  const STORAGE_KEY = "moment_intro_seen";

  // 인트로 문구가 떠 있는 동안, 헤더도 미리 숨겨둡니다.
  // 헤더는 어차피 인트로 오버레이(z-index 200) 아래 깔려 화면엔 안 보이던 상태라
  // 화면 깜빡임 없이 바로 적용됩니다.
  if (header) header.classList.add("header--pre-reveal");

  function playHeroVideo() {
    if (!heroVideo) return;
    heroVideo.currentTime = 0;
    heroVideo.play().catch(() => {
      /* 브라우저 자동재생 정책으로 재생이 막힐 경우 조용히 무시 */
    });
  }

  // 인트로에 있던 "오늘의 기억은, 내일의 향기가 됩니다." 문구가 이제 이 자리로 옮겨왔습니다.
  // 영상이 재생을 시작하는 시점(=인트로가 끝나는 시점)에 맞춰 페이드인 시킵니다.
  function showHeroCaption() {
    if (!heroCaption) return;
    heroCaption.classList.add("is-visible");
  }

  // 영상·캡션과 같은 타이밍에 헤더도 위에서 살짝 내려오며 페이드인되도록 함
  function showHeader() {
    if (!header) return;
    header.classList.remove("header--pre-reveal");
  }

  // 같은 브라우저 탭(세션) 안에서 이미 인트로를 본 적이 있다면
  // 문구 애니메이션 없이 즉시 건너뛰고 영상+메뉴 화면부터 보여줍니다.
  // (다른 메뉴로 이동했다가 로고를 눌러 홈으로 돌아오는 경우도 여기에 해당)
  if (sessionStorage.getItem(STORAGE_KEY)) {
    intro.classList.add("is-skipped");
    playHeroVideo();
    showHeroCaption();
    showHeader();
    return;
  }

  const lines = Array.from(intro.querySelectorAll(".intro__line"));

  // 각 문구가 화면에 "떠 있는" 시간(ms). 페이드인/아웃 시간은 여기 포함되지 않습니다.
  const HOLD_DURATION = [1600, 1400, 1400];
  const FADE_DURATION = 900; // 아래 CSS(.intro__line transition: opacity 0.9s)와 반드시 맞춰줍니다.

  // 문구 하나의 라이프사이클 : 페이드인(FADE_DURATION) → 유지(hold) → 페이드아웃(FADE_DURATION)
  // → 완전히 사라진 뒤에야 다음 문구를 호출합니다. (겹치지 않고 순차적으로 진행)
  function showLine(index) {
    // 모든 문구를 다 보여줬다면 인트로 전체를 사라지게 함
    if (index >= lines.length) {
      intro.classList.add("is-done");
      // 자막이 완전히 끝난 시점에 비로소 영상을 재생 시작하고, 히어로 캡션과 헤더를 페이드인 시킵니다.
      playHeroVideo();
      showHeroCaption();
      showHeader();
      // 이번 세션에서는 인트로를 다시 보여주지 않도록 기록
      sessionStorage.setItem(STORAGE_KEY, "true");
      return;
    }

    const line = lines[index];
    const hold = HOLD_DURATION[index] ?? 1400;

    // 1) 페이드인 시작
    line.classList.add("is-active");

    // 2) 페이드인 + 유지 시간이 지나면 페이드아웃 시작
    setTimeout(() => {
      line.classList.remove("is-active");

      // 3) 페이드아웃이 완전히 끝난 뒤에야 다음 문구로 넘어감 (겹침 없음)
      setTimeout(() => {
        showLine(index + 1);
      }, FADE_DURATION);
    }, FADE_DURATION + hold);
  }

  // 페이지 진입 직후 짧은 텀을 두고 시작
  setTimeout(() => showLine(0), 250);
}

/* ==========================================================================
   2. 헤더 스크롤 상태
   -------------------------------------------------------------------------
   - 히어로(영상) 위에 있을 때는 투명 + 밝은 글자
   - 스크롤을 내리면 아이보리 배경 + 어두운 글자로 전환
   ========================================================================== */
function initHeaderScrollState() {
  const header = document.getElementById("siteHeader");
  const hero = document.getElementById("hero");
  if (!header || !hero) return;

  // 히어로 섹션이 화면에서 벗어나는 순간을 감지해 헤더 스타일을 전환합니다.
  const observer = new IntersectionObserver(
    ([entry]) => {
      header.classList.toggle("is-scrolled", !entry.isIntersecting);
    },
    { rootMargin: `-${header.offsetHeight}px 0px 0px 0px`, threshold: 0 }
  );

  observer.observe(hero);
}

/* ==========================================================================
   3. 로그인 상태 동기화 + 로그인 / 로그아웃 버튼
   -------------------------------------------------------------------------
   - body[data-auth]는 Store.isLoggedIn()의 실제 로그인 여부를 그대로 반영합니다.
   - guest 상태에서 버튼을 누르면 login.html로 이동합니다.
   - member 상태에서 버튼을 누르면 즉시 로그아웃 처리됩니다.
   ========================================================================== */
function initAuthToggle() {
  const authBtn = document.getElementById("authToggleBtn");
  if (!authBtn) return;

  function applyState() {
    const loggedIn = Store.isLoggedIn();
    document.body.setAttribute("data-auth", loggedIn ? "member" : "guest");
    authBtn.textContent = loggedIn ? "Logout" : "Login";

    // 로그인 여부에 따라 통째로 보이거나 숨어야 하는 콘텐츠 블록을 갱신합니다.
    // (예: Send a Message 폼 ↔ 로그인 안내 블록, Share Your Memory 폼 ↔ 로그인 안내 블록)
    document.querySelectorAll(".auth-only").forEach((el) => {
      el.hidden = !loggedIn;
    });
    document.querySelectorAll(".guest-only").forEach((el) => {
      el.hidden = loggedIn;
    });
  }

  applyState();

  authBtn.addEventListener("click", () => {
    if (Store.isLoggedIn()) {
      Store.logoutUser();
      applyState();
      Store.showToast("로그아웃 되었습니다");
    } else {
      window.location.href = "login.html";
    }
  });
}

/* ==========================================================================
   4. Memory Preview (기억 취향 선택)
   -------------------------------------------------------------------------
   - 라디오 버튼 중 하나를 선택하면 결과 영역이 나타나고,
     섹션 배경이 살짝 어두운 톤으로 전환됩니다.
   ========================================================================== */
function initMemoryPreview() {
  const section = document.getElementById("memoryPreview");
  const options = document.getElementById("memoryOptions");
  const result = document.getElementById("memoryResult");
  if (!section || !options || !result) return;

  options.addEventListener("change", (event) => {
    if (event.target.name !== "memory") return;

    section.classList.add("has-result");
    result.hidden = false;

    // 선택 결과로 스르륵 시선이 이동하도록 스크롤 보정
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/* ==========================================================================
   5. 뉴스레터 구독 폼 (프론트엔드 데모: 실제 전송 없이 UX만 구현)
   ========================================================================== */
function initNewsletterForm() {
  const form = document.getElementById("newsletterForm");
  const emailInput = document.getElementById("newsletterEmail");
  const message = document.getElementById("newsletterMessage");
  if (!form || !emailInput || !message) return;

  const DEFAULT_MESSAGE = message.textContent;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!emailInput.value || !emailInput.validity.valid) {
      message.textContent = "올바른 이메일 주소를 입력해 주세요.";
      emailInput.focus();
      return;
    }

    // 실제 서비스에서는 이 지점에서 서버 API로 이메일을 전송합니다.
    message.textContent = "구독해 주셔서 감사합니다. 계절의 첫 향을 가장 먼저 전해드릴게요.";
    form.reset();

    // 잠시 후 원래 안내 문구로 복귀
    setTimeout(() => {
      message.textContent = DEFAULT_MESSAGE;
    }, 4000);
  });
}

/* ==========================================================================
   6. 모바일 메뉴 토글
   -------------------------------------------------------------------------
   - 860px 이하에서 .main-nav 가 숨겨지므로 햄버거 버튼으로 열고 닫습니다.
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById("menuToggle");
  const nav = document.querySelector(".main-nav");
  if (!toggleBtn || !nav) return;

  toggleBtn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });
}

/* ==========================================================================
   7. 로그인 필요 안내 모달 (공용)
   -------------------------------------------------------------------------
   - 이 모달 마크업(#authRequiredModal)이 있는 페이지에서만 동작합니다.
   - 다른 스크립트는 window.requireLogin(message)를 호출해 사용합니다.
     → 로그인 상태면 true를 반환 (그대로 다음 로직 진행)
     → 비로그인 상태면 모달을 띄우고 false를 반환 (호출부는 반드시 이 값을 확인해
        false일 때 이후 로직을 중단해야 합니다)
   ========================================================================== */
function initAuthRequiredModal() {
  const modal = document.getElementById("authRequiredModal");
  if (!modal) return;

  const closeBtn = document.getElementById("authRequiredClose");
  const descEl = document.getElementById("authRequiredDesc");

  function open() {
    modal.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add("is-open"));
    });
  }

  function close() {
    modal.classList.remove("is-open");
    setTimeout(() => {
      modal.hidden = true;
    }, 200);
  }

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });

  window.requireLogin = function requireLogin(message) {
    if (Store.isLoggedIn()) return true;

    // innerHTML을 사용하는 이유 : 호출부(archive.js, memory-story.js 등)에서
    // 문장이 예쁘게 두 줄로 떨어지도록 <br />로 줄바꿈 지점을 직접 지정하기 위함입니다.
    // message는 항상 우리가 코드에 직접 적어 넣는 문자열이라(사용자 입력 아님) 안전합니다.
    descEl.innerHTML = message || "이 기능은 로그인 후 이용하실 수 있습니다.";
    // 로그인 성공 후 원래 페이지로 되돌아올 수 있도록 현재 주소를 기억해둡니다.
    sessionStorage.setItem("moment_redirect_after_login", window.location.href);
    open();
    return false;
  };
}

/* ==========================================================================
   8. 로그인 게이트(.login-gate)의 "로그인하기" 링크
   -------------------------------------------------------------------------
   - contact.html의 Send a Message, memory-story.html의 Share Your Memory처럼
     폼 전체를 .auth-only로 숨기고 .guest-only 안내 블록을 보여주는 페이지에서,
     안내 블록 안의 로그인 링크를 눌렀을 때도 requireLogin()과 동일하게
     "로그인 후 이 페이지로 되돌아오기"가 되도록 현재 주소를 저장해둡니다.
   ========================================================================== */
function initLoginGateLinks() {
  document.querySelectorAll(".login-gate__login-link").forEach((link) => {
    link.addEventListener("click", () => {
      sessionStorage.setItem("moment_redirect_after_login", window.location.href);
    });
  });
}
