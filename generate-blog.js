#!/usr/bin/env node
// Generates blog/index.html and blog/<slug>.html for all posts
const fs = require('fs');
const path = require('path');

const posts = JSON.parse(fs.readFileSync('blog/posts.json', 'utf8'));

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m)-1]} ${y}`;
}

function cleanContent(html) {
  // Strip WordPress block comments, fix image URLs
  return html
    .replace(/<!-- wp:[^>]*-->/g, '')
    .replace(/<!-- \/wp:[^>]*-->/g, '')
    .replace(/\/wp-content\/uploads\//g, '/images/')
    .trim();
}

const isGuest = p => p.categories.includes('guest-post') || p.author !== 'Dr Andrew Crossland';

// ── Generate individual post pages ────────────────────────────────────────────
for (const post of posts) {
  const guest = isGuest(post);
  const authorDisplay = guest
    ? (post.author === 'Jeremy Leggett' ? 'Jeremy Leggett' : post.author)
    : 'Dr Andrew Crossland';

  const guestBanner = guest ? `
  <div style="background:#fefce8; border:1px solid #fbbf24; border-radius:8px; padding:14px 18px; margin-bottom:28px; font-size:14px; color:#92400e;">
    This is a guest post by <strong>${authorDisplay}</strong>. Views are the author's own and do not necessarily represent the opinions or positions of MyGridGB or Dr Andrew Crossland.
  </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${post.title.replace(/"/g,'&quot;')} — MyGridGB Blog</title>
  <meta name="description" content="${(post.excerpt || '').replace(/"/g,'&quot;').replace(/<[^>]+>/g,'').substring(0,160)}">
  <link rel="stylesheet" href="../assets/style.css">
  <script src="../assets/nav.js" defer></script>
  <style>
    .post-wrap { max-width: 760px; margin: 0 auto; padding: 0 0 60px; }
    .post-meta { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
    .post-body { line-height: 1.75; font-size: 16px; }
    .post-body h2, .post-body h3 { font-family: 'DM Serif Display', Georgia, serif; color: #1a4d7a; margin-top: 32px; }
    .post-body p { margin-bottom: 18px; }
    .post-body img { max-width: 100%; height: auto; border-radius: 6px; margin: 16px 0; }
    .post-body a { color: var(--brand); }
    .post-body blockquote { border-left: 3px solid var(--border); margin: 20px 0; padding: 8px 20px; color: var(--muted); font-style: italic; }
    .back-link { display:inline-block; margin-bottom:24px; color:var(--brand); font-size:14px; font-weight:500; text-decoration:none; }
    .back-link:hover { text-decoration:underline; }
  </style>
</head>
<body>
<div class="page-wrap">
  <main>
    <div class="post-wrap">
      <a href="/blog/index.html" class="back-link">← All posts</a>
      <h1 class="page-title" style="font-size:clamp(1.4rem,4vw,2rem); line-height:1.25; margin-bottom:12px;">${post.title}</h1>
      <div class="post-meta">${fmtDate(post.date)} · ${authorDisplay}</div>
      ${guestBanner}
      <div class="post-body">
        ${cleanContent(post.content)}
      </div>
    </div>
  </main>
  <div id="sidebar-placeholder"></div>
</div>
</body>
</html>`;

  fs.writeFileSync(`blog/${post.slug}.html`, html);
}

console.log(`Generated ${posts.length} post pages`);

// ── Generate blog/index.html ───────────────────────────────────────────────────
function cardHtml(post) {
  const guest = isGuest(post);
  const authorDisplay = guest
    ? (post.author === 'Jeremy Leggett' ? 'Jeremy Leggett' : post.author)
    : 'Dr Andrew Crossland';
  const badge = guest ? `<span class="guest-badge">Guest</span>` : '';
  const excerpt = (post.excerpt || '').replace(/<[^>]+>/g, '').substring(0, 160);
  const dtype = guest ? 'guest' : 'mine';
  return `    <a href="/blog/${post.slug}.html" class="blog-card" data-type="${dtype}">
      <div class="blog-card-meta">${fmtDate(post.date)} ${badge}</div>
      <div class="blog-card-title">${post.title}</div>
      <div class="blog-card-author">${authorDisplay}</div>
      ${excerpt ? `<div class="blog-card-excerpt">${excerpt}</div>` : ''}
    </a>`;
}

const cardRows = posts.map(cardHtml).join('\n');

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog — MyGridGB</title>
  <meta name="description" content="Articles and analysis on British electricity generation, carbon intensity, and the energy transition.">
  <link rel="stylesheet" href="../assets/style.css">
  <script src="../assets/nav.js" defer></script>
  <style>
    .blog-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; }
    @media(max-width:600px){ .blog-grid { grid-template-columns:1fr; } }
    .blog-card { display:block; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:18px 20px; text-decoration:none; color:inherit; transition:border-color .15s,box-shadow .15s; }
    .blog-card:hover { border-color:var(--brand); box-shadow:0 2px 10px rgba(0,0,0,.07); }
    .blog-card-meta { font-size:12px; color:var(--muted); margin-bottom:6px; display:flex; align-items:center; gap:8px; }
    .blog-card-title { font-size:15px; font-weight:600; color:#1a4d7a; line-height:1.35; margin-bottom:4px; }
    .blog-card-author { font-size:12px; color:var(--muted); margin-bottom:6px; }
    .blog-card-excerpt { font-size:13px; color:var(--muted); line-height:1.55; }
    .guest-badge { background:#fbbf24; color:#78350f; font-size:11px; font-weight:700; padding:1px 7px; border-radius:10px; }
    .guest-notice { background:#fefce8; border:1px solid #fbbf24; border-radius:8px; padding:14px 18px; margin-bottom:24px; font-size:13px; color:#92400e; display:none; }
    .guest-notice.visible { display:block; }
  </style>
</head>
<body>
<div class="page-wrap">
  <main>
    <h1 class="page-title">Blog</h1>
    <p class="page-intro">Analysis of British electricity generation, carbon intensity, and the energy transition — plus selected guest posts from energy experts.</p>

    <div class="filter-bar" id="blog-filter">
      <span class="filter-bar-label">Filter:</span>
      <button class="filter-btn active" data-type="all">All posts (${posts.length})</button>
      <button class="filter-btn" data-type="mine">My posts (${posts.filter(p => !isGuest(p)).length})</button>
      <button class="filter-btn" data-type="guest">Guest posts (${posts.filter(p => isGuest(p)).length})</button>
    </div>

    <div class="guest-notice" id="guest-notice">
      Guest posts on MyGridGB are shared with the prior permission of their authors and are reproduced here for educational and informational purposes. The views expressed in guest posts are those of the original authors and do not necessarily represent the opinions or positions of MyGridGB or Dr Andrew Crossland.
    </div>

    <div class="blog-grid" id="blog-grid">
${cardRows}
    </div>
  </main>
  <div id="sidebar-placeholder"></div>
</div>

<script>
  const filter = document.getElementById('blog-filter');
  const notice = document.getElementById('guest-notice');
  filter.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.type;
    document.querySelectorAll('#blog-grid .blog-card').forEach(card => {
      card.style.display = (type === 'all' || card.dataset.type === type) ? '' : 'none';
    });
    notice.classList.toggle('visible', type === 'guest');
  });
</script>
</body>
</html>`;

fs.writeFileSync('blog/index.html', indexHtml);
console.log('Generated blog/index.html');
