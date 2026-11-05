export class Meta {
  constructor(id, notify) {
    this.notify = notify; this.original = document.title; this.abort = new AbortController();
    let old = {}; try { old = JSON.parse(localStorage.getItem(id + ':memory') || '{}'); } catch {}
    this.visits = (old.visits || 0) + 1; this.absence = old.last ? Math.round((Date.now() - old.last) / 60000) : 0;
    try { localStorage.setItem(id + ':memory', JSON.stringify({ visits: this.visits, last: Date.now() })); } catch {}
    const opts = { signal: this.abort.signal };
    addEventListener('blur', () => { document.title = 'Someone is still inside'; }, opts);
    addEventListener('focus', () => { document.title = this.original; notify('The room kept your place.'); }, opts);
    this.icon = document.createElement('link'); this.icon.rel = 'icon'; document.head.append(this.icon);
    this.icon.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#14221b"/><circle cx="16" cy="16" r="9" fill="none" stroke="#d7b97e"/><circle cx="16" cy="16" r="3" fill="#d7b97e"/></svg>');
    this.timer = setInterval(() => { if (!document.hidden) document.title = this.original + ' · ' + new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }, 30000);
  }
  illusion(kind = 'loading') {
    const panel = document.getElementById('illusion'); panel.hidden = false;
    panel.querySelector('h2').textContent = kind === 'crash' ? 'RENDER PROCESS LOST' : 'RESTORING A MEMORY';
    panel.querySelector('p').textContent = 'Fictional in-game screen · Esc to dismiss';
    clearTimeout(this.timeout); this.timeout = setTimeout(() => { panel.hidden = true; }, 2400);
  }
  dispose() { this.abort.abort(); clearInterval(this.timer); clearTimeout(this.timeout); this.icon.remove(); document.title = this.original; }
}
