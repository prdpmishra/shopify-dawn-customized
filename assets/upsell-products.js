if (!customElements.get('upsell-products')) {
  customElements.define(
    'upsell-products',
    class UpsellProducts extends HTMLElement {
      constructor() {
        super();

        this.totalAmount = this.querySelector('[data-upsell-total]');
        this.submitButton = this.querySelector('.upsell-products__submit');
        this.submitLabel = this.submitButton.querySelector('[data-submit-label]');
        this.currentItem = this.querySelector('[data-current-item]');
        this.currentThumbnail = this.querySelector('[data-current-thumbnail]');
        this.errorMessageWrapper = this.querySelector('.upsell-products__error-message-wrapper');
        this.errorMessage = this.errorMessageWrapper.querySelector('.upsell-products__error-message');
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.onQuantityChangeHandler = this.onQuantityChange.bind(this);
        this.addEventListener('change', this.onChange.bind(this));
        this.submitButton.addEventListener('click', this.onSubmitHandler.bind(this));

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');
      }

      connectedCallback() {
        this.onVariantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, this.onVariantChange.bind(this));

        this.quantityInput = document.getElementById(`Quantity-${this.dataset.sectionId}`);
        this.quantityInput?.addEventListener('change', this.onQuantityChangeHandler);
        this.onQuantityChange();
      }

      disconnectedCallback() {
        this.onVariantChangeUnsubscriber?.();
        this.quantityInput?.removeEventListener('change', this.onQuantityChangeHandler);
      }

      onChange(event) {
        const item = event.target.closest('[data-upsell-item]');
        if (!item) return;

        if (event.target.matches('[data-upsell-checkbox]')) {
          this.toggleItem(item, event.target.checked);
        } else if (event.target.matches('[data-upsell-variant-select]')) {
          this.updateItemVariant(item, event.target.selectedOptions[0]);
        }

        this.updateTotal();
      }

      onSubmitHandler(evt) {
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        const items = this.cartItems;
        if (items.length === 0) return;

        this.handleErrorMessage();
        this.toggleLoading(true);

        const body = { items };
        if (this.cart) {
          body.sections = this.cart.getSectionsToRender().map((section) => section.id);
          body.sections_url = window.location.pathname;
          this.cart.setActiveElement(document.activeElement);
        }

        const config = fetchConfig();
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.body = JSON.stringify(body);

        const linesUpdateDeferred = this.createCartLinesUpdateEvent(items);

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              const message = response.description || response.message;
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'upsell-products',
                productVariantId: items[0].id,
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(message);
              this.dispatchCartErrorEvent(message, 'INVALID');
              linesUpdateDeferred?.reject(new Error(message));
              return;
            }

            this.resolveCartLinesUpdate(linesUpdateDeferred);

            if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'upsell-products',
              productVariantId: items[0].id,
              cartData: response,
            });

            // Cart notification shows the line matching `key`, which a multi-item response doesn't have.
            CartPerformance.measure('add:paint-updated-sections', () => {
              this.cart.renderContents({ ...response, key: response.items[0]?.key });
            });
          })
          .catch((e) => {
            console.error(e);
            this.handleErrorMessage(window.cartStrings.error);
            this.dispatchCartErrorEvent(e.message || 'Network error', 'SERVICE_UNAVAILABLE');
            linesUpdateDeferred?.reject(e);
          })
          .finally(() => {
            this.toggleLoading(false);
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');

            CartPerformance.measureFromEvent('add:user-action', evt);
          });
      }

      toggleLoading(loading) {
        if (loading) {
          this.submitButton.setAttribute('aria-disabled', true);
        } else {
          this.submitButton.removeAttribute('aria-disabled');
        }
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.querySelector('.loading__spinner').classList.toggle('hidden', !loading);
      }

      handleErrorMessage(errorMessage = false) {
        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
        if (errorMessage) this.errorMessage.textContent = errorMessage;
      }

      createCartLinesUpdateEvent(items) {
        const { CartLinesUpdateEvent } = window.StandardEvents || {};
        if (!CartLinesUpdateEvent) return null;

        const deferred = CartLinesUpdateEvent.createPromise();
        this.dispatchEvent(
          new CartLinesUpdateEvent({
            action: 'add',
            context: 'product',
            lines: items.map((item) => ({ merchandiseId: String(item.id), quantity: item.quantity })),
            promise: deferred.promise,
          })
        );
        return deferred;
      }

      resolveCartLinesUpdate(deferred) {
        if (!deferred) return;
        const { CartLinesUpdateEvent } = window.StandardEvents || {};
        if (!CartLinesUpdateEvent) return;

        const pendingCartDataPromise =
          typeof CartItems !== 'undefined'
            ? CartItems.fetchCartData()
            : fetch(`${routes.cart_url}.json`).then((response) => response.json());

        pendingCartDataPromise
          .then((cart) => {
            if (!cart?.currency) return deferred.reject(new Error('Missing currency in cart response'));
            deferred.resolve({ cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart) });
          })
          .catch((e) => deferred.reject(e));
      }

      dispatchCartErrorEvent(message, code) {
        const { CartErrorEvent } = window.StandardEvents || {};
        if (!CartErrorEvent) return;
        this.dispatchEvent(new CartErrorEvent({ error: message, code }));
      }

      onVariantChange({ data: { sectionId, html, variant } }) {
        if (sectionId !== this.dataset.sectionId) return;

        // Quick add modals publish with the same section ID, so check the update is for this product.
        const productInfo = html?.querySelector(`[id="MainProduct-${sectionId}"]`);
        if (productInfo?.dataset.productId !== this.dataset.productId) return;

        this.updateCurrentItem(variant);
        this.onQuantityChange();
      }

      onQuantityChange() {
        const quantity = Math.max(parseInt(this.quantityInput?.value) || 1, 1);

        this.currentItem.dataset.quantity = quantity;
        this.renderItemPrice(this.currentItem);
        this.renderQuantityLabel(quantity);
        this.updateTotal();
      }

      toggleItem(item, selected) {
        const select = item.querySelector('[data-upsell-variant-select]');
        if (select) select.disabled = !selected;

        this.querySelector(`[data-upsell-thumbnail="${item.dataset.productId}"]`)?.classList.toggle(
          'upsell-products__thumbnail--excluded',
          !selected
        );
      }

      updateItemVariant(item, option) {
        item.dataset.variantId = option.value;
        item.dataset.price = option.dataset.price;
        item.dataset.compareAtPrice = option.dataset.compareAtPrice;
        this.renderItemPrice(item);

        const thumbnail = this.querySelector(`[data-upsell-thumbnail="${item.dataset.productId}"]`);
        if (thumbnail) this.updateThumbnailImage(thumbnail, option.dataset.image);
      }

      updateCurrentItem(variant) {
        const available = Boolean(variant?.available);
        this.currentItem.hidden = !available;
        this.currentThumbnail.hidden = !available;
        if (!variant) return;

        this.currentItem.dataset.variantId = variant.id;
        this.currentItem.dataset.price = variant.price;
        this.currentItem.dataset.compareAtPrice = variant.compare_at_price || 0;

        const variantTitle = this.currentItem.querySelector('[data-variant-title]');
        if (variantTitle) variantTitle.textContent = variant.title;

        this.updateThumbnailImage(
          this.currentThumbnail,
          variant.featured_image?.src || variant.featured_media?.preview_image?.src
        );
      }

      updateThumbnailImage(thumbnail, src) {
        const image = thumbnail.querySelector('img');
        const imageSrc = src || thumbnail.dataset.fallbackSrc;
        if (!image || !imageSrc) return;

        image.srcset = `${this.getImageUrl(imageSrc, 80)} 80w, ${this.getImageUrl(imageSrc, 160)} 160w`;
        image.src = this.getImageUrl(imageSrc, 160);
      }

      getImageUrl(src, width) {
        const url = new URL(src, window.location.origin);
        url.searchParams.set('width', width);
        return url.toString();
      }

      renderItemPrice(item) {
        const quantity = parseInt(item.dataset.quantity);
        const price = parseInt(item.dataset.price) * quantity;
        const compareAtPrice = (parseInt(item.dataset.compareAtPrice) || 0) * quantity;
        const onSale = compareAtPrice > price;

        item.querySelector('[data-price-amount]').textContent = this.formatMoney(price);
        item.querySelector('[data-compare-price]').hidden = !onSale;
        item.querySelector('[data-sale-price-label]').hidden = !onSale;
        if (onSale) item.querySelector('[data-compare-price-amount]').textContent = this.formatMoney(compareAtPrice);
      }

      renderQuantityLabel(quantity) {
        const label = this.currentItem.querySelector('[data-quantity-label]');
        label.textContent = label.dataset.quantityTemplate.replace('[quantity]', quantity);
        label.hidden = quantity <= 1;
      }

      updateTotal() {
        const selectedItems = this.selectedItems;
        const total = selectedItems.reduce(
          (sum, item) => sum + parseInt(item.dataset.price) * parseInt(item.dataset.quantity),
          0
        );
        this.totalAmount.textContent = this.formatMoney(total);
        this.updateSubmitButton(selectedItems.length);
      }

      updateSubmitButton(count) {
        const { labelOne, labelTwo, labelAll } = this.submitButton.dataset;

        if (count <= 1) {
          this.submitLabel.textContent = labelOne;
        } else if (count === 2) {
          this.submitLabel.textContent = labelTwo;
        } else {
          this.submitLabel.textContent = labelAll.replace('[count]', count);
        }

        this.submitButton.toggleAttribute('disabled', count === 0);
      }

      // Formats cents the same way as Liquid's `money` filter, by copying the
      // separators and decimals from a sample amount the snippet formats in Liquid.
      formatMoney(cents) {
        const sample = this.dataset.moneySample;
        const sampleNumber = sample.match(/\d[\d.,'\s]*\d|\d/)[0];
        const groups = sampleNumber.split(/[^\d]+/);
        const separators = sampleNumber.replace(/\d/g, '');
        const hasDecimals = groups.length > 1 && groups[groups.length - 1].length === 2;
        const decimalSeparator = hasDecimals ? separators.slice(-1) : '';
        const thousandsSeparator = (hasDecimals ? separators.slice(0, -1) : separators).charAt(0);

        const [integer, fraction] = (cents / 100).toFixed(hasDecimals ? 2 : 0).split('.');
        const amount =
          integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator) + (fraction ? decimalSeparator + fraction : '');

        return sample.replace(sampleNumber, amount);
      }

      get cartItems() {
        return this.selectedItems.map((item) => {
          const cartItem = { id: parseInt(item.dataset.variantId), quantity: parseInt(item.dataset.quantity) };
          if (item === this.currentItem) Object.assign(cartItem, this.mainFormLineItemOptions);
          return cartItem;
        });
      }

      // Carries the main form's selling plan and line item properties (such as gift card
      // recipient fields) over to the current product, as Dawn's product form would send them.
      get mainFormLineItemOptions() {
        const form = document.getElementById(`product-form-${this.dataset.sectionId}`);
        if (!form) return {};

        const formData = new FormData(form);
        const options = {};
        const properties = {};

        if (formData.get('selling_plan')) options.selling_plan = formData.get('selling_plan');
        for (const [name, value] of formData) {
          const property = name.match(/^properties\[(.+)\]$/);
          if (property && typeof value === 'string' && value !== '') properties[property[1]] = value;
        }
        if (Object.keys(properties).length > 0) options.properties = properties;

        return options;
      }

      get selectedItems() {
        return Array.from(this.querySelectorAll('[data-upsell-item]')).filter((item) => {
          if (item.hidden) return false;
          const checkbox = item.querySelector('[data-upsell-checkbox]');
          return !checkbox || checkbox.checked;
        });
      }
    }
  );
}
