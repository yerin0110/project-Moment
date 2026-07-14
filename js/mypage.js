/* 경로: js/mypage.js */

/**
 * mypage.html 전용 로직입니다. 크게 다섯 부분으로 나뉩니다.
 * 1) 탭 전환 (찜한 향 / 장바구니 / 공유한 기억 / 문의 내역)
 * 2) 찜한 향 탭 : Store.getWishlist() → PERFUMES와 매칭해 카드로 렌더링
 * 3) 장바구니 탭 : Store.getCart() → PERFUMES와 매칭해 목록/합계 렌더링 (cart.js와 동일한 로직)
 * 4) 공유한 기억 탭 : Store.getMySharedStories()로 내가 쓴 글만 모아 수정/삭제
 *    (수정/삭제는 Store.updateSharedStory / Store.deleteSharedStory를 통해
 *     moment_shared_stories를 그대로 갱신하므로 Archive 화면에도 즉시 반영됩니다)
 * 5) 문의 내역 탭 : Store.getMyInquiries()로 내가 남긴 문의와 답변 상태 확인
 *
 * ⚠️ perfumes-data.js, store.js, render-helpers.js가 이 파일보다 먼저 로드되어야 합니다.
 */
document.addEventListener("DOMContentLoaded", () => {
  initMypageWelcome();
  initMypageTabs();
  initWishlistTab();
  initCartTab();
  initMemoriesTab();
  initInquiriesTab();
});

/* ==========================================================================
   0. 공통 : 감정(컬렉션) id → 표시용 정보
   ========================================================================== */
const MEMORY_EMOTION_META = {
  healing: { emoji: "🌿", label: "Healing" },
  love: { emoji: "🤍", label: "Love" },
  "new-beginning": { emoji: "🌅", label: "New Beginning" },
  nostalgia: { emoji: "🍂", label: "Nostalgia" },
};

function getEmotionMeta(emotion) {
  return MEMORY_EMOTION_META[emotion] || { emoji: "🕊", label: emotion || "" };
}

// 문의 유형 값(contact.html의 select value) → 화면에 보여줄 한글 라벨
const INQUIRY_TYPE_LABEL = {
  product: "상품 문의",
  shipping: "배송 문의",
  exchange: "교환 / 환불",
  etc: "기타",
};

/* ==========================================================================
   1. 환영 메시지
   ========================================================================== */
function initMypageWelcome() {
  const el = document.getElementById("mypageWelcome");
  if (!el) return;

  const user = Store.getCurrentUser();
  el.textContent = user ? `${user.name}님, 안녕하세요.` : "";
}

/* ==========================================================================
   2. 탭 전환
   -------------------------------------------------------------------------
   - 탭 버튼(.mypage-tab)을 누르면 그 data-tab 값과 일치하는
     .mypage-panel[data-panel]만 보여줍니다.
   ========================================================================== */
function initMypageTabs() {
  const tabsEl = document.getElementById("mypageTabs");
  const panels = document.querySelectorAll(".mypage-panel");
  if (!tabsEl) return;

  tabsEl.addEventListener("click", (event) => {
    const tabBtn = event.target.closest(".mypage-tab");
    if (!tabBtn) return;

    const tab = tabBtn.dataset.tab;

    tabsEl.querySelectorAll(".mypage-tab").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn === tabBtn));
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab;
    });
  });
}

/* ==========================================================================
   3. 찜한 향 탭
   -------------------------------------------------------------------------
   - wishlist.js와 동일한 방식으로 render-helpers.js의 buildProductCardHTML을
     재사용합니다 (카드 UI/찜·장바구니 버튼을 모든 페이지에서 통일하기 위함).
   ========================================================================== */
function initWishlistTab() {
  const grid = document.getElementById("mypageWishlistGrid");
  const emptyMessage = document.getElementById("mypageWishlistEmpty");
  if (!grid) return;

  function render() {
    const wishedIds = Store.getWishlist();
    const wishedPerfumes = PERFUMES.filter((perfume) => wishedIds.includes(perfume.id));

    grid.innerHTML = wishedPerfumes.map(buildProductCardHTML).join("");
    emptyMessage.hidden = wishedPerfumes.length > 0;
  }

  grid.addEventListener("click", (event) => {
    const wishBtn = event.target.closest(".product-card__wish");
    const cartBtn = event.target.closest(".product-card__cart");

    if (wishBtn) {
      event.preventDefault();
      Store.toggleWishlist(wishBtn.dataset.id);
      Store.showToast("찜 목록에서 제거했어요");
      render();
      return;
    }

    if (cartBtn) {
      event.preventDefault();
      Store.addToCart(cartBtn.dataset.id, 1);
      Store.showToast("장바구니에 담았어요");
    }
  });

  render();
}

