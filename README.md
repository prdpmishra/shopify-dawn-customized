# Fashion Demo: a customized Dawn theme

A Shopify theme for a fashion store, built by customizing Shopify's [Dawn](https://github.com/Shopify/dawn) theme (version 16.0.0). I built it to learn Shopify theme development: Liquid, section and block schemas, theme settings, translations and the theme's JavaScript.

The first commit in this repository is unmodified Dawn 16.0.0. Every commit after it is my own work, so you can see exactly what I changed with:

```sh
git diff $(git rev-list --max-parents=0 HEAD) --stat
```

## What I added

### Navigation
- **Secondary header**: a new section that sits below the main header and shows a row of collection links. Each link is a block with its own collection and color setting. ([sections/secondary-header.liquid](sections/secondary-header.liquid))
- **Promotional mega menu**: dropdown menus show two columns of links with headings, plus two image cards that link to promotions. The image cards are hidden on smaller screens. ([snippets/header-mega-menu.liquid](snippets/header-mega-menu.liquid), [assets/component-mega-menu.css](assets/component-mega-menu.css))
- **Redesigned search**: a restyled search bar in the header. ([snippets/header-search.liquid](snippets/header-search.liquid), [assets/component-search.css](assets/component-search.css))

### New sections
- **Product carousel**: shows products from a chosen collection as a slider, with settings for columns on desktop and mobile, image ratio, vendor and rating display, and swiping on mobile. ([sections/custom-carousel.liquid](sections/custom-carousel.liquid), [assets/custom-carousel.js](assets/custom-carousel.js))
- **Image tile list**: a grid of image tiles with overlaid text, and settings for overlay opacity, text color and image ratio. ([sections/custom-list.liquid](sections/custom-list.liquid))

### Product page
- **Discount badge**: shows the percentage saved (for example "20% off") on the product images when a variant has a compare-at price. It updates without a page reload when the shopper picks another size or color, by listening to Dawn's variant-change event. ([snippets/product-media-gallery.liquid](snippets/product-media-gallery.liquid), [assets/product-discount-badge.js](assets/product-discount-badge.js))

### Store setup and styling
- A rebuilt homepage layout with a banner, featured collections, a collection list and the image tile list. ([templates/index.json](templates/index.json))
- Styling changes to product cards, prices, the cart drawer, the newsletter form, the footer and the announcement bar.
- Translations of the new text and settings in all of Dawn's supported languages. ([locales/](locales/))

## Running it locally

You need [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) and a Shopify development store.

```sh
git clone https://github.com/prdpmishra/shopify-dawn-customized.git
cd shopify-dawn-customized
shopify theme dev --store your-store.myshopify.com
```

To check the code for errors:

```sh
shopify theme check
```

## Credits and license

This theme is based on [Dawn](https://github.com/Shopify/dawn) by Shopify, used under its license. Copyright (c) 2021-present Shopify Inc. See [LICENSE.md](LICENSE.md).
