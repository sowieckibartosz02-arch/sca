export class Story {
  constructor() { this.rules = new Map(); this.queue = []; this.time = 0; }
  when(name) {
    const rule = { steps: [], once: true, fired: false };
    if (!this.rules.has(name)) this.rules.set(name, []);
    this.rules.get(name).push(rule);
    const chain = { then: (action, delay = 0) => { rule.steps.push({ action, delay }); return chain; } };
    return chain;
  }
  emit(name) {
    for (const rule of this.rules.get(name) || []) {
      if (rule.once && rule.fired) continue;
      rule.fired = true;
      let due = this.time;
      for (const step of rule.steps) { due += step.delay; this.queue.push({ due, action: step.action }); }
    }
    this.queue.sort((a, b) => a.due - b.due);
  }
  update(dt) {
    this.time += dt;
    while (this.queue.length && this.queue[0].due <= this.time) this.queue.shift().action();
  }
  snapshot() { return [...this.rules].filter(([, rules]) => rules.some(r => r.fired)).map(([name]) => name); }
  restore(names) { this.queue.length = 0; for (const [name, rules] of this.rules) for (const rule of rules) rule.fired = names.includes(name); }
}
