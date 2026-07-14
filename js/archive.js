/* 경로: js/archive.js */

/**
 * archive.html 전용 로직입니다. 크게 네 부분으로 나뉩니다.
 * 1) Category 탭 필터 : All / Shared Memories / 공지 / 이벤트 / 브랜드 저널
 *    - 탭이 바뀔 때마다 섹션 표시 여부, Shared Memories의 노출 범위(3개 vs 전체+페이지네이션),
 *      Notice & Event의 제목과 노출 범위를 함께 갱신합니다.
 * 2) Shared Memories 렌더링 : 브랜드 샘플 이야기 + 방문자가 남긴 실제 기억(localStorage)
 * 3) Notice & Event 렌더링 : 공지/이벤트 데이터를 카드로 그리고, 클릭 시 모달을 띄웁니다.
 * 4) 모달 2종 : Story 상세 모달(#storyModal), Notice/Event 상세 모달(#infoModal)
 *
 * ⚠️ perfumes-data.js, store.js가 이 파일보다 먼저 로드되어야 합니다.
 */

const MEMORIES_PER_PAGE = 6; // Shared Memories 탭(전체보기)에서 한 페이지에 보여줄 카드 수
let currentTab = "all";
let currentMemoryPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  initStoryModal();
  initInfoModal();
  initCategoryTabs();
  initFeaturedStory();
  initSharedMemories();
  initNoticeEvent();

  // 초기 화면(All 탭) 렌더링
  activateTab("all");
});

/* ==========================================================================
   1. CATEGORY 탭 필터
   -------------------------------------------------------------------------
   - 각 섹션(.archive-section)에는 data-tab-groups 속성으로 "이 섹션을 보여줄
     탭 이름들"이 공백으로 구분되어 있습니다. (예: "all shared")
   - 탭이 바뀌면 섹션 표시/숨김뿐 아니라, Shared Memories / Notice & Event의
     내부 렌더링(renderMemoryGrid, renderNoticeEvent)도 함께 갱신합니다.
   ========================================================================== */
function initCategoryTabs() {
  const tabsEl = document.getElementById("categoryTabs");
  if (!tabsEl) return;

  tabsEl.addEventListener("click", (event) => {
    const tabBtn = event.target.closest(".category-tab");
    if (!tabBtn) return;
    activateTab(tabBtn.dataset.tab);
  });

  // Shared Memories / Notice & Event 섹션의 "더보기" 버튼도 탭 전환과 동일하게 동작합니다.
  document.querySelectorAll("[data-goto-tab]").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.gotoTab));
  });
}

/**
 * 탭을 활성화하고, 관련된 모든 화면 요소를 다시 그립니다.
 * @param {string} tab - "all" | "shared" | "notice" | "event" | "journal"
 */
