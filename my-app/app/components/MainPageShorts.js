 'use client';
 
 import { useEffect, useMemo, useRef, useState } from 'react';
 import styles from './MainPageShorts.module.css';
 import { SHORTS } from '../data/shortLinks';
 
 const CARD_WIDTH = 200;
 const GAP = 14;
 const STEP = 2;
 
 function toYoutubeEmbedUrl(youtubeId) {
   const params = new URLSearchParams({
     autoplay: '1',
     mute: '1',
     playsinline: '1',
     rel: '0',
     modestbranding: '1',
   });
   return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
 }
 
 function toYoutubeThumbUrl(youtubeId) {
   // works for Shorts too (standard YouTube thumbnail endpoint)
   return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
 }
 
 export default function MainPageShorts({
   items = SHORTS,
   title = 'Shorts',
   channelUrl = 'https://www.youtube.com/',
   channelLinkLabel = 'YouTube kanalına git',
 }) {
   const trackRef = useRef(null);
   const [canScrollLeft, setCanScrollLeft] = useState(false);
   const [canScrollRight, setCanScrollRight] = useState(false);

   const [activeId, setActiveId] = useState(null);
   const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
   const activeItem = useMemo(
     () => (activeId ? safeItems.find((x) => x.id === activeId) : null),
     [activeId, safeItems]
   );
 
   const updateScrollState = () => {
     const el = trackRef.current;
     if (!el) return;
     setCanScrollLeft(el.scrollLeft > 0);
     setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
   };
 
   useEffect(() => {
     const el = trackRef.current;
     if (!el) return;
     updateScrollState();
     el.addEventListener('scroll', updateScrollState);
     const ro = new ResizeObserver(updateScrollState);
     ro.observe(el);
     return () => {
       el.removeEventListener('scroll', updateScrollState);
       ro.disconnect();
     };
  }, [safeItems]);
 
   const scroll = (direction) => {
     const el = trackRef.current;
     if (!el) return;
     const moveBy = (CARD_WIDTH + GAP) * STEP;
     el.scrollBy({ left: direction === 'left' ? -moveBy : moveBy, behavior: 'smooth' });
   };
 
   useEffect(() => {
     if (!activeItem) return;
     const onKeyDown = (e) => {
       if (e.key === 'Escape') setActiveId(null);
     };
     window.addEventListener('keydown', onKeyDown);
     return () => window.removeEventListener('keydown', onKeyDown);
   }, [activeItem]);
 
  if (safeItems.length === 0) return null;

   return (
     <section className={styles.section} aria-label="Shorts">
       <div className={styles.container}>
         <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{title}</h2>
            <a
              className={styles.channelLink}
              href={channelUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.ytIcon} aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.01 3.01 0 0 0-2.12-2.13C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.378.556a3.01 3.01 0 0 0-2.12 2.13A31.47 31.47 0 0 0 0 12a31.47 31.47 0 0 0 .502 5.814 3.01 3.01 0 0 0 2.12 2.13C4.495 20.5 12 20.5 12 20.5s7.505 0 9.378-.556a3.01 3.01 0 0 0 2.12-2.13A31.47 31.47 0 0 0 24 12a31.47 31.47 0 0 0-.502-5.814ZM9.75 15.5v-7l6 3.5-6 3.5Z" />
                </svg>
              </span>
              <span className={styles.channelLinkText}>{channelLinkLabel}</span>
            </a>
          </div>
         </div>
 
         <div className={styles.scroller}>
           {canScrollLeft && (
             <button
               type="button"
               className={`${styles.btn} ${styles.btnPrev} ${styles.btnOverlay}`}
               onClick={() => scroll('left')}
               aria-label="Önceki shorts"
             >
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
             </button>
           )}
 
           {canScrollRight && (
             <button
               type="button"
               className={`${styles.btn} ${styles.btnNext} ${styles.btnOverlay}`}
               onClick={() => scroll('right')}
               aria-label="Sonraki shorts"
             >
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
             </button>
           )}
 
           <div className={styles.viewport} ref={trackRef}>
             <div className={styles.row} role="list">
              {safeItems.map((s) => {
                 const thumb = (s.thumbnailSrc || '').trim() || toYoutubeThumbUrl(s.youtubeId);
                 return (
                   <button
                     key={s.id}
                     className={styles.card}
                     type="button"
                     role="listitem"
                     aria-label={s.title}
                     onClick={() => setActiveId(s.id)}
                   >
                     <div className={styles.thumbWrap}>
                       {/* eslint-disable-next-line @next/next/no-img-element -- external ytimg thumbs */}
                       <img className={styles.thumb} src={thumb} alt="" loading="lazy" />
                       <span className={styles.play} aria-hidden>
                         <svg viewBox="0 0 24 24" fill="currentColor">
                           <path d="M8 5v14l11-7z" />
                         </svg>
                       </span>
                     </div>
 
                     <div className={styles.meta}>
                       <div className={styles.shortTitle}>{s.title}</div>
                       {(s.views || s.channel) && (
                         <div className={styles.sub}>
                           {s.channel ? <span className={styles.channel}>{s.channel}</span> : null}
                           {s.channel && s.views ? <span className={styles.dot} aria-hidden>•</span> : null}
                           {s.views ? <span className={styles.views}>{s.views} görüntülenme</span> : null}
                         </div>
                       )}
                     </div>
                   </button>
                 );
               })}
             </div>
           </div>
         </div>
       </div>
 
       {activeItem && (
         <div
           className={styles.modalOverlay}
           role="dialog"
           aria-modal="true"
           aria-label={activeItem.title}
           onMouseDown={(e) => {
             if (e.target === e.currentTarget) setActiveId(null);
           }}
         >
           <div className={styles.modal}>
             <button
               type="button"
               className={styles.close}
               onClick={() => setActiveId(null)}
               aria-label="Kapat"
             >
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M18 6L6 18M6 6l12 12" />
               </svg>
             </button>
 
             <div className={styles.playerWrap}>
               <iframe
                 className={styles.player}
                 src={toYoutubeEmbedUrl(activeItem.youtubeId)}
                 title={activeItem.title}
                 allow="autoplay; encrypted-media; picture-in-picture"
                 allowFullScreen
               />
             </div>
           </div>
         </div>
       )}
     </section>
   );
 }
