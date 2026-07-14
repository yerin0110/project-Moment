/* 경로: js/collection.js */

/**
 * collection.html 전용 로직입니다.
 * - 오늘의 향수 : PERFUMES 중 4개를 날짜 기준으로 무작위 노출 (카드 클릭 시 구매 페이지로 이동)
 * - 카테고리 / 기억(컬렉션) / 향 필터 칩 클릭 → 상품 그리드 다시 렌더링
 * - 찜 / 장바구니 버튼 클릭 → Store에 저장 후 화면 갱신
 */
document.addEventListener("DOMContentLoaded", () => {
  renderTodayPerfumes();
  initCollectionPage();
});

/* ==========================================================================
   오늘의 향수 (날짜 기준 무작위 4개)
   -------------------------------------------------------------------------
   - 오늘 날짜(YYYY-MM-DD)를 시드로 사용하는 결정론적 랜덤이라, 같은 날 안에는
     새로고침해도 항상 같은 4개가 보이고 자정이 지나면 다른 4개로 바뀝니다.
   - 카드는 전체가 <a> 링크라서 클릭하면 바로 상세/구매 페이지로 이동합니다.
   ========================================================================== */
function renderTodayPerfumes() {
  const grid = document.getElementById("todayPerfumesGrid");
  if (!grid) return;

  const todayKey = new Date().toISOString().slice(0, 10); // 예: "2026-07-12"
  const picked = pickDailyRandom(PERFUMES, 4, todayKey);

  grid.innerHTML = picked
    .map(
      (perfume) => `
        <li class="today-card">
          <a href="product-detail.html?id=${perfume.id}" class="today-card__link">
            <img
              class="today-card__image"
              src="${perfume.image}"
              alt="${perfume.name} 향수 이미지"
              loading="lazy"
            />
            <!-- 기본 상태에서 항상 보이는 이름 (하단 스크림 위) -->
            <span class="today-card__label">${perfume.name}</span>

            <!-- 호버 시 나타나는 오버레이 : 이름 → 디바이더 → 태그라인 → 가격 순 위계 -->
            <div class="today-card__overlay">
              <p class="today-card__overlay-name">${perfume.name}</p>
              <span class="today-card__divider" aria-hidden="true"></span>
              <p class="today-card__tagline">${perfume.tagline}</p>
              <span class="today-card__price">${formatPrice(perfume.price)}</span>
            </div>
          </a>
        </li>
      `
    )
    .join("");
}

// 문자열을 32비트 정수로 변환하는 간단한 해시 함수 (날짜 문자열을 시드로 바꾸는 용도)
function hashStringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 32비트 정수로 유지
  }
  return hash;
}