function activateTab(tab) {
  currentTab = tab;
  currentMemoryPage = 1; // 탭이 바뀌면 페이지네이션은 항상 1페이지부터 다시 시작

  // 탭 버튼 스타일 갱신
  document.querySelectorAll(".category-tab").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.tab === tab));
  });

  // 섹션 표시/숨김
  const sections = document.querySelectorAll(".archive-section");
  let visibleCount = 0;
  sections.forEach((section) => {
    const groups = section.dataset.tabGroups.split(" ");
    const visible = groups.includes(tab);
    section.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  const emptyMessage = document.getElementById("archiveEmpty");
  if (emptyMessage) emptyMessage.hidden = visibleCount > 0;

  renderMemoryGrid();
  renderNoticeEvent();
}

/* ==========================================================================
   2. STORY DETAIL 모달 (Featured Story / Shared Memories 공용)
   -------------------------------------------------------------------------
   - window.openStoryModal(story)를 호출하면 전달받은 데이터로 채워 넣고 엽니다.
   - story 객체 형태 : { tag, title, date, body(배열), scentName, collectionId, reason }
   ========================================================================== */
function initStoryModal() {
  const modal = document.getElementById("storyModal");
  const closeBtn = document.getElementById("storyModalClose");
  if (!modal) return;

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

  window.openStoryModal = function openStoryModal(story) {
    document.getElementById("storyModalTag").textContent = story.tag;
    document.getElementById("storyModalTitle").textContent = story.title;
    document.getElementById("storyModalDate").textContent = story.date || "";

    document.getElementById("storyModalBody").innerHTML = story.body
      .map((line) => `<p>${line}</p>`)
      .join("");

    document.getElementById("storyModalScent").textContent = story.scentName;
    document.getElementById("storyModalReason").textContent = story.reason;

    const collectionLink = document.getElementById("storyModalCollectionLink");
    collectionLink.href = story.collectionId
      ? `collection.html?collection=${story.collectionId}`
      : "collection.html";

    open();
  };
}

/* ==========================================================================
   3. INFO 모달 (공지 / 이벤트 공용)
   -------------------------------------------------------------------------
   - window.openInfoModal(item)를 호출하면 전달받은 데이터로 채워 넣고 엽니다.
   - item 객체 형태 : { tag, title, date, body(배열), cta?: { label, href } }
   ========================================================================== */
function initInfoModal() {
  const modal = document.getElementById("infoModal");
  const closeBtn = document.getElementById("infoModalClose");
  if (!modal) return;

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

  window.openInfoModal = function openInfoModal(item) {
    document.getElementById("infoModalTag").textContent = item.tag;
    document.getElementById("infoModalTitle").textContent = item.title;
    document.getElementById("infoModalDate").textContent = item.date || "";
    document.getElementById("infoModalBody").innerHTML = item.body.map((line) => `<p>${line}</p>`).join("");

    const ctaEl = document.getElementById("infoModalCta");
    if (item.cta) {
      ctaEl.hidden = false;
      ctaEl.textContent = item.cta.label;
      ctaEl.href = item.cta.href;
    } else {
      ctaEl.hidden = true;
    }

    open();
  };
}

/* ==========================================================================
   4. FEATURED STORY (Editor's Pick)
   ========================================================================== */
function initFeaturedStory() {
  const btn = document.getElementById("featuredReadMore");
  if (!btn) return;

  btn.addEventListener("click", () => {
    window.openStoryModal({
      tag: "Editor's Pick",
      title: "노을 진 퇴근길에 떠오른 여행",
      date: "",
      body: [
        "오늘도 퇴근길 버스에서 창밖으로 노을을 바라봤다.",
        "그 순간 문득 몇 년 전 여행이 떠올랐다.",
        "낯선 도시의 골목, 처음 보는 하늘빛.",
        "잊고 지냈던 그날의 공기가 다시 스며드는 기분이었다.",
      ],
      scentName: "ECHO",
      collectionId: "love",
      reason: "당신의 기억은 Love 컬렉션과 가장 잘 어울립니다.",
    });
  });
}

/* ==========================================================================
   5. SHARED MEMORIES
   -------------------------------------------------------------------------
   - ARCHIVE_SEED_STORIES : 브랜드가 미리 준비한 샘플 이야기 3개 (고정 데이터)
   - Store.getSharedStories() : memory-story.html의 Share Your Memory 폼이
     저장한 실제 방문자 기억(localStorage: moment_shared_stories).
     마이페이지에서 수정/삭제하면 이 storage가 그대로 바뀌기 때문에
     Archive를 새로고침하면 최신 내용이 그대로 반영됩니다.
   ========================================================================== */

// 감정(컬렉션) 값 → 카드에 쓰일 이모지. memory-story.html의 감정 칩과 동일한 매핑입니다.
const EMOTION_EMOJI = {
  healing: "🌿",
  love: "💌",
  "new-beginning": "🌅",
  nostalgia: "🍂",
};

// 브랜드가 준비한 샘플 이야기 (고정 데이터)
const ARCHIVE_SEED_STORIES = [
  {
    id: "seed-rain-afternoon",
    emoji: "🌿",
    title: "비 오는 오후",
    body: [
      "퇴근하고 집에 와서 창문을 열었다.",
      "빗소리를 들으며 마신 따뜻한 커피.",
      "평범한 하루였지만 오래 기억하고 싶은 순간이었다.",
    ],
    scentName: "RAIN",
    collectionId: "healing",
    likes: 12,
  },
  {
    id: "seed-first-love",
    emoji: "💌",
    title: "첫사랑",
    body: ["벚꽃 아래 처음 손을 잡았던 날.", "말없이 걷기만 해도 좋았던 봄밤.", "그 계절의 온도가 아직도 선명하다."],
    scentName: "LETTER",
    collectionId: "love",
    likes: 89,
  },
  {
    id: "seed-new-start",
    emoji: "🌅",
    title: "새로운 시작",
    body: ["첫 출근 날.", "긴장보다 설렘이 더 컸다.", "낯선 사무실의 냄새마저 새로웠던 아침."],
    scentName: "DAWN",
    collectionId: "new-beginning",
    likes: 205,
  },
];

const LIKES_STORAGE_KEY = "moment_archive_likes"; // { storyId: count }
const LIKED_IDS_STORAGE_KEY = "moment_archive_liked_ids"; // [storyId, ...] 내가 좋아요 누른 카드

// 방문자가 남긴 실제 기억은 store.js의 Store.getSharedStories()가 관리합니다
// (memory-story.html에서 작성 → 마이페이지에서 수정/삭제 → 이곳에 그대로 반영).

/* ---------- 컬렉션에서 평점이 가장 높은 향수 하나를 대표로 추천 ---------- */
function getRepresentativePerfume(collectionId) {
  const candidates = PERFUMES.filter((perfume) => perfume.collectionId === collectionId);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) => (current.rating > best.rating ? current : best));
}

