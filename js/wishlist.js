/* 경로: js/wishlist.js */

/**
 * wishlist.html 전용 로직입니다.
 * Store에 저장된 찜 목록 id들을 PERFUMES 데이터와 매칭해 카드로 렌더링합니다.
 */
document.addEventListener("DOMContentLoaded", () => {
  initWishlistPage();
});

function initWishlistPage() {
  const grid = document.getElementById("wishlistGrid");
  const emptyMessage = document.getElementById("wishlistEmpty");
  if (!grid) return;

  function render() {
    const wishedIds = Store.getWishlist();
    const wishedPerfumes = PERFUMES.filter((perfume) => wishedIds.includes(perfume.id));

    grid.innerHTML = wishedPerfumes.map(buildProductCardHTML).join("");
    emptyMessage.hidden = wishedPerfumes.length > 0;
  }

  // 카드 안의 찜(하트) 버튼을 다시 누르면 목록에서 바로 제거되도록 처리
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
