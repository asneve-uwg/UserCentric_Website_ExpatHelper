
// site-header.js
class SiteHeader extends HTMLElement {
    static get observedAttributes() { return ['src', 'compact']; }

    constructor() {
        super();
        this._container = document.createElement('div');
        this._container.setAttribute('role', 'banner');
        this._container.setAttribute('aria-label', 'Site header');
        this._container.className = 'site-header-container';
    }

    connectedCallback() {
        if (!this._container.isConnected) this.appendChild(this._container);
        this.render();
    }

    attributeChangedCallback() { this.render(); }

    get src() {
        const raw = this.getAttribute('src') || '/header.html';
        try { return new URL(raw, document.baseURI).href; } catch { return raw; }
    }

    get compact() { return this.hasAttribute('compact'); }

    async render() {
        this.classList.toggle('site-header--compact', this.compact);
        try {
            const res = await fetch(this.src, { credentials: 'same-origin' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            this._container.innerHTML = html;
            this._markActiveLink();
            this.dispatchEvent(new CustomEvent('header:loaded', { bubbles: true }));
        } catch (err) {
            console.error('[site-header] failed:', err);
            this._container.innerHTML = this._fallbackHTML(err);
            this.dispatchEvent(new CustomEvent('header:error', { bubbles: true, detail: { error: err } }));
        }
    }

    _markActiveLink() {
        const nav = this._container.querySelector('nav, [role="navigation"]');
        if (!nav) return;
        const links = [...nav.querySelectorAll('a[href]')];
        const current = new URL(window.location.href);

        let matched = null;
        for (const a of links) {
            try {
                const u = new URL(a.href, document.baseURI);
                if (u.pathname === current.pathname) { matched = a; break; }
            } catch { }
        }
        if (!matched) for (const a of links) if (a.href === window.location.href) { matched = a; break; }

        for (const a of links) {
            if (a === matched) { a.setAttribute('aria-current', 'page'); a.classList.add('is-active'); }
            else { a.removeAttribute('aria-current'); a.classList.remove('is-active'); }
        }
    }

    _fallbackHTML(err) {
        const message = err?.message || 'Unknown error';
        return `
      <header class="site-header fallback">
        /index.htmlExpat Helper</a>
        <nav aria-label="Primary">
          /index.htmlHome</a>
          /signup.htmlSign up</a>
          /about.htmlAbout</a>
        </nav>
        <div class="notice" role="status" aria-live="polite">
          <small>Header failed to load (${message}). Showing fallback.</small>
        </div>
      </header>
    `;
    }
}

if (!customElements.get('site-header')) {
    customElements.define('site-header', SiteHeader);
}
