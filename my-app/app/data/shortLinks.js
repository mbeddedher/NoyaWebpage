/**
 * Homepage “Shorts” strip — edit this file to change which YouTube Shorts appear.
 *
 * @typedef {Object} ShortItem
 * @property {string} id Unique id for React keys (not the YouTube id).
 * @property {string} title Title text shown under the short.
 * @property {string} youtubeId YouTube video id (the part after `/shorts/`).
 * @property {string=} views Optional view text, e.g. "12K".
 * @property {string=} channel Optional channel name.
 * @property {string=} thumbnailSrc Optional custom thumbnail (public path or full URL).
 */

/** @type {ShortItem[]} */
export const SHORTS = [
  // Replace these with your own YouTube Shorts IDs
  { id: 'short-1', title: 'Şarjlı budama Makası', youtubeId: 'mY-G1UXBS6A', views: '12K' },
  { id: 'short-2', title: 'Zeytin Ağacı Budama İşlemi', youtubeId: 'Q3UdOrDuyig', views: '8.1K' },
  { id: 'short-3', title: 'Zeytin Ağacı Fidanı Tekleme', youtubeId: 'fD3B9IGgM28', views: '4.3K' },
  { id: 'short-4', title: 'Tekleme Budama', youtubeId: 'Z7tBg2y1AiQ', views: '21K' },
  { id: 'short-5', title: 'Damlama Sulama İşlemi', youtubeId: 'ViekL4Q4e3E', views: '8.1K' },
  { id: 'short-6', title: 'Damlatıcı Takma', youtubeId: '2XA4l0LIBGg', views: '8.1K' },
  { id: 'short-7', title: 'Yağmur Çapa Makinesi', youtubeId: 'zmE77vzz4Uc', views: '8.1K' },
  { id: 'short-8', title: 'Dizel Çapa Makinesi', youtubeId: 'nP_K45_vV5g', views: '8.1K' },
  { id: 'short-9', title: 'Bolat Çapa Makinesi', youtubeId: 'kMg5BTcVGQU', views: '12K' },
];
  