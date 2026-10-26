(() => {
  const initializationKey = 'customCarouselInitialized';

  if (window[initializationKey]) return;
  window[initializationKey] = true;

  const sectionSelector = '.custom-carousel';
  const sectionInstances = new WeakMap();

  const setupCarousel = (section) => {
    const slider = section.querySelector('slider-component');
    const pagination = section.querySelector('[data-slider-pagination]');

    if (!slider || !pagination || sectionInstances.has(section)) return;

    const renderPagination = () => {
      const totalPages = slider.totalPages || 0;
      const label = pagination.dataset.label;
      const currentPage = slider.currentPage || 1;

      if (pagination.childElementCount !== totalPages) {
        pagination.replaceChildren();

        for (let index = 0; index < totalPages; index += 1) {
          const button = document.createElement('button');
          const dot = document.createElement('span');

          button.type = 'button';
          button.className = 'slider-pagination__button';
          button.setAttribute('aria-label', `${label} ${index + 1}`);
          button.addEventListener('click', () => {
            if (slider.sliderItemOffset) {
              slider.setSlidePosition(index * slider.sliderItemOffset);
            }
          });

          dot.className = 'slider-pagination__dot';
          dot.setAttribute('aria-hidden', 'true');
          button.append(dot);
          pagination.append(button);
        }
      }

      Array.from(pagination.children).forEach((button, index) => {
        if (index + 1 === currentPage) {
          button.setAttribute('aria-current', 'true');
        } else {
          button.removeAttribute('aria-current');
        }
      });
    };

    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(renderPagination));
    resizeObserver.observe(slider.slider);
    slider.addEventListener('slideChanged', renderPagination);
    requestAnimationFrame(renderPagination);

    sectionInstances.set(section, () => {
      slider.removeEventListener('slideChanged', renderPagination);
      resizeObserver.disconnect();
      sectionInstances.delete(section);
    });
  };

  const setupWithin = (target) => {
    if (target instanceof Element && target.matches(sectionSelector)) {
      setupCarousel(target);
    }

    target.querySelectorAll?.(sectionSelector).forEach(setupCarousel);
  };

  const cleanupWithin = (target) => {
    const sections = [];

    if (target instanceof Element && target.matches(sectionSelector)) {
      sections.push(target);
    }

    target.querySelectorAll?.(sectionSelector).forEach((section) => sections.push(section));
    sections.forEach((section) => sectionInstances.get(section)?.());
  };

  document.addEventListener('DOMContentLoaded', () => setupWithin(document));
  document.addEventListener('shopify:section:load', (event) => setupWithin(event.target));
  document.addEventListener('shopify:section:unload', (event) => cleanupWithin(event.target));
})();
