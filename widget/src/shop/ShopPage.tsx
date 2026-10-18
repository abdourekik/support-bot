import { OPEN_EVENT } from '../chat/ChatWidget';
import { ProductIllustration } from './ProductIllustration';
import { PRODUCTS } from './products';

const openChat = () => window.dispatchEvent(new Event(OPEN_EVENT));

export function ShopPage() {
  return (
    <>
      <a className="skip-link" href="#produits">
        Aller aux produits
      </a>
      <div className="demo-banner" role="note">
        Boutique fictive – démo. Aucune commande n’est possible sur ce site.
      </div>

      <header className="site-header">
        <a className="logo" href="#" aria-label="Maison Nora – accueil">
          Maison <span>Nora</span>
        </a>
        <nav aria-label="Navigation principale">
          <ul>
            <li><a href="#produits">Linge de lit</a></li>
            <li><a href="#produits">Linge de bain</a></li>
            <li><a href="#produits">Coussins</a></li>
            <li>
              <button type="button" className="link-button" onClick={openChat}>
                Aide
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__text">
            <p className="hero__kicker">Linge de maison en coton et lin</p>
            <h1 id="hero-title">Des nuits douces, des matins simples.</h1>
            <p>
              Percale de coton, lin lavé et éponge moelleuse : des basiques durables, faciles à entretenir à 40 °C.
              Livraison gratuite en France métropolitaine dès 60 € d’achat.
            </p>
            <div className="hero__actions">
              <a className="button" href="#produits">
                Découvrir la collection
              </a>
              <button type="button" className="button button--ghost" onClick={openChat}>
                Une question ? Demandez à notre assistant
              </button>
            </div>
          </div>
          <div className="hero__art" aria-hidden="true">
            <span className="fold fold--1" />
            <span className="fold fold--2" />
            <span className="fold fold--3" />
          </div>
        </section>

        <section id="produits" className="products" aria-labelledby="products-title">
          <h2 id="products-title">Nos essentiels</h2>
          <ul className="product-grid">
            {PRODUCTS.map((p) => (
              <li key={p.id} className="product">
                <ProductIllustration kind={p.illustration} colors={p.colors} />
                <div className="product__body">
                  <p className="product__category">{p.category}</p>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <p className="product__details">{p.details}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="promises" aria-label="Nos engagements">
          <div>
            <h3>Livraison</h3>
            <p>3 à 5 jours ouvrés en France métropolitaine, 5 à 8 jours en Belgique et en Suisse.</p>
          </div>
          <div>
            <h3>Retours</h3>
            <p>30 jours pour changer d’avis, retour gratuit en France métropolitaine.</p>
          </div>
          <div>
            <h3>Paiement</h3>
            <p>Carte bancaire, PayPal, ou en 3 fois sans frais dès 150 €.</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p className="site-footer__demo">Boutique fictive – démo</p>
        <p>
          Maison Nora est une marque inventée pour présenter un assistant de service client. Les produits, les
          conditions et les coordonnées sont fictifs.
        </p>
        <p>
          Service client (fictif) : support@maison-nora.example · 01 99 00 12 34 · du lundi au vendredi, de 9h à 18h
        </p>
      </footer>
    </>
  );
}