/* ==========================================================================
   4. 장바구니 탭 (cart.js와 동일한 렌더링 로직을 이 페이지 안에서 재사용)
   ========================================================================== */
function initCartTab() {
  const list = document.getElementById("mypageCartList");
  const emptyMessage = document.getElementById("mypageCartEmpty");
  const summary = document.getElementById("mypageCartSummary");
  if (!list) return;

  function render() {
    const cartItems = Store.getCart()
      .map((entry) => {
        const perfume = PERFUMES.find((item) => item.id === entry.id);
        return perfume ? { ...entry, perfume } : null;
      })
      .filter(Boolean);

    if (cartItems.length === 0) {
      list.innerHTML = "";
      emptyMessage.hidden = false;
      summary.hidden = true;
      return;
    }

    emptyMessage.hidden = true;
    summary.hidden = false;

    list.innerHTML = cartItems
      .map(
        ({ id, qty, perfume }) => `
          <li class="cart-item" data-id="${id}">
            <img class="cart-item__image" src="${perfume.image}" alt="${perfume.name} 향수 이미지" />
            <div>
              <span class="cart-item__name">${perfume.name}</span>
              <span class="cart-item__subtitle">${perfume.subtitle}</span>
            </div>
            <span class="cart-item__unit-price">${formatPrice(perfume.price)}</span>
            <div class="quantity-stepper" role="group" aria-label="${perfume.name} 수량 선택">
              <button type="button" class="cart-item__qty-minus" data-id="${id}" aria-label="수량 감소">−</button>
              <span>${qty}</span>
              <button type="button" class="cart-item__qty-plus" data-id="${id}" aria-label="수량 증가">+</button>
            </div>
            <span class="cart-item__subtotal">${formatPrice(perfume.price * qty)}</span>
            <button type="button" class="cart-item__remove" data-id="${id}">삭제</button>
          </li>
        `
      )
      .join("");

    const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + item.perfume.price * item.qty, 0);

    document.getElementById("mypageCartTotalCount").textContent = `${totalCount}개`;
    document.getElementById("mypageCartTotalPrice").textContent = formatPrice(totalPrice);
  }

  list.addEventListener("click", (event) => {
    const minusBtn = event.target.closest(".cart-item__qty-minus");
    const plusBtn = event.target.closest(".cart-item__qty-plus");
    const removeBtn = event.target.closest(".cart-item__remove");

    if (minusBtn) {
      const current = Store.getCart().find((item) => item.id === minusBtn.dataset.id);
      if (current) Store.updateCartQty(minusBtn.dataset.id, current.qty - 1);
      render();
    } else if (plusBtn) {
      const current = Store.getCart().find((item) => item.id === plusBtn.dataset.id);
      if (current) Store.updateCartQty(plusBtn.dataset.id, current.qty + 1);
      render();
    } else if (removeBtn) {
      Store.removeFromCart(removeBtn.dataset.id);
      Store.showToast("장바구니에서 삭제했어요");
      render();
    }
  });

  render();
}

/* ==========================================================================
   5. 공유한 기억 탭 (Share Your Memory 수정 / 삭제)
   -------------------------------------------------------------------------
   - 목록은 Store.getMySharedStories()로 "내가 쓴 글"만 가져옵니다.
   - 수정 : #memoryEditModal을 열어 제목/내용/감정을 채워두고, 저장 시
     Store.updateSharedStory(id, ...)를 호출합니다.
   - 삭제 : 공용 확인 모달(#confirmDeleteModal)을 띄운 뒤 확인하면
     Store.deleteSharedStory(id)를 호출합니다.
   - 두 작업 모두 archive.js가 읽는 것과 동일한 storage(moment_shared_stories)를
     갱신하므로, Archive 페이지를 새로고침하면 바뀐 내용이 그대로 보입니다.
   ========================================================================== */
