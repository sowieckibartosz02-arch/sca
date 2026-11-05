const dead = v => Math.abs(v) < .16 ? 0 : v;
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set(); this.dx = 0; this.dy = 0;
    this.forward = 0; this.strafe = 0; this.turn = 0; this.look = 0; this.padUse = false;
    this.abort = new AbortController(); const opts = { signal: this.abort.signal };
    addEventListener('keydown', e => {
      if (e.target.matches('input,select,textarea')) return;
      if (['F3','F5','F9','Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    }, opts);
    addEventListener('keyup', e => this.keys.delete(e.code), opts);
    addEventListener('blur', () => { this.keys.clear(); this.pressed.clear(); this.dx = this.dy = 0; }, opts);
    addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { this.dx += e.movementX; this.dy += e.movementY; } }, opts);
  }
  take(key) { const has = this.pressed.has(key); this.pressed.delete(key); return has; }
  sample() {
    this.forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    this.strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    this.turn = this.look = 0;
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      this.strafe += dead(pad.axes[0] || 0); this.forward -= dead(pad.axes[1] || 0);
      this.turn = dead(pad.axes[2] || 0); this.look = dead(pad.axes[3] || 0);
      if (pad.buttons[0]?.pressed && !this.padUse) this.pressed.add('KeyE');
      this.padUse = !!pad.buttons[0]?.pressed;
    }
  }
  dispose() { this.abort.abort(); }
}
