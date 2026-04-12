'use client';

import '../styles/Hero.css';

const HERO_IMAGES = [
  { src: '/hero_bahce.png', alt: 'Bahçe', size: 'large', categoryLabel: 'Bahçe Ürünlerini Keşfet', description: 'Bahçenizi yaşayan bir alana dönüştürün', categoryLink: '/category/bahce' },
  { src: '/hero_balkon.png', alt: 'Balkon', size: 'medium', categoryLabel: 'Balkon ve Ev içi Ürünleri Keşfet', description: 'Yaşam alanını yeşillendir', categoryLink: '/category/balkon' },
  { src: '/hero_tarla.png', alt: 'Tarla', size: 'wide', categoryLabel: 'Tarım ürünlerini Keşfet', description: 'Uygun fiyatlarla uzun ömür sağlayın', categoryLink: '/category/tarla' },
];

const HOTSPOT_IMAGES = [
  [{ header: 'Rain-Bird Van-18 Pop-Up', alt: ['Spring','Pop-Up','Sulama'], cord: [50,32], categoryLabel: 'Springleri Keşfet', productLink: 'null', categoryLink: '/category/bahce' },
  { header: 'Dolomit Taşı', alt: ['Beyaz','3-4 cm','Süs Taşı'], cord:[40,60], categoryLabel: 'Taşları Keşfet', productLink: 'null', categoryLink: '/category/bahce' },
  { header: 'Esnek Çim Ayıracı', alt: ['Yeşil','Esnek','Kazıklı'], cord:[50,60], categoryLabel: 'Çİm Ayıraçlarını Keşfet', productLink: 'null', categoryLink: '/category/bahce' }],

  [{ header: 'Domates Fidesi', alt: ['Fide','Yazlık','Melez'], cord: [20,70], categoryLabel: 'Fideleri Keşfet', productLink: 'null', categoryLink: '/category/bahce' },
  { header: 'Hasır Saksı', alt: ['Hasır','15cm','Balkon'], cord:[50,60], categoryLabel: 'Balkon Saksılarını Keşfet', productLink: 'null', categoryLink: '/category/bahce' }],


  [{ header: '16 mm Damlama Borusu', alt: ['Damlama','Boru','16 mm'], cord: [45,50], categoryLabel: 'Damlama Borularını Keşfet', productLink: 'null', categoryLink: '/category/bahce' },
  { header: 'Kürek Saplı', alt: ['150cm','Kalın Demir','Yapar'], cord:[25,70], categoryLabel: 'Kürekleri Keşfet', productLink: 'null', categoryLink: '/category/bahce' }]

  
];

export default function Hero() {
  return (
    <section className="hero" aria-label="Hero gallery">
      <div className="hero-stack">
        {HERO_IMAGES.map((img, i) => (
          <div key={i} className={`hero-item hero-item--${img.size}`}>
            <img
              src={img.src}
              alt={img.alt}
              className="hero-img"
              loading="eager"
              decoding="async"
            />
            {HOTSPOT_IMAGES[i].map((hotspot, i) => (
            <button className={`hotspot hotspot-${i+1}`} key={i} style={{ left: `${hotspot.cord[0]}%`, top: `${hotspot.cord[1]}%` }} aria-hidden="true">
            <span className="dot"></span>
            <div className="tooltip">
                <h4>{hotspot.header}</h4>
              <p>{hotspot.alt.join(', ')}</p>
              <a href={hotspot.categoryLink}>İncele</a>
            </div>
            </button>
            ))}
            <div className="hero-item-cta" >
              <div className="hero-item-cta-content">
                <span className={`hero-item-cta-text-${img.size}`}>{img.categoryLabel}</span>
                <span className={`hero-item-cta-description-${img.size}`}>{img.description}</span>
              </div>  
              <span className={`hero-item-cta-arrow hero-item-cta-arrow-${img.size}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
