/* 경로: js/contact.js */

/**
 * contact.html 전용 로직입니다. 세 부분으로 나뉩니다.
 * 1) Send a Message : 문의 폼 유효성 검사 후 완료 모달 표시
 *    (실제 서버 전송 없는 프론트엔드 데모)
 * 2) FAQ 아코디언 : 질문 클릭 시 답변 열기/닫기 (한 번에 하나만 열림)
 * 3) Visit Our Store 라이트박스 : 쇼룸 이미지를 크게 보여주거나,
 *    "View Location" 클릭 시 지정된 위치 안내 이미지를 보여주는 모달
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

  /* ---------- 완료 모달 열기/닫기 ---------- */
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
      item
        .querySelector(".faq-item__question")
        .setAttribute("aria-expanded", "false");
    });

    // 원래 닫혀있던 항목이었다면 다시 엽니다 (같은 걸 두 번 누르면 닫힘 유지)
    if (!isAlreadyOpen) {
      clickedItem.classList.add("is-open");
      questionBtn.setAttribute("aria-expanded", "true");
    }
  });
}

/* ==========================================================================
   3. VISIT OUR STORE : 쇼룸 이미지 / 위치 안내 이미지 라이트박스
   -------------------------------------------------------------------------
   - 이 라이트박스는 두 가지 트리거를 갖고 있고, 트리거마다 보여줄 이미지가
     다릅니다.
     1) 쇼룸 사진(#storeImage)을 클릭  → 그 사진 자체를 확대해서 보여줍니다.
     2) "View Location" 버튼을 클릭   → 실제 지도 대신, 아래 지정해둔
        위치 안내 이미지(LOCATION_IMAGE_SRC)를 보여줍니다.
   - openModal(src, alt)이 호출될 때마다 이미지 소스를 인자로 받아
     modalImg에 채워 넣는 구조라, 트리거별로 다른 이미지를 재사용 없이
     보여줄 수 있습니다.
   - 추후 실제 지도(카카오맵 / 구글맵 등)를 연동하고 싶다면, openModal 호출부와
     모달 내부 마크업(store-image-modal)을 지도 임베드 코드로 교체하면 됩니다.
   ========================================================================== */
function initStoreLightbox() {
  const viewBtn = document.getElementById("viewLocationBtn");
  const storeImage = document.getElementById("storeImage");
  const modal = document.getElementById("storeImageModal");
  const modalImg = document.getElementById("storeImageModalImg");
  const closeBtn = document.getElementById("storeImageModalClose");
  if (!viewBtn || !modal) return;

  // "View Location" 버튼 전용 이미지입니다. 실제 지도가 준비되기 전까지
  // 여기 경로만 원하는 이미지(약도, 위치 안내 이미지 등)로 바꿔주면 됩니다.
  const LOCATION_IMAGE_SRC = "images/contact/viewLocation.jpeg";
  const LOCATION_IMAGE_ALT = "Memory Perfume Studio 위치 안내 이미지 (약도)";

  function openModal(src, alt) {
    modalImg.src = src;
    modalImg.alt = alt;
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

  // "View Location" 버튼 : 지정된 위치 안내 이미지를 보여줍니다.
  viewBtn.addEventListener("click", () => {
    openModal(LOCATION_IMAGE_SRC, LOCATION_IMAGE_ALT);
  });

  // 쇼룸 사진 클릭 : 사진 자체를 그대로 확대해서 보여줍니다.
  storeImage.addEventListener("click", () => {
    openModal(storeImage.src, storeImage.alt);
  });

  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}
