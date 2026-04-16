/**
 * Temporary blog data (until admin CRUD is wired).
 * @typedef {Object} BlogArticle
 * @property {string} id
 * @property {"Duyuru"|"Haber"|"Öğretici"} category
 * @property {string} title
 * @property {string} foreword
 * @property {string} imageUrl
 * @property {string} author
 * @property {string} createdAt ISO
 */

/** @type {BlogArticle[]} */
export const BLOG_ARTICLES = [
  {
    id: 'a1',
    category: 'Duyuru',
    title: 'Yeni sezon ürünleri raflarda',
    foreword: 'Sulama, peyzaj ve bahçe aletlerinde yeni sezon ürünleri geldi. Kısa bir tur atın.',
    imageUrl: '/blog-main-2.jpg',
    author: 'Noya Editör',
    createdAt: '2026-04-14T09:10:00.000Z',
  },
  {
    id: 'a2',
    category: 'Haber',
    title: 'Damla sulama: doğru hat seçimi',
    foreword: '16mm / 20mm seçiminden debi hesabına kadar hızlı bir özet. Başlamadan önce kontrol listesi.',
    imageUrl: '/hero_bahce.png',
    author: 'Noya Blog',
    createdAt: '2026-04-12T12:00:00.000Z',
  },
  {
    id: 'a3',
    category: 'Öğretici',
    title: 'Sprinkler yerleşimi 5 adımda',
    foreword: 'Kör nokta bırakmadan kapsama sağlamak için yerleşimi nasıl planlayacağınızı anlattık.',
    imageUrl: '/hero_tarla.png',
    author: 'Noya Akademi',
    createdAt: '2026-04-10T18:30:00.000Z',
  },
  {
    id: 'a4',
    category: 'Haber',
    title: 'Peyzaj taşı uygulamasında 3 hata',
    foreword: 'Zemin hazırlığı, eğim ve derz aralığı… En sık yapılan hatalar ve pratik çözümleri.',
    imageUrl: '/public/categories/peyzaj_tas.jpg',
    author: 'Noya Blog',
    createdAt: '2026-04-09T08:45:00.000Z',
  },
  {
    id: 'a5',
    category: 'Öğretici',
    title: 'Budama makası bakımı: keskinlik ve yağlama',
    foreword: 'Makasınızın ömrünü uzatmak için basit bakım rutini: temizlik, bileme ve yağlama.',
    imageUrl: '/public/categories/prune-1.jpg',
    author: 'Noya Akademi',
    createdAt: '2026-04-07T15:05:00.000Z',
  },
  {
    id: 'a6',
    category: 'Duyuru',
    title: 'Haftalık bülten yayında',
    foreword: 'Öne çıkan ürünler, kısa ipuçları ve fırsatlar tek sayfada. Takipte kalın.',
    imageUrl: '/hero_balkon.png',
    author: 'Noya Editör',
    createdAt: '2026-04-06T10:20:00.000Z',
  },
];

