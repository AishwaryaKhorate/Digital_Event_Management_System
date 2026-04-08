// utils-makeClickable.js
// Adds keyboard accessibility to elements with class "clickable" or "btn-like".
// Also sets role and tabindex where missing.
export default function makeClickable() {
  if (typeof window === 'undefined') return;
  function enhance(el) {
    if (!el) return;
    if (!el.hasAttribute('role')) el.setAttribute('role','button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  }
  const els = document.querySelectorAll('.clickable, .btn-like, [data-clickable]');
  els.forEach(enhance);
  // Observe DOM for future additions
  const obs = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches && (node.matches('.clickable, .btn-like, [data-clickable]'))) enhance(node);
        node.querySelectorAll && node.querySelectorAll('.clickable, .btn-like, [data-clickable]').forEach(enhance);
      });
    });
  });
  obs.observe(document.body, {childList:true, subtree:true});
}
