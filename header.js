
// site-header.js
// Web Component that loads an external header fragment and inserts it.
// Works on any static host. Include via: /site-header.js</script>
// Then place <site-header></site-header> where you want the header.

/* eslint-disable no-console */
class SiteHeader extends HTMLElement {
    static get observedAttributes() {
        return ['src', 'compact'];
    }

    constructor() {
        super();
        // Use a light DOM to allow page-level CSS to style the header content.
        // If you want style isolation, you could switch to this.attachShadow({ mode: 'open' })
        // and inject styles there, but it makes global CSS harder.
        this._container = document.createElement('div');
        this._container.setAttribute('role', 'banner');
        this._container.setAttribute('aria-label', 'Site header');
        this._container.className = 'site-header-container';
    }

    connectedCallback() {
        // Insert container if not already in the DOM
        if (!this._container.isConnected) {
            this.appendChild(this._container);
        }
        // Render once connected
        this.render();
    }

    attributeChangedCallback(name, _oldValue, _newValue) {
        if (name === 'src' || name === 'compact') {
            // Re-render when attributes change (e.g. dynamic switching)
            this.render();
        }
    }

    /**
     * Resolve the src to an absolute URL based on the current document.
     * Default to '/header.html' if not provided.
     */
    get src() {
        const raw = this.getAttribute('src') || '/header.html';
        try {
            // new URL handles relative paths correctly against document.baseURI
            return new URL(raw, document.baseURI).href;
        } catch {
            return raw; // fall back gracefully
        }
    }

    /**
     * Optional compact mode (adds a class that you can target with CSS).
     */
    get compact() {
        return this.hasAttribute('compact');
    }

    async render() {
        // Add a minimal base class for styling hooks
        this.classList.toggle('site-header--compact', this.compact);

        try {
            const res = await fetch(this.src, { credentials: 'same-origin' });
            if (!res.ok) throw new Error(`Header fetch failed: HTTP ${res.status}`);
            const html = await res.text();

            // Inject the fetched fragment
            this._container.innerHTML = html;

            // Enhance: mark current page in nav
            this._markActiveLink();

            // Optional: dispatch an event so pages can listen for "header:loaded"
            this.dispatchEvent(new CustomEvent('header:loaded', { bubbles: true }));

        } catch (err) {
            console.error('[site-header] include failed:', err);
            this._container.innerHTML = this._fallbackHTML(err);
            this.dispatchEvent(new CustomEvent('header:error', { bubbles: true, detail: { error: err } }));
        }
    }

    /**
     * Sets aria-current="page" on the nav link that matches the current location.
     * Match by pathname first; fall back to full href.
     */
    _markActiveLink() {
        const nav = this._container.querySelector('nav, [role="navigation"]');
        if (!nav) return;

        const links = [...nav.querySelectorAll('a[href]')];
        const current = new URL(window.location.href);

        // Best-effort matching: exact pathname first
        let matched = null;
        for (const a of links) {
            try {
                const u = new URL(a.href, document.baseURI);
                if (u.pathname === current.pathname) {
                    matched = a;
                    break;
                }
            } catch { /* ignore bad hrefs */ }
        }

        // Fallback: full href match (rarely needed)
        if (!matched) {
            for (const a of links) {
                if (a.href === window.location.href) {
                    matched = a;
                    break;
                }
            }
        }

        // Apply aria-current and a class for styling, remove from others
        for (const a of links) {
            if (a === matched) {
                a.setAttribute('aria-current', 'page');
                a.classList.add('is-active');
            } else {
                a.removeAttribute('aria-current');
                a.classList.remove('is-active');
            }
        }
    }

    /**
     * Minimal fallback so the page still shows a usable header if fetch fails.
     */
    _fallbackHTML(err) {
        const message = (err && err.message) ? err.message : 'Unknown error';
        return `
      <header class="site-header fallback">
        <a href="/index.html" class="logo   <nav aria-label="Primary">
          /signup.htmlSign up</a>
          /about.htmlAbout</a>
