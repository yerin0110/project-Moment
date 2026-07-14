/* 경로: js/render-helpers.js */

/**
 * 여러 페이지에서 공통으로 쓰는 렌더링 함수 모음입니다.
 * store.js, data/perfumes-data.js보다 뒤에, collection.js/product-detail.js보다
 * 앞에 로드되어야 합니다.
 */

// 숫자를 "₩89,000" 형태로 변환합니다.
function formatPrice(price) {
  return `₩${price.toLocaleString("ko-KR")}`;
}

// 평점을 ★★★★☆ 형태의 문자열로 변환합니다.
function renderStars(rating) {
  const MAX = 5;
  let stars = "";
  for (let i = 1; i <= MAX; i += 1) {
    stars += i <= rating ? "★" : "☆";
  }
  return stars;
}

/**
 * 상품 카드 1개의 HTML을 반환합니다. (Collection Product Grid, 상세페이지의
 * "같은 컬렉션의 다른 향", 찜 목록에서 공통으로 사용)
 * - 로그인(member) 상태일 때만 CSS(css/collection.css)에서 찜/장바구니 버튼이 노출됩니다.
 * - 버튼을 <a> 태그 안에 중첩하지 않도록(웹 표준상 interactive 요소 중첩 금지),
 *   이미지 영역과 정보 영역을 각각 별도의 <a>로 감싸고, 버튼은 이미지 영역과
 *   같은 래퍼(.product-card__media) 안에서 형제 요소로 둡니다. 그래서 카드 전체가
 *   여전히 클릭 가능하면서도, 버튼은 항상 이미지 우측 하단에 정확히 붙습니다.
 */
function buildProductCardHTML(perfume) {
  const wished = Store.isInWishlist(perfume.id);
  const detailUrl = `product-detail.html?id=${perfume.id}`;

  return `
    <li class="product-card" data-id="${perfume.id}">
      <div class="product-card__media">
        <a href="${detailUrl}" class="product-card__image-link" aria-label="${perfume.name} 상세보기">
          <div class="product-card__image-wrap">
            <img
              src="${perfume.image}"
              alt="${perfume.name} 향수 이미지"
              loading="lazy"
              class="product-card__image"
            />
          </div>
        </a>

        <div class="product-card__actions">
          <button
            type="button"
            class="product-card__wish"
            data-id="${perfume.id}"
            aria-pressed="${wished}"
            aria-label="${perfume.name} 찜하기"
          >
            <span aria-hidden="true">${wished ? "❤️" : "🤍"}</span>
          </button>
          <button
            type="button"
            class="product-card__cart"
            data-id="${perfume.id}"
            aria-label="${perfume.name} 장바구니에 담기"
          >
            <span aria-hidden="true">🛒</span>
          </button>
        </div>
      </div>

      <a href="${detailUrl}" class="product-card__info-link">
        <div class="product-card__info">
          <span class="product-card__tag">${perfume.subtitle}</span>
          <span class="product-card__name">${perfume.name}</span>
          <p class="product-card__tagline">“${perfume.tagline}”</p>
          <span class="product-card__price">${formatPrice(perfume.price)}</span>
        </div>
      </a>
    </li>
  `;
}
