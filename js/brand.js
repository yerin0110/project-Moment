/* 경로: js/brand.js */

/**
 * brand.html에서만 사용하는 스크롤 등장 애니메이션을 담당합니다.
 * (헤더 스크롤 상태, 로그인 토글, 모바일 메뉴 등 공통 기능은 js/main.js가 처리합니다)
 */
document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
});

/* ==========================================================================
   스크롤 등장 애니메이션 (.reveal-up)
   -------------------------------------------------------------------------
   - Brand Philosophy 텍스트/이미지, Values 카드, Essence 문장/이미지,
     Closing 문구 등 ".reveal-up" 클래스가 붙은 요소가 화면에 들어오면
     .is-visible을 추가해 CSS 트랜지션(css/brand.css)이 실행되게 합니다.
   - 각 요소가 나타나는 순서(딜레이)는 css/brand.css의 nth-child
     transition-delay 규칙으로 조정합니다.
   - 한 번 나타난 요소는 다시 관찰할 필요가 없으므로 unobserve로 정리합니다.
   ========================================================================== */
function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal-up");
  if (!targets.length) return;

  // IntersectionObserver를 지원하지 않는 아주 오래된 환경을 위한 안전장치
  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );

  targets.forEach((el) => observer.observe(el));
}
