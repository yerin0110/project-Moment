/* 경로: js/auth.js */

/**
 * login.html / signup.html 전용 로직입니다.
 * 실제 회원 데이터/로그인 처리는 js/store.js가 담당하고,
 * 이 파일은 각 폼의 유효성 검사와 화면 전환(에러 메시지, 리다이렉트)만 다룹니다.
 *
 * ⚠️ store.js가 이 파일보다 먼저 로드되어야 합니다.
 */
document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initSignupForm();
});

/* ==========================================================================
   로그인 후 원래 있던 페이지로 돌아가기 위한 리다이렉트 처리
   -------------------------------------------------------------------------
   - main.js의 requireLogin()이 로그인 모달을 띄우기 직전, 현재 URL을
     sessionStorage(moment_redirect_after_login)에 저장해 둡니다.
   - 로그인에 성공하면 그 URL로, 없으면 기본값(index.html)으로 이동합니다.
   ========================================================================== */
const REDIRECT_KEY = "moment_redirect_after_login";

function getRedirectTarget() {
  const saved = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  return saved || "index.html";
}

/* ==========================================================================
   1. 로그인 폼
   ========================================================================== */
function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const errorEl = document.getElementById("loginError");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      errorEl.textContent = "이메일과 비밀번호를 모두 입력해 주세요.";
      errorEl.hidden = false;
      return;
    }

    const result = Store.loginUser(email, password);

    if (!result.success) {
      errorEl.textContent = result.message;
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
    Store.showToast(`${result.user.name}님, 환영합니다.`);

    // 토스트를 잠깐이라도 보여준 뒤 이동
    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 400);
  });
}

/* ==========================================================================
   2. 회원가입 폼
   ========================================================================== */
function initSignupForm() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  const errorEl = document.getElementById("signupError");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const passwordConfirm = document.getElementById("signupPasswordConfirm").value;

    if (!name || !email || !password || !passwordConfirm) {
      errorEl.textContent = "모든 항목을 입력해 주세요.";
      errorEl.hidden = false;
      return;
    }

    const emailInput = document.getElementById("signupEmail");
    if (!emailInput.validity.valid) {
      errorEl.textContent = "올바른 이메일 주소를 입력해 주세요.";
      errorEl.hidden = false;
      return;
    }

    if (password.length < 4) {
      errorEl.textContent = "비밀번호는 4자 이상 입력해 주세요.";
      errorEl.hidden = false;
      return;
    }

    if (password !== passwordConfirm) {
      errorEl.textContent = "비밀번호가 일치하지 않습니다.";
      errorEl.hidden = false;
      return;
    }

    const result = Store.registerUser({ name, email, password });

    if (!result.success) {
      errorEl.textContent = result.message;
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
    Store.showToast("회원가입이 완료되었습니다. 로그인해 주세요.");

    setTimeout(() => {
      // 로그인 페이지로 이동하면서 방금 가입한 이메일을 쿼리로 넘겨 편의를 높입니다.
      window.location.href = `login.html?email=${encodeURIComponent(email)}`;
    }, 500);
  });
}
