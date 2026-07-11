/* step-nav.js — persistent flow header for the mygridgb-quotes journey */

const STEPS = [
  { label: 'Estimate what solar could do for your home', href: '/solar-matcher/' },
  { label: 'Choose MCS-registered local installers',     href: '/mygridgb-quotes/' },
  { label: 'Compare indicative proposals, select for survey', href: '/mygridgb-quotes/room.html' },
  { label: 'Review binding post-survey quotes',           href: '/mygridgb-quotes/survey.html' },
  { label: 'Leave a review',                             href: '/mygridgb-quotes/review.html' },
];

function currentStep() {
  const path = window.location.pathname;
  if (path.includes('review.html'))     return 4;
  if (path.includes('survey.html'))     return 3;
  if (path.includes('room.html'))       return 2;
  if (path.includes('mygridgb-quotes')) return 1;
  return 0;
}

function buildStepNav() {
  const active = currentStep();
  const html = `
  <div class="flow-nav" role="navigation" aria-label="Quote journey">
    <div class="flow-nav-inner">
      ${STEPS.map((s, i) => {
        const state = i < active ? 'done' : i === active ? 'active' : 'future';
        const tag   = state === 'done' ? `<a href="${s.href}">` : '<span>';
        const close = state === 'done' ? '</a>' : '</span>';
        return `
        ${i > 0 ? '<div class="flow-sep" aria-hidden="true">→</div>' : ''}
        <div class="flow-step flow-step--${state}">
          ${tag}
            <span class="flow-num">${i + 1}</span>
            <span class="flow-label">${s.label}</span>
          ${close}
        </div>`;
      }).join('')}
    </div>
  </div>`;

  const el = document.createElement('div');
  el.innerHTML = html;
  // Insert after site header (which nav.js prepends to body)
  const header = document.getElementById('site-header');
  if (header) {
    header.insertAdjacentHTML('afterend', el.innerHTML);
  } else {
    document.body.insertAdjacentHTML('afterbegin', el.innerHTML);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildStepNav);
} else {
  buildStepNav();
}
