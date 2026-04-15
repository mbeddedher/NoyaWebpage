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
    id: 'budama-makasları',
    label: 'Budama Makasları',
    href: '/products?categories=1',
    imageSrc: '/public/categories/prune-1.jpg',
  },
  {
    id: 'sprinkler',
    label: 'Sprinkler',
    href: '/products?categories=2',
    imageSrc: '/public/categories/springler-2.jpg',
  },
  {
    id: 'benzinli-makineler',
    label: 'Benzinli Makineler',
    href: '/products?categories=2',
    imageSrc: '/public/categories/stihl.webp',
  },
  {
    id: 'pompalar',
    label: 'Pompalar',
    href: '/products?categories=3',
    imageSrc: '/public/categories/water-pump.webp',
  },
  {
    id: 'hidroforlar',
    label: 'Hidroforlar',
    href: '/products?categories=4',
    imageSrc: '/public/categories/hidrofor.jpg',
  },
  {
    id: 'el-aletleri',
    label: 'El Aletleri',
    href: '/products?categories=5',
    imageSrc: '/public/categories/el-aletleri.jpg',
  },
  {
    id: 'peyzaj-taslar',
    label: 'Peyzaj Taşları',
    href: '/products?categories=6',
    imageSrc: '/public/categories/peyzaj_tas.jpg',
  },
];
