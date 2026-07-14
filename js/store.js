/* 경로: js/store.js */

/**
 * 찜(Wishlist)과 장바구니(Cart)를 localStorage에 저장/조회하는 공용 유틸입니다.
 * collection.js, product-detail.js, wishlist.js, cart.js가 모두 이 파일을 공유합니다.
 *
 * 전역 오염을 최소화하기 위해 모든 기능을 "Store"라는 하나의 객체 안에 담습니다.
 */
const Store = (() => {
  const WISHLIST_KEY = "moment_wishlist"; // 저장 형태: 상품 id 문자열 배열
  const CART_KEY = "moment_cart"; // 저장 형태: { id, qty } 객체 배열

  /* ---------- 공통 : localStorage 읽기/쓰기 ---------- */
  function readList(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  /* ---------- 찜(Wishlist) ---------- */
  function getWishlist() {
    return readList(WISHLIST_KEY);
  }

  function isInWishlist(id) {
    return getWishlist().includes(id);
  }

  // 찜 상태를 토글하고, 토글 후의 상태(true=찜됨)를 반환합니다.
  function toggleWishlist(id) {
    const list = getWishlist();
    const index = list.indexOf(id);
    if (index === -1) {
      list.push(id);
      writeList(WISHLIST_KEY, list);
      return true;
    }
    list.splice(index, 1);
    writeList(WISHLIST_KEY, list);
    return false;
  }

  function removeFromWishlist(id) {
    writeList(WISHLIST_KEY, getWishlist().filter((itemId) => itemId !== id));
  }

  /* ---------- 장바구니(Cart) ---------- */
  function getCart() {
    return readList(CART_KEY);
  }

  function addToCart(id, qty = 1) {
    const cart = getCart();
    const existing = cart.find((item) => item.id === id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id, qty });
    }
    writeList(CART_KEY, cart);
  }

  function updateCartQty(id, qty) {
    const cart = getCart();
    const target = cart.find((item) => item.id === id);
    if (!target) return;
    target.qty = Math.max(1, qty);
    writeList(CART_KEY, cart);
  }

  function removeFromCart(id) {
    writeList(CART_KEY, getCart().filter((item) => item.id !== id));
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
  }

  /* ---------- 토스트 알림 (찜/장바구니 담김 피드백) ---------- */
  // 페이지에 markup을 추가할 필요 없이, 필요한 순간에 JS가 알아서 만들고 지웁니다.
  let toastTimer = null;
  function showToast(message) {
    let toast = document.getElementById("momentToast");
    if (!toast) {
      toast = document.createElement("p");
      toast.id = "momentToast";
      toast.className = "moment-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  /* ---------- 공유한 기억(Share Your Memory) ---------- */
  // memory-story.html의 Share Your Memory 폼과 archive.html의 Shared Memories가
  // 함께 읽고 쓰는 저장소입니다. 마이페이지에서 수정/삭제하면 이 키를 그대로
  // 갱신하기 때문에 Archive 화면에도 자동으로 반영됩니다.
  const SHARED_STORIES_KEY = "moment_shared_stories"; // 저장 형태: [{ id, title, content, emotion, authorEmail, createdAt }]

  function getSharedStories() {
    return readList(SHARED_STORIES_KEY);
  }

  // 로그인한 사용자 본인이 남긴 기억만 골라서 반환합니다 (마이페이지 전용).
  function getMySharedStories() {
    const user = getCurrentUser();
    if (!user) return [];
    return getSharedStories().filter((story) => story.authorEmail === user.email);
  }

  function addSharedStory({ title, content, emotion }) {
    const user = getCurrentUser();
    const stories = getSharedStories();
    const story = {
      id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      content,
      emotion,
      authorEmail: user ? user.email : null,
      createdAt: Date.now(),
    };
    stories.unshift(story);
    writeList(SHARED_STORIES_KEY, stories);
    return story;
  }

  // 마이페이지의 "수정하기"에서 사용 : id로 찾아 내용만 교체합니다.
  function updateSharedStory(id, { title, content, emotion }) {
    const stories = getSharedStories();
    const target = stories.find((story) => story.id === id);
    if (!target) return null;

    target.title = title;
    target.content = content;
    target.emotion = emotion;
    target.updatedAt = Date.now();
    writeList(SHARED_STORIES_KEY, stories);
    return target;
  }

  function deleteSharedStory(id) {
    writeList(SHARED_STORIES_KEY, getSharedStories().filter((story) => story.id !== id));
  }

  /* ---------- 문의(Send a Message) ---------- */
  // contact.html의 Send a Message 폼이 저장하고, 마이페이지의 "문의 내역"에서
  // 본인이 남긴 문의만 걸러서 보여줍니다. 실제 서버가 없어 답변(answer)은
  // 항상 비어 있는 데모 상태(status: "pending")로 시작합니다.
  const INQUIRIES_KEY = "moment_inquiries"; // 저장 형태: [{ id, type, name, email, subject, message, authorEmail, status, answer, createdAt }]

  function getInquiries() {
    return readList(INQUIRIES_KEY);
  }

  function getMyInquiries() {
    const user = getCurrentUser();
    if (!user) return [];
    return getInquiries().filter((inquiry) => inquiry.authorEmail === user.email);
  }

  function addInquiry({ type, name, email, subject, message }) {
    const user = getCurrentUser();
    const inquiries = getInquiries();
    const inquiry = {
      id: `inquiry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      name,
      email,
      subject,
      message,
      authorEmail: user ? user.email : null,
      status: "pending", // "pending"(답변대기) | "answered"(답변완료)
      answer: null,
      createdAt: Date.now(),
    };
    inquiries.unshift(inquiry);
    writeList(INQUIRIES_KEY, inquiries);
    return inquiry;
  }

  function deleteInquiry(id) {
    writeList(INQUIRIES_KEY, getInquiries().filter((inquiry) => inquiry.id !== id));
  }

  /* ---------- 회원(Auth) ---------- */
  const USERS_KEY = "moment_users"; // 저장 형태: [{ name, email, password }]
  const CURRENT_USER_KEY = "moment_current_user"; // 현재 로그인된 사용자의 email

  function getUsers() {
    return readList(USERS_KEY);
  }

  function findUserByEmail(email) {
    return getUsers().find((user) => user.email === email) || null;
  }

  // 회원가입 : 이미 등록된 이메일이면 실패를 반환합니다.
  function registerUser({ name, email, password }) {
    const users = getUsers();
    if (users.some((user) => user.email === email)) {
      return { success: false, message: "이미 가입된 이메일입니다." };
    }
    users.push({ name, email, password });
    writeList(USERS_KEY, users);
    return { success: true };
  }

  // 로그인 : 이메일 + 비밀번호가 일치하면 현재 로그인 사용자로 기록합니다.
  function loginUser(email, password) {
    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      return { success: false, message: "이메일 또는 비밀번호가 일치하지 않습니다." };
    }
    localStorage.setItem(CURRENT_USER_KEY, email);
    return { success: true, user };
  }

  function logoutUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  function getCurrentUser() {
    const email = localStorage.getItem(CURRENT_USER_KEY);
    return email ? findUserByEmail(email) : null;
  }

  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  return {
    getWishlist,
    isInWishlist,
    toggleWishlist,
    removeFromWishlist,
    getCart,
    addToCart,
    updateCartQty,
    removeFromCart,
    getCartCount,
    showToast,
    // 공유한 기억(Share Your Memory) 관련 함수
    getSharedStories,
    getMySharedStories,
    addSharedStory,
    updateSharedStory,
    deleteSharedStory,
    // 문의(Send a Message) 관련 함수
    getInquiries,
    getMyInquiries,
    addInquiry,
    deleteInquiry,
    // 회원(Auth) 관련 함수
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    isLoggedIn,
  };
})();
