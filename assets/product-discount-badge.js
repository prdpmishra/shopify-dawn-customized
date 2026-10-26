if (!window.productDiscountBadgeSubscription) {
  window.productDiscountBadgeSubscription = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
    const badge = document.querySelector(
      `.product-discount-badge[data-section-id="${event.data.sectionId}"]`
    );
    const variant = event.data.variant;
    if (!badge || !variant) return;

    const compareAtPrice = Number(variant.compare_at_price);
    const price = Number(variant.price);
    if (!compareAtPrice || compareAtPrice <= price) {
      badge.hidden = true;
      return;
    }

    const discount = Math.round(((compareAtPrice - price) * 100) / compareAtPrice);
    if (discount <= 0) {
      badge.hidden = true;
      return;
    }

    const label = badge.dataset.labelTemplate.replace('__PERCENTAGE__', discount);
    badge.textContent = label;
    badge.setAttribute('aria-label', label);
    badge.hidden = false;
  });
}
