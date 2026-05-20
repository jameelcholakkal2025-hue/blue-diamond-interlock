// Firebase compat SDK loaded via <script> tags in catalogue.html
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyByDrvOSrRX5W261QAue83aACVE7nKdFkg",
  authDomain:        "blue-diamond-3229a.firebaseapp.com",
  projectId:         "blue-diamond-3229a",
  storageBucket:     "blue-diamond-3229a.firebasestorage.app",
  messagingSenderId: "245929462285",
  appId:             "1:245929462285:web:130ae52fa440dbdc262344"
};

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

async function getProducts() {
  const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadCategories() {
  const snap = await db.collection('categories').get();
  const map = { all: 'All Products' };
  snap.docs.forEach(d => {
    const data = d.data();
    map[d.id] = data.name || data.label || data.category || d.id;
  });
  return map;
}

function getCatLabel(cat, map) {
  if (!cat) return '';
  return (map && map[cat]) ? map[cat] : cat;
}

const WHATSAPP_NUMBER = '919048509858';

let allProducts = [];
let activeCategory = 'all';
let searchQuery    = '';
let catMap         = {};

async function init() {
  // Pre-select category from URL param ?cat=xxx
  const catParam = new URLSearchParams(window.location.search).get('cat');
  if (catParam) activeCategory = catParam;

  showSkeleton();
  try {
    [allProducts, catMap] = await Promise.all([
      getProducts(),
      loadCategories().catch(() => ({ all: 'All Products' }))
    ]);
  } catch (err) {
    document.getElementById('productGrid').innerHTML =
      `<p style="color:#c62828;padding:20px">Failed to load products. Check internet connection.</p>`;
    return;
  }
  renderCategories();
  renderProducts();
  bindEvents();
}

function showSkeleton() {
  document.getElementById('productGrid').innerHTML = Array(4).fill(`
    <div class="skeleton-card">
      <div class="skel skel-img"></div>
      <div style="padding:16px">
        <div class="skel skel-line w80"></div>
        <div class="skel skel-line w50" style="margin-top:8px"></div>
        <div class="skel skel-line w100" style="margin-top:8px"></div>
      </div>
    </div>
  `).join('');
}

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    renderProducts();
  });
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('productModal').addEventListener('click', e => {
    if (e.target === document.getElementById('productModal')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function renderCategories() {
  // Use catMap as source of truth — deduplicated by ID, labels from Firestore
  // Order: interlock first, then stone, then rest
  const catPriority = k => {
    const lbl = (catMap[k] || k).toLowerCase();
    if (lbl.includes('interlock'))                    return 0;
    if (lbl.includes('stone') && !lbl.includes('other')) return 1;
    if (lbl.includes('stone'))                        return 2;
    return 3;
  };
  const sorted = Object.keys(catMap).filter(k => k !== 'all').sort((a, b) => catPriority(a) - catPriority(b));
  const cats = ['all', ...sorted];
  const container = document.getElementById('categoryBtns');
  container.innerHTML = cats.map(c => `
    <button class="cat-btn ${c === activeCategory ? 'active' : ''}" data-cat="${c}">
      ${catMap[c] || c}
    </button>
  `).join('');
  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      renderProducts();
    });
  });
}

function catSortPriority(p) {
  const lbl = (catMap[p.category] || p.category || '').toLowerCase();
  if (lbl.includes('interlock'))                    return 0;
  if (lbl.includes('stone') && !lbl.includes('other')) return 1;
  if (lbl.includes('stone'))                        return 2;
  return 3;
}

function filteredProducts() {
  return allProducts.filter(p => {
    const matchCat    = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      (p.description || '').toLowerCase().includes(searchQuery) ||
      (p.color || '').toLowerCase().includes(searchQuery);
    return matchCat && matchSearch && p.inStock !== false;
  }).sort((a, b) => catSortPriority(a) - catSortPriority(b));
}

function getCategoryLabel(cat) {
  return getCatLabel(cat, catMap);
}

function cardMedia(p) {
  if (p.mediaType === 'video') {
    const thumb = p.thumbnail || p.image || '';
    return `
      <div class="card-video-wrap">
        ${thumb ? `<img src="${thumb}" alt="${p.name}" loading="lazy">` : '<div class="img-placeholder cat-' + p.category + '"></div>'}
        <div class="play-overlay">
          <svg viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="30" fill="rgba(13,71,161,0.75)"/>
            <polygon points="24,18 46,30 24,42" fill="white"/>
          </svg>
        </div>
        <span class="vid-tag">VIDEO</span>
      </div>`;
  }
  return `
    <div class="card-img-wrap">
      ${p.image
        ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
        : `<div class="img-placeholder cat-${p.category}">
            <svg viewBox="0 0 80 80" fill="none" width="80">
              <rect width="80" height="80" rx="8" fill="#E3F2FD"/>
              <polygon points="40,15 65,40 40,65 15,40" fill="#1565C0" opacity="0.3"/>
              <polygon points="40,25 55,40 40,55 25,40" fill="#1565C0" opacity="0.5"/>
            </svg>
          </div>`
      }
    </div>`;
}

function renderProducts() {
  const products = filteredProducts();
  const grid  = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  const label = document.getElementById('productCountLabel');
  if (label) label.textContent = products.length + ' product' + (products.length !== 1 ? 's' : '');

  if (products.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = products.map(p => `
    <div class="product-card ${p.featured ? 'featured' : ''}" onclick="openModal('${p.id}')">
      ${cardMedia(p)}
      <span class="cat-badge">${getCategoryLabel(p.category)}</span>
      ${p.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
      <div class="card-body">
        <h3 class="card-title">${p.name}</h3>
        <p class="card-size">Size: ${p.size}</p>
        <p class="card-color">${p.color}</p>
        <p class="card-desc">${(p.description || '').substring(0, 80)}…</p>
        <div class="card-footer">
          <div class="price-stack">
            ${(() => {
              const suffix = (p.priceType || '').toLowerCase() === 'sqft' ? '/Sqft' : '/Piece';
              const r = p.priceWithPolish    > 0 ? `<span class="price-tag">₹${p.priceWithPolish} ${suffix} Polished</span>` : '';
              const u = p.priceWithoutPolish > 0
                ? `<span class="price-polish">₹${p.priceWithoutPolish} ${suffix} Unpolished</span>`
                : '<span class="price-polish">Contact for price</span>';
              return r + u;
            })()}
          </div>
          <button class="wa-btn-sm" onclick="event.stopPropagation(); whatsappEnquiry('${p.name.replace(/'/g,"\\'")}', '${p.size}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enquire
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function openModal(id) {
  window.location.href = 'product.html?id=' + encodeURIComponent(id);
}

function closeModal() {
  const modal = document.getElementById('productModal');
  const video = modal.querySelector('video');
  if (video) video.pause();
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function whatsappEnquiry(name, size) {
  const msg = encodeURIComponent(`Hello Blue Diamond Interlock!\n\nI'm interested in:\n*${name}* (Size: ${size})\n\nPlease share more details and pricing. Thank you!`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

function whatsappCall() {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank');
}

// expose for inline handlers
window.openModal       = openModal;
window.whatsappEnquiry = whatsappEnquiry;
window.whatsappCall    = whatsappCall;

document.addEventListener('DOMContentLoaded', init);