function initMemoriesTab() {
  const list = document.getElementById("myMemoryList");
  const emptyMessage = document.getElementById("myMemoryEmpty");
  if (!list) return;

  /* ---------- 목록 렌더링 ---------- */
  function render() {
    const myStories = Store.getMySharedStories().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    list.innerHTML = myStories.map(buildMemoryCardHTML).join("");
    emptyMessage.hidden = myStories.length > 0;
  }

  function buildMemoryCardHTML(story) {
    const meta = getEmotionMeta(story.emotion);
    const dateLabel = story.createdAt
      ? new Date(story.createdAt).toISOString().slice(0, 10).replace(/-/g, ".")
      : "";

    return `
      <li class="my-memory-card" data-id="${story.id}">
        <div class="my-memory-card__head">
          <span class="my-memory-card__emotion">${meta.emoji} ${meta.label}</span>
          <time class="my-memory-card__date">${dateLabel}${story.updatedAt ? " (수정됨)" : ""}</time>
        </div>
        <h3 class="my-memory-card__title">${story.title}</h3>
        <p class="my-memory-card__content">${story.content}</p>
        <div class="my-memory-card__actions">
          <button type="button" class="link-underline my-memory-card__edit" data-id="${story.id}">수정하기</button>
          <button type="button" class="link-underline my-memory-card__delete" data-id="${story.id}">삭제하기</button>
        </div>
      </li>
    `;
  }

  /* ---------- 수정 모달 ---------- */
  const editModal = document.getElementById("memoryEditModal");
  const editForm = document.getElementById("memoryEditForm");
  const editTitleInput = document.getElementById("memoryEditTitleInput");
  const editContentInput = document.getElementById("memoryEditContentInput");
  const editEmotions = document.getElementById("memoryEditEmotions");
  const editError = document.getElementById("memoryEditError");
  const editCancelBtn = document.getElementById("memoryEditCancel");

  let editingId = null;

  function openEditModal(story) {
    editingId = story.id;
    editTitleInput.value = story.title;
    editContentInput.value = story.content;
    editError.hidden = true;

    editEmotions.querySelectorAll(".emotion-chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.emotion === story.emotion));
    });

    editModal.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => editModal.classList.add("is-open"));
    });
  }

  function closeEditModal() {
    editModal.classList.remove("is-open");
    setTimeout(() => {
      editModal.hidden = true;
      editingId = null;
    }, 200);
  }

  editEmotions.addEventListener("click", (event) => {
    const chip = event.target.closest(".emotion-chip");
    if (!chip) return;
    editEmotions.querySelectorAll(".emotion-chip").forEach((el) => el.setAttribute("aria-pressed", "false"));
    chip.setAttribute("aria-pressed", "true");
  });

  editCancelBtn.addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (event) => {
    if (event.target === editModal) closeEditModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !editModal.hidden) closeEditModal();
  });

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = editTitleInput.value.trim();
    const content = editContentInput.value.trim();
    const selectedChip = editEmotions.querySelector('.emotion-chip[aria-pressed="true"]');

    if (!title || !content || !selectedChip) {
      editError.textContent = "제목, 내용, 감정을 모두 선택해 주세요.";
      editError.hidden = false;
      return;
    }

    Store.updateSharedStory(editingId, { title, content, emotion: selectedChip.dataset.emotion });
    Store.showToast("기억을 수정했어요");
    closeEditModal();
    render();
  });

  /* ---------- 삭제 확인 모달 (공용) ---------- */
  const confirmModal = document.getElementById("confirmDeleteModal");
  const confirmDesc = document.getElementById("confirmDeleteDesc");
  const confirmOkBtn = document.getElementById("confirmDeleteOk");
  const confirmCancelBtn = document.getElementById("confirmDeleteCancel");

  let pendingDeleteId = null;
  let pendingDeleteType = null; // "memory" | "inquiry"

  function openConfirmModal(type, id, message) {
    pendingDeleteType = type;
    pendingDeleteId = id;
    confirmDesc.textContent = message;

    confirmModal.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => confirmModal.classList.add("is-open"));
    });
  }

  function closeConfirmModal() {
    confirmModal.classList.remove("is-open");
    setTimeout(() => {
      confirmModal.hidden = true;
      pendingDeleteId = null;
      pendingDeleteType = null;
    }, 200);
  }

  confirmCancelBtn.addEventListener("click", closeConfirmModal);
  confirmModal.addEventListener("click", (event) => {
    if (event.target === confirmModal) closeConfirmModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !confirmModal.hidden) closeConfirmModal();
  });

  confirmOkBtn.addEventListener("click", () => {
    if (pendingDeleteType === "memory") {
      Store.deleteSharedStory(pendingDeleteId);
      Store.showToast("기억을 삭제했어요");
      render();
    } else if (pendingDeleteType === "inquiry") {
      // 문의 삭제는 window.deleteInquiryCallback(id)에서 처리 (5번 섹션 참고)
      window.deleteInquiryCallback?.(pendingDeleteId);
    }
    closeConfirmModal();
  });

  // 다른 탭(문의 내역)에서도 같은 확인 모달을 재사용할 수 있도록 전역에 노출합니다.
  window.openConfirmDeleteModal = openConfirmModal;

  /* ---------- 목록의 수정/삭제 버튼 (이벤트 위임) ---------- */
  list.addEventListener("click", (event) => {
    const editBtn = event.target.closest(".my-memory-card__edit");
    const deleteBtn = event.target.closest(".my-memory-card__delete");

    if (editBtn) {
      const story = Store.getMySharedStories().find((item) => item.id === editBtn.dataset.id);
      if (story) openEditModal(story);
      return;
    }

    if (deleteBtn) {
      openConfirmModal(
        "memory",
        deleteBtn.dataset.id,
        "삭제한 기억은 Archive에서도 함께 사라지며, 되돌릴 수 없습니다."
      );
    }
  });

  render();
}