// 시드가 같으면 항상 같은 순서를 만드는 결정론적 난수 생성기 (mulberry32)
function createSeededRandom(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// seedKey(날짜 문자열)를 기준으로 list에서 count개를 무작위로 뽑아 반환합니다.
function pickDailyRandom(list, count, seedKey) {
  const random = createSeededRandom(hashStringToSeed(seedKey));
  const shuffled = [...list];

  // 시드 기반 Fisher-Yates 셔플
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

/* ==========================================================================
   Product Grid + 필터
   ========================================================================== */
function initCollectionPage() {
  const grid = document.getElementById("productGrid");
  const emptyMessage = document.getElementById("productGridEmpty");
  if (!grid) return;

  // 현재 적용 중인 필터 상태
  const filters = {
    category: "all", // "all" | "new" | "best" | "memory"
    scent: new Set(), // 향 노트 (여러 개 선택 가능, OR 조건)
    collectionId: null, // "기억으로 찾기" 칩(컬렉션 이름)에서 하나만 선택됨
  };

  /* ---------- URL 쿼리스트링으로 진입한 경우 (상세페이지 등에서 넘어옴) ---------- */
  const params = new URLSearchParams(window.location.search);
  const collectionFromUrl = params.get("collection");
  if (collectionFromUrl) {
    filters.collectionId = collectionFromUrl;
  }

  /* ---------- 상품 목록을 현재 필터 조건에 맞게 걸러서 렌더링 ---------- */
  function render() {
    const filtered = PERFUMES.filter((perfume) => {
      const matchCategory = filters.category === "all" || perfume.badges.includes(filters.category);
      const matchScent =
        filters.scent.size === 0 || perfume.scentTags.some((tag) => filters.scent.has(tag));
      const matchCollection = !filters.collectionId || perfume.collectionId === filters.collectionId;

      return matchCategory && matchScent && matchCollection;
    });

    grid.innerHTML = filtered.map(buildProductCardHTML).join("");
    emptyMessage.hidden = filtered.length > 0;

    renderActiveCollectionTag();
  }

  /* ---------- 컬렉션 필터가 적용 중일 때 상단에 안내 태그 표시 ---------- */
  function renderActiveCollectionTag() {
    const tag = document.getElementById("activeCollectionTag");
    const label = document.getElementById("activeCollectionLabel");
    if (!tag || !label) return;

    if (!filters.collectionId) {
      tag.hidden = true;
      return;
    }

    const collection = COLLECTIONS.find((item) => item.id === filters.collectionId);
    label.textContent = `${collection ? collection.name : filters.collectionId} 컬렉션만 보는 중`;
    tag.hidden = false;
  }

  // 컬렉션 칩(collectionChips)의 눌림 상태를 filters.collectionId와 맞춰줍니다.
  function syncCollectionChips() {
    document.querySelectorAll("#collectionChips .filter-chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.collectionId === filters.collectionId));
    });
  }

  /* ---------- 1) 기억으로 찾기 = 컬렉션 필터 (단일 선택, 다시 누르면 해제) ---------- */
  const collectionChips = document.getElementById("collectionChips");
  collectionChips.addEventListener("click", (event) => {
    const chip = event.target.closest(".filter-chip");
    if (!chip) return;

    const isActive = chip.getAttribute("aria-pressed") === "true";
    filters.collectionId = isActive ? null : chip.dataset.collectionId;

    syncCollectionChips();
    render();
  });

  document.getElementById("clearCollectionFilter")?.addEventListener("click", () => {
    filters.collectionId = null;
    syncCollectionChips();
    render();
  });

  /* ---------- 2) 카테고리 필터 (단일 선택) ---------- */
  const categoryChips = document.getElementById("categoryChips");
  categoryChips.addEventListener("click", (event) => {
    const chip = event.target.closest(".filter-chip");
    if (!chip) return;

    // 같은 그룹 안에서는 하나만 활성화되도록 나머지를 모두 끕니다.
    categoryChips.querySelectorAll(".filter-chip").forEach((el) => el.setAttribute("aria-pressed", "false"));
    chip.setAttribute("aria-pressed", "true");

    filters.category = chip.dataset.category;
    render();
  });

  /* ---------- 3) 향으로 찾기 (다중 선택, 토글) ---------- */
  const scentChips = document.getElementById("scentChips");
  scentChips.addEventListener("click", (event) => {
    const chip = event.target.closest(".filter-chip");
    if (!chip) return;

    const value = chip.dataset.scent;
    const isActive = chip.getAttribute("aria-pressed") === "true";

    chip.setAttribute("aria-pressed", String(!isActive));
    if (isActive) {
      filters.scent.delete(value);
    } else {
      filters.scent.add(value);
    }
    render();
  });

  /* ---------- 4) 필터 초기화 ---------- */
  document.getElementById("resetFilters").addEventListener("click", () => {
    filters.category = "all";
    filters.scent.clear();
    filters.collectionId = null;

    document.querySelectorAll(".filter-chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
    document.querySelector('.filter-chip[data-category="all"]').setAttribute("aria-pressed", "true");

    render();
  });

  /* ---------- 5) 상품 카드의 찜 / 장바구니 버튼 (이벤트 위임) ---------- */
  grid.addEventListener("click", (event) => {
    const wishBtn = event.target.closest(".product-card__wish");
    const cartBtn = event.target.closest(".product-card__cart");

    if (wishBtn) {
      event.preventDefault(); // <a> 태그 안에 있으므로 페이지 이동 방지
      const nowWished = Store.toggleWishlist(wishBtn.dataset.id);
      Store.showToast(nowWished ? "찜 목록에 추가했어요" : "찜 목록에서 제거했어요");
      render();
      return;
    }

    if (cartBtn) {
      event.preventDefault();
      Store.addToCart(cartBtn.dataset.id, 1);
      Store.showToast("장바구니에 담았어요");
    }
  });

  syncCollectionChips();
  render();
}