/* ---------- 컬렉션 id → 화면에 보여줄 컬렉션 이름 ---------- */
function getCollectionName(collectionId) {
  const collection = COLLECTIONS.find((item) => item.id === collectionId);
  return collection ? collection.name : collectionId;
}

/* ---------- 좋아요 수 / 좋아요 여부 localStorage 읽기·쓰기 ---------- */
function readLikeCounts() {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLikeCounts(counts) {
  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(counts));
}

function readLikedIds() {
  try {
    const raw = localStorage.getItem(LIKED_IDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLikedIds(ids) {
  localStorage.setItem(LIKED_IDS_STORAGE_KEY, JSON.stringify(ids));
}

// 현재 좋아요 수(localStorage에 값이 있으면 그 값, 없으면 카드의 기본값)를 반환합니다.
function getLikeCount(story, counts) {
  return counts[story.id] ?? story.likes;
}

/* ---------- 샘플 이야기 + 방문자 기억을 하나의 배열로 합치기 (최신순) ---------- */
function buildMemoryList() {
  const userStories = Store.getSharedStories()
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((story, index) => {
      const perfume = getRepresentativePerfume(story.emotion);
      return {
        // story.id : 마이페이지에서 수정/삭제할 때 기준이 되는 고유 id (store.js가 생성).
        // 혹시 예전 방식으로 저장되어 id가 없는 데이터가 남아있어도 안전하게 대체합니다.
        id: story.id || `user-${story.createdAt || index}`,
        emoji: EMOTION_EMOJI[story.emotion] || "🕊",
        title: story.title,
        body: [story.content],
        scentName: perfume ? perfume.name : "MOMENT",
        collectionId: story.emotion,
        likes: 0,
        date: story.createdAt ? new Date(story.createdAt).toISOString().slice(0, 10).replace(/-/g, ".") : "",
      };
    });

  // 방문자가 남긴 최신 기억이 먼저, 그 다음 브랜드 샘플 이야기가 이어집니다.
  return [...userStories, ...ARCHIVE_SEED_STORIES];
}

/* ---------- 카드 1개의 HTML ---------- */
function buildMemoryCardHTML(story, likeCount, liked) {
  return `
    <li class="memory-card" data-id="${story.id}">
      <span class="memory-card__emoji" aria-hidden="true">${story.emoji}</span>
      <h3 class="memory-card__title">${story.title}</h3>
      <p class="memory-card__quote">“${story.body[0]}”</p>
      <p class="memory-card__scent">추천 향 <em>${story.scentName}</em></p>
      <div class="memory-card__footer">
        <button
          type="button"
          class="memory-card__like"
          data-id="${story.id}"
          aria-pressed="${liked}"
          aria-label="좋아요"
        >
          <span aria-hidden="true">${liked ? "♥" : "♡"}</span>
          <span class="memory-card__like-count">${likeCount}</span>
        </button>
        <button type="button" class="memory-card__read link-underline" data-id="${story.id}">
          Read Story <span class="arrow">→</span>
        </button>
      </div>
    </li>
  `;
}

let allMemories = [];

function initSharedMemories() {
  const grid = document.getElementById("memoryGrid");
  if (!grid) return;

  allMemories = buildMemoryList();

  /* ---------- 좋아요 토글 / Read Story 클릭 (이벤트 위임) ---------- */
  grid.addEventListener("click", (event) => {
    const likeBtn = event.target.closest(".memory-card__like");
    const readBtn = event.target.closest(".memory-card__read");

    if (likeBtn) {
      if (!window.requireLogin("좋아요는 로그인 후 이용하실 수 있습니다.")) return;
      const story = allMemories.find((item) => item.id === likeBtn.dataset.id);
      if (!story) return;

      const counts = readLikeCounts();
      const likedIds = readLikedIds();
      const currentCount = getLikeCount(story, counts);
      const alreadyLiked = likedIds.includes(story.id);

      if (alreadyLiked) {
        counts[story.id] = Math.max(0, currentCount - 1);
        writeLikedIds(likedIds.filter((id) => id !== story.id));
      } else {
        counts[story.id] = currentCount + 1;
        writeLikedIds([...likedIds, story.id]);
      }
      writeLikeCounts(counts);
      renderMemoryGrid();
      return;
    }

    if (readBtn) {
      const story = allMemories.find((item) => item.id === readBtn.dataset.id);
      if (!story) return;

      window.openStoryModal({
        tag: "Shared Memory",
        title: story.title,
        date: story.date || "",
        body: story.body,
        scentName: story.scentName,
        collectionId: story.collectionId,
        reason: `당신의 기억은 ${getCollectionName(story.collectionId)} 컬렉션과 가장 잘 어울립니다.`,
      });
    }
  });

  // 페이지네이션 버튼 클릭 (이벤트 위임)
  const pagination = document.getElementById("memoryPagination");
  pagination.addEventListener("click", (event) => {
    const pageBtn = event.target.closest(".pagination__page");
    if (!pageBtn) return;

    currentMemoryPage = Number(pageBtn.dataset.page);
    renderMemoryGrid();

    // 페이지를 넘기면 다시 카드 목록 상단이 보이도록 스크롤 보정
    document.getElementById("sharedMemories").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/**
 * 현재 탭(currentTab)에 따라 Shared Memories 그리드를 다시 그립니다.
 * - "all" : 좋아요가 가장 많은 순으로 3개만, 더보기 링크 노출, 페이지네이션 없음
 * - "shared" : 전체 목록(최신순)을 6개씩 페이지네이션으로 노출
 * - 그 외 탭 : 섹션 자체가 숨겨져 있으므로 그리지 않습니다.
 */
function renderMemoryGrid() {
  const grid = document.getElementById("memoryGrid");
  const moreEl = document.getElementById("memoryMore");
  const pagination = document.getElementById("memoryPagination");
  if (!grid) return;

  if (currentTab !== "all" && currentTab !== "shared") return;

  const counts = readLikeCounts();
  const likedIds = readLikedIds();

  let itemsToShow = [];

  if (currentTab === "shared") {
    // 전체보기 : 최신순 목록을 6개씩 페이지네이션
    const totalPages = Math.max(1, Math.ceil(allMemories.length / MEMORIES_PER_PAGE));
    currentMemoryPage = Math.min(Math.max(1, currentMemoryPage), totalPages);

    const start = (currentMemoryPage - 1) * MEMORIES_PER_PAGE;
    itemsToShow = allMemories.slice(start, start + MEMORIES_PER_PAGE);

    renderPagination(totalPages);
    moreEl.hidden = true;
  } else {
    // All 탭 : 좋아요 많은 순 3개만
    itemsToShow = [...allMemories]
      .sort((a, b) => getLikeCount(b, counts) - getLikeCount(a, counts))
      .slice(0, 3);

    pagination.hidden = true;
    pagination.innerHTML = "";
    moreEl.hidden = false;
  }

  grid.innerHTML = itemsToShow
    .map((story) => buildMemoryCardHTML(story, getLikeCount(story, counts), likedIds.includes(story.id)))
    .join("");
}

/* ---------- 페이지네이션 번호 버튼 렌더링 ---------- */
function renderPagination(totalPages) {
  const pagination = document.getElementById("memoryPagination");
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.hidden = true;
    pagination.innerHTML = "";
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `
      <button
        type="button"
        class="pagination__page"
        data-page="${page}"
        aria-current="${page === currentMemoryPage}"
      >
        ${page}
      </button>
    `;
  }).join("");
}

/* ==========================================================================
   6. NOTICE & EVENT
   -------------------------------------------------------------------------
   - NOTICES / EVENTS : 실제 서비스라면 서버에서 받아올 데이터를 흉내낸 배열입니다.
   - All 탭 : 최신 공지 1개 + 최신 이벤트 1개만 노출
   - 공지/이벤트 탭 : 제목이 바뀌고 해당 카테고리 전체 목록만 노출
   - 카드를 클릭하면 페이지 이동 대신 상세 모달(#infoModal)이 열립니다.
   ========================================================================== */
const NOTICES = [
  {
    id: "notice-launch",
    type: "notice",
    tag: "Notice",
    title: "브랜드 런칭 안내",
    date: "2026.07.01",
    linkLabel: "Read",
    body: [
      "Moment가 정식으로 문을 열었습니다.",
      "기억을 향으로 기록한다는 브랜드 철학 아래, Healing / Love / New Beginning / Nostalgia 네 가지 컬렉션과 24가지 향을 준비했습니다.",
      "앞으로도 더 많은 기억과 향으로 찾아뵙겠습니다. 많은 관심 부탁드립니다.",
    ],
  },
];

const EVENTS = [
  {
    id: "event-memory-challenge",
    type: "event",
    tag: "Event",
    title: "Memory Challenge",
    date: "2026.07.10",
    linkLabel: "Join",
    desc: "당신의 가장 소중한 기억을 들려주세요.",
    body: [
      "당신의 가장 소중한 기억을 들려주세요.",
      "Memory Story 페이지의 Share Your Memory에서 기억을 남겨주신 모든 분들 중 추첨을 통해 Moment 향수를 증정합니다.",
      "참여 방법 : Memory Story > Share Your Memory에서 당신의 기억을 공유해 주세요.",
      "경품 : Moment 향수 1병 (당첨자 개별 안내)",
      "이벤트 기간 : 2026.07.10 ~ 2026.07.31",
    ],
    cta: { label: "Share Your Memory", href: "memory-story.html" },
  },
];

/* ---------- 카드 1개의 HTML (공지/이벤트 공용) ---------- */
function buildNoticeCardHTML(item) {
  return `
    <li class="notice-card" data-type="${item.type}">
      <button type="button" class="notice-card__trigger" data-id="${item.id}" data-type="${item.type}">
        <span class="notice-card__tag">${item.tag}</span>
        <p class="notice-card__title">${item.title}</p>
        ${item.desc ? `<p class="notice-card__desc">${item.desc}</p>` : ""}
        <time class="notice-card__date">${item.date}</time>
        <span class="notice-card__link">${item.linkLabel} <span class="arrow">→</span></span>
      </button>
    </li>
  `;
}

function initNoticeEvent() {
  const grid = document.getElementById("noticeEventGrid");
  if (!grid) return;

  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest(".notice-card__trigger");
    if (!trigger) return;

    const source = trigger.dataset.type === "notice" ? NOTICES : EVENTS;
    const item = source.find((entry) => entry.id === trigger.dataset.id);
    if (!item) return;

    window.openInfoModal(item);
  });
}

/**
 * 현재 탭(currentTab)에 따라 Notice & Event 섹션의 제목과 카드 목록을 다시 그립니다.
 * - "all" : 제목 "공지와 이벤트" + 최신 공지 1개 + 최신 이벤트 1개 + 더보기 링크
 * - "notice" : 제목 "공지" + 공지 전체 목록
 * - "event" : 제목 "이벤트" + 이벤트 전체 목록
 */
function renderNoticeEvent() {
  const grid = document.getElementById("noticeEventGrid");
  const titleEl = document.getElementById("noticeEventTitle");
  const moreEl = document.getElementById("noticeEventMore");
  if (!grid) return;

  if (currentTab !== "all" && currentTab !== "notice" && currentTab !== "event") return;

  let items = [];

  if (currentTab === "notice") {
    titleEl.textContent = "공지";
    items = NOTICES;
    moreEl.hidden = true;
  } else if (currentTab === "event") {
    titleEl.textContent = "이벤트";
    items = EVENTS;
    moreEl.hidden = true;
  } else {
    titleEl.textContent = "공지와 이벤트";
    items = [NOTICES[0], EVENTS[0]].filter(Boolean);
    moreEl.hidden = false;
  }

  grid.innerHTML = items.map(buildNoticeCardHTML).join("");
}