/* ==========================================================================
   6. 문의 내역 탭 (Send a Message 확인)
   -------------------------------------------------------------------------
   - Store.getMyInquiries()로 내가 남긴 문의만 최신순으로 보여줍니다.
   - 실제 서버가 없는 데모라 답변(answer)은 항상 비어 있고, 상태는
     "답변대기"로 고정됩니다. (관리자 답변 기능이 연결되면 status가
     "answered"로 바뀌고 answer 문구가 함께 채워지는 구조만 미리 만들어 둡니다)
   ========================================================================== */
function initInquiriesTab() {
  const list = document.getElementById("myInquiryList");
  const emptyMessage = document.getElementById("myInquiryEmpty");
  if (!list) return;

  function render() {
    const myInquiries = Store.getMyInquiries().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    list.innerHTML = myInquiries.map(buildInquiryCardHTML).join("");
    emptyMessage.hidden = myInquiries.length > 0;
  }

  function buildInquiryCardHTML(inquiry) {
    const dateLabel = inquiry.createdAt
      ? new Date(inquiry.createdAt).toISOString().slice(0, 10).replace(/-/g, ".")
      : "";
    const isAnswered = inquiry.status === "answered";

    return `
      <li class="my-inquiry-card" data-id="${inquiry.id}">
        <div class="my-inquiry-card__head">
          <span class="my-inquiry-card__type">${INQUIRY_TYPE_LABEL[inquiry.type] || inquiry.type}</span>
          <span class="my-inquiry-card__status ${isAnswered ? "is-answered" : ""}">
            ${isAnswered ? "답변완료" : "답변대기"}
          </span>
        </div>
        <p class="my-inquiry-card__subject">${inquiry.subject}</p>
        <time class="my-inquiry-card__date">${dateLabel}</time>
        <p class="my-inquiry-card__message">${inquiry.message}</p>
        <div class="my-inquiry-card__answer ${isAnswered ? "" : "is-empty"}">
          <p class="my-inquiry-card__answer-label">${isAnswered ? "MOMENT의 답변" : "답변 대기 중"}</p>
          <p class="my-inquiry-card__answer-text">
            ${isAnswered ? inquiry.answer : "빠른 시일 내에 답변을 남겨드릴게요. 답변이 등록되면 이곳에서 확인하실 수 있습니다."}
          </p>
        </div>
        <button type="button" class="link-underline my-inquiry-card__delete" data-id="${inquiry.id}">삭제하기</button>
      </li>
    `;
  }

  // 5번 섹션(공유한 기억)에서 만든 공용 확인 모달을 그대로 사용합니다.
  window.deleteInquiryCallback = function deleteInquiryCallback(id) {
    Store.deleteInquiry(id);
    Store.showToast("문의를 삭제했어요");
    render();
  };

  list.addEventListener("click", (event) => {
    const deleteBtn = event.target.closest(".my-inquiry-card__delete");
    if (!deleteBtn) return;

    window.openConfirmDeleteModal?.(
      "inquiry",
      deleteBtn.dataset.id,
      "삭제한 문의는 되돌릴 수 없습니다. 정말 삭제하시겠습니까?"
    );
  });

  render();
}
