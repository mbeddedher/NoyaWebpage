'use client';

import '../styles/FourItems.css';
import Link from 'next/link';

export default function FourItems() {
  return (
    <section className="dort-unsur-section">
        <h1 className="dort-unsur-div-title">Bahçenin 4 Unsuru</h1>
        <div id="dort-unsur-div">
          <div className="dort-unsur-div-item" style={{ backgroundImage: 'url(/toprak.png)' }}>
            <div className="dort-unsur-div-item-content">
              <h2 className="dort-unsur-div-item-title">Toprak</h2>
              <div className="dort-unsur-div-item-glass">
                <p className="dort-unsur-div-item-text">Bahçenin temeli topraktır. Doğru toprak yapısı, drenaj ve besin dengesi sağlıklı bir bahçenin başlangıcıdır.</p>
                <div className="dort-unsur-div-item-links">
                  <Link href="/category/toprak" className="dort-unsur-div-item-link">Toprak ürünlerini keşfet</Link>
                  <Link href="/category/toprak" className="dort-unsur-div-item-link">Bahçe toprağı nasıl hazırlanır?</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="dort-unsur-div-item" style={{ backgroundImage: 'url(/bitki.png)' }}>
            <div className="dort-unsur-div-item-content">
              <h2 className="dort-unsur-div-item-title">Bitki</h2>
              <div className="dort-unsur-div-item-glass">
                <p className="dort-unsur-div-item-text">Bahçenizin karakterini bitkiler belirler. Sebze fideleri, fidanlar ve bitkilerle yaşam dolu alanlar oluşturun.</p>
                <div className="dort-unsur-div-item-links">
                  <Link href="/category/bitki" className="dort-unsur-div-item-link">Bitkileri keşfet</Link>
                  <Link href="/category/bitki" className="dort-unsur-div-item-link">Bahçe bitkileri rehberi</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="dort-unsur-div-item" style={{ backgroundImage: 'url(/su.png)' }}>
            <div className="dort-unsur-div-item-content">
              <h2 className="dort-unsur-div-item-title">Su</h2>
              <div className="dort-unsur-div-item-glass">
                <p className="dort-unsur-div-item-text">Su, bahçenin yaşam kaynağıdır. Damla sulama ve sprinkler sistemleriyle bitkilerinize doğru miktarda suyu ulaştırın.</p>
                <div className="dort-unsur-div-item-links">
                  <Link href="/category/su" className="dort-unsur-div-item-link">Sulama sistemlerini keşfet</Link>
                  <Link href="/category/su" className="dort-unsur-div-item-link">Sulama planlayıcıyı kullan</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="dort-unsur-div-item" style={{ backgroundImage: 'url(/insan.png)' }}>
            <div className="dort-unsur-div-item-content">
              <h2 className="dort-unsur-div-item-title">İnsan</h2>
              <div className="dort-unsur-div-item-glass">
                <p className="dort-unsur-div-item-text">Bahçe insanın emeğiyle büyür. Doğru aletler ve bakım yöntemleriyle toprağa dokunun.</p>
                <div className="dort-unsur-div-item-links">
                  <Link href="/category/insan" className="dort-unsur-div-item-link">Bahçe aletlerini keşfet</Link>
                  <Link href="/category/insan" className="dort-unsur-div-item-link">Bahçe bakım rehberi</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}