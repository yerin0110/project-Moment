/* 경로: js/product-detail.js */

/**
 * product-detail.html 전용 로직입니다.
 * URL의 ?id= 값으로 PERFUMES 배열에서 향수를 찾아 화면 전체를 채웁니다.
 * 예) product-detail.html?id=dawn
 */
document.addEventListener("DOMContentLoaded", () => {
  initProductDetailPage();
});

function initProductDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const perfumeId = params.get("id");
  const perfume = PERFUMES.find((item) => item.id === perfumeId);

  // 유효하지 않은 id로 접근한 경우, 안내 문구와 함께 Collection으로 돌아가는 링크를 보여줍니다.
  if (!perfume) {
    document.querySelector(".detail-container").innerHTML = `
      <p style="padding: 200px 0; text-align:center;">
        존재하지 않는 상품입니다.
        <a href="collection.html" class="link-underline">Collection으로 돌아가기</a>
      </p>
    `;
    return;
  }

  const collection = COLLECTIONS.find((item) => item.id === perfume.collectionId);

  /* ---------- 1) 기본 정보 채우기 ---------- */
  document.getElementById("pageTitle").textContent = `${perfume.name} | Moment | Memory Archive`;
  document.getElementById("pageDescription").setAttribute("content", perfume.tagline);

  document.getElementById("detailImage").src = perfume.image;
  document.getElementById("detailImage").alt = `${perfume.name} 향수 이미지`;

  const collectionLink = document.getElementById("detailCollectionLink");

  document.getElementById("detailSubtitle").textContent = perfume.subtitle;
  document.getElementById("detailName").textContent = perfume.name;
  document.getElementById("detailPrice").textContent = formatPrice(perfume.price);

  const ratingEl = document.getElementById("detailRating");
  ratingEl.textContent = renderStars(perfume.rating);
  ratingEl.setAttribute("aria-label", `평점 5점 중 ${perfume.rating}점`);

  /* ---------- 2) 수량 선택 ---------- */
  const qtyInput = document.getElementById("qtyInput");
  document.getElementById("qtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  document.getElementById("qtyPlus").addEventListener("click", () => {
    qtyInput.value = Math.min(10, Number(qtyInput.value) + 1);
  });
  qtyInput.addEventListener("change", () => {
    const value = Math.min(10, Math.max(1, Number(qtyInput.value) || 1));
    qtyInput.value = value;
  });

  /* ---------- 3) 구매 버튼 ---------- */  /* ---------- 3-1) 비회원 구매 확인 모달 ---------- */
  const guestModal = document.getElementById("guestCheckoutModal");
  const guestCloseBtn = document.getElementById("guestCheckoutClose");
  const guestLoginBtn = document.getElementById("guestCheckoutLoginBtn");
  const guestProceedBtn = document.getElementById("guestCheckoutProceedBtn");

  function openGuestModal() {
    guestModal.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => guestModal.classList.add("is-open"));
    });
  }

  function closeGuestModal() {
    guestModal.classList.remove("is-open");
    setTimeout(() => {
      guestModal.hidden = true;
    }, 200);
  }

  guestCloseBtn.addEventListener("click", closeGuestModal);
  guestModal.addEventListener("click", (event) => {
    if (event.target === guestModal) closeGuestModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !guestModal.hidden) closeGuestModal();
  });

  // "로그인하기" : 로그인 페이지로 이동 (로그인 후 이 상세페이지로 되돌아옵니다)
  guestLoginBtn.addEventListener("click", () => {
    sessionStorage.setItem("moment_redirect_after_login", window.location.href);
    window.location.href = "login.html";
  });

  // "구매하기" : 로그인 없이 그대로 장바구니에 담아 진행합니다 (게스트 구매)
  guestProceedBtn.addEventListener("click", () => {
    Store.addToCart(perfume.id, Number(qtyInput.value));
    window.location.href = "cart.html";
  });

  /* ---------- 3-2) Buy Now : 로그인 상태면 바로 진행, 아니면 확인 모달을 띄웁니다 ---------- */
  document.getElementById("buyNowBtn").addEventListener("click", () => {
    if (Store.isLoggedIn()) {
      Store.addToCart(perfume.id, Number(qtyInput.value));
      window.location.href = "cart.html";
      return;
    }
    openGuestModal();
  });

  /* ---------- 4) 찜 버튼 ---------- */
  const wishBtn = document.getElementById("wishBtn");
  const wishIcon = document.getElementById("wishIcon");
  const wishLabel = document.getElementById("wishLabel");

  function updateWishButton() {
    const wished = Store.isInWishlist(perfume.id);
    wishBtn.setAttribute("aria-pressed", String(wished));
    wishIcon.textContent = wished ? "♥" : "♡";
    wishLabel.textContent = wished ? "찜 완료" : "Wishlist";
  }
  updateWishButton();

  wishBtn.addEventListener("click", () => {
    if (!window.requireLogin("찜하기는 로그인 후 이용하실 수 있습니다.")) return;
    const wished = Store.toggleWishlist(perfume.id);
    Store.showToast(wished ? "찜 목록에 추가했어요" : "찜 목록에서 제거했어요");
    updateWishButton();
  });

  /* ---------- 5) Top / Middle / Base 노트 ---------- */
  const notesGrid = document.getElementById("notesGrid");
  const noteGroups = [
    { label: "Top", items: perfume.notes.top },
    { label: "Middle", items: perfume.notes.middle },
    { label: "Base", items: perfume.notes.base },
  ];
  notesGrid.innerHTML = noteGroups
    .map(
      (group) => `
        <div class="notes-block__group">
          <h3>${group.label}</h3>
          <ul>
            ${group.items.map((note) => `<li>${note}</li>`).join("")}
          </ul>
        </div>
      `
    )
    .join("");

  /* ---------- 6) 향에 담긴 이야기 ---------- */
  document.getElementById("detailStoryLines").innerHTML = perfume.story
    .map((line) => `<p>${line}</p>`)
    .join("");
  document.getElementById("detailDescription").textContent = perfume.description;

  /* ---------- 7) 같은 컬렉션의 다른 향 (관련 상품) ---------- */
  const related = PERFUMES.filter(
    (item) => item.collectionId === perfume.collectionId && item.id !== perfume.id
  );

  const relatedSection = document.getElementById("relatedProducts");
  const relatedGrid = document.getElementById("relatedGrid");
  const relatedHeading = document.getElementById("relatedHeading");

  if (related.length === 0) {
    relatedSection.hidden = true;
  } else {
    relatedHeading.textContent = `${collection ? collection.name : ""} 컬렉션의 다른 향`;
    relatedGrid.innerHTML = related.map(buildProductCardHTML).join("");

    // 관련 상품 카드의 찜/장바구니 버튼도 동작하도록 이벤트 위임 처리
    relatedGrid.addEventListener("click", (event) => {
      const wishRelBtn = event.target.closest(".product-card__wish");
      const cartRelBtn = event.target.closest(".product-card__cart");

      if (wishRelBtn) {
        event.preventDefault();
        const nowWished = Store.toggleWishlist(wishRelBtn.dataset.id);
        Store.showToast(nowWished ? "찜 목록에 추가했어요" : "찜 목록에서 제거했어요");
        relatedGrid.innerHTML = related.map(buildProductCardHTML).join("");
      } else if (cartRelBtn) {
        event.preventDefault();
        Store.addToCart(cartRelBtn.dataset.id, 1);
        Store.showToast("장바구니에 담았어요");
      }
    });
  }

  // 컬렉션 링크 클릭 시 collection.html에서 해당 컬렉션으로 필터링되어 열리도록 연결
  collectionLink.innerHTML = collection
    ? `<a href="collection.html?collection=${collection.id}">${collection.name}</a>`
    : "";
}
