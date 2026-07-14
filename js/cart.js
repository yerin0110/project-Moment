/* 경로: js/cart.js */

/**
 * cart.html 전용 로직입니다.
 * Store에 저장된 장바구니 항목({id, qty})을 PERFUMES 데이터와 매칭해
 * 목록/수량/합계를 렌더링합니다.
 */
document.addEventListener("DOMContentLoaded", () => {
  initCartPage();
});

function initCartPage() {
  const list = document.getElementById("cartList");
  const emptyMessage = document.getElementById("cartEmpty");
  const summary = document.getElementById("cartSummary");
  if (!list) return;

  function render() {
    const cartItems = Store.getCart()
      .map((entry) => {
        const perfume = PERFUMES.find((item) => item.id === entry.id);
        return perfume ? { ...entry, perfume } : null;
      })
      .filter(Boolean); // 삭제된 상품 id가 남아있는 경우 방지

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

    document.getElementById("cartTotalCount").textContent = `${totalCount}개`;
    document.getElementById("cartTotalPrice").textContent = formatPrice(totalPrice);
  }

  // 수량 변경 / 삭제 버튼 : 이벤트 위임으로 한 번에 처리
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

  // 데모용 결제 버튼 (실제 결제 연동 없이 UX만 구현)
  document.getElementById("checkoutBtn")?.addEventListener("click", () => {
    Store.showToast("데모 화면입니다. 실제 결제는 진행되지 않아요.");
  });

  render();
}
