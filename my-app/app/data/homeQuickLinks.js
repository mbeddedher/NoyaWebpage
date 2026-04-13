/**
 * Homepage “quick links” strip — edit this file to change labels, images, and destinations.
 *
 * Each tile is 200×75px with 10px gap. How many fit in one row (approx):
 *   tilesPerRow ≈ Math.floor((containerInnerWidth + 10) / 210)
 *   (210 = 200 width + 10 gap; the last tile has no trailing gap in flex/grid math)
 *
 * @typedef {{ id: string, label: string, href: string, imageSrc?: string }} HomeQuickLink
 */

/** @type {HomeQuickLink[]} */
export const HOME_QUICK_LINKS = [
  {
    id: 'example-1',
    label: 'Örnek 1',
    href: '/products',
    // imageSrc: '/images/your-banner.webp',
  },
  {
    id: 'example-2',
    label: 'Örnek 2',
    href: '/products?categories=1',
  },
];
