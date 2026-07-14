/* 경로: js/contact.js */

/**
 * contact.html 전용 로직입니다. 세 부분으로 나뉩니다.
 * 1) Send a Message : 문의 폼 유효성 검사 후 완료 모달 표시
 *    (실제 서버 전송 없는 프론트엔드 데모)
 * 2) FAQ 아코디언 : 질문 클릭 시 답변 열기/닫기 (한 번에 하나만 열림)
 * 3) Visit Our Store 라이트박스 : 쇼룸 이미지를 크게 보여주는 모달
 */
document.addEventListener("DOMContentLoaded", () => {
  initContactForm();
  initFaqAccordion();
  initStoreLightbox();
});

/* ==========================================================================
   1. SEND A MESSAGE
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById("contactForm");
  const errorEl = document.getElementById("contactFormError");
  if (!form) return;

  const modal = document.getElementById("contactModal");
  const closeBtn = document.getElementById("contactModalClose");
  const confirmBtn = document.getElementById("contactModalConfirm");

  /* ---------- 완료 모달 열기/닫기 (memory-story.js의 shareModal과 동일한 방식) ---------- */
  function openModal() {
    modal.hidden = false;
    // hidden을 지운 다음 프레임에서 클래스를 붙여야 opacity/transform 트랜지션이 재생됩니다.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add("is-open"));
    });
  }

  function closeModal() {
    modal.classList.remove("is-open");
    setTimeout(() => {
      modal.hidden = true;
    }, 200);
  }

  closeBtn.addEventListener("click", closeModal);
  confirmBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  /* ---------- 폼 제출 ---------- */
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const inquiryType = document.getElementById("inquiryType").value;
    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const subject = document.getElementById("contactSubject").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    if (!inquiryType || !name || !email || !subject || !message) {
      errorEl.textContent = "모든 항목을 입력해 주세요.";
      errorEl.hidden = false;
      return;
    }

    // 간단한 이메일 형식 확인 (native validity를 우선 신뢰하되, 한 번 더 확인)
    const emailInput = document.getElementById("contactEmail");
    if (!emailInput.validity.valid) {
      errorEl.textContent = "올바른 이메일 주소를 입력해 주세요.";
      errorEl.hidden = false;
      emailInput.focus();
      return;
    }

    errorEl.hidden = true;

    // 실제 서비스에서는 이 지점에서 서버 API로 문의 내용을 전송합니다.
    // 이 데모에서는 Store에 저장해두고, 마이페이지의 "문의 내역" 탭에서
    // 본인이 남긴 문의와 답변 상태를 확인할 수 있게 합니다.
    Store.addInquiry({ type: inquiryType, name, email, subject, message });

    form.reset();
    openModal();
  });
}

/* ==========================================================================
   2. FAQ 아코디언
   -------------------------------------------------------------------------
   - 실제 열고 닫는 애니메이션은 css/contact.css의 grid-template-rows
     트랜지션이 담당합니다. JS는 "is-open" 클래스와 aria-expanded만 관리합니다.
   - 한 번에 하나의 답변만 열리도록, 새 항목을 열면 나머지는 닫습니다.
   ========================================================================== */
function initFaqAccordion() {
  const faqList = document.getElementById("faqList");
  if (!faqList) return;

  const items = Array.from(faqList.querySelectorAll(".faq-item"));

  faqList.addEventListener("click", (event) => {
    const questionBtn = event.target.closest(".faq-item__question");
    if (!questionBtn) return;

    const clickedItem = questionBtn.closest(".faq-item");
    const isAlreadyOpen = clickedItem.classList.contains("is-open");

    // 모든 항목을 먼저 닫고
    items.forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".faq-item__question").setAttribute("aria-expanded", "false");
    });

    // 원래 닫혀있던 항목이었다면 다시 엽니다 (같은 걸 두 번 누르면 닫힘 유지)
    if (!isAlreadyOpen) {
      clickedItem.classList.add("is-open");
      questionBtn.setAttribute("aria-expanded", "true");
    }
  });
}

/* ==========================================================================
   3. VISIT OUR STORE : 쇼룸 이미지 라이트박스
   -------------------------------------------------------------------------
   - 실제 지도 대신, 이미 보여주고 있는 쇼룸 이미지를 더 크게 보여주는
     간단한 라이트박스 모달입니다.
   ========================================================================== */
function initStoreLightbox() {
  const viewBtn = document.getElementById("viewLocationBtn");
  const storeImage = document.getElementById("storeImage");
  const modal = document.getElementById("storeImageModal");
  const modalImg = document.getElementById("storeImageModalImg");
  const closeBtn = document.getElementById("storeImageModalClose");
  if (!viewBtn || !modal) return;

  function openModal() {
    modalImg.src = storeImage.src;
    modal.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add("is-open"));
    });
  }

  function closeModal() {
    modal.classList.remove("is-open");
    setTimeout(() => {
      modal.hidden = true;
    }, 200);
  }

  viewBtn.addEventListener("click", openModal);
  storeImage.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}
