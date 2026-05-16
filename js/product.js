const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyByDrvOSrRX5W261QAue83aACVE7nKdFkg",
  authDomain:        "blue-diamond-3229a.firebaseapp.com",
  projectId:         "blue-diamond-3229a",
  storageBucket:     "blue-diamond-3229a.firebasestorage.app",
  messagingSenderId: "245929462285",
  appId:             "1:245929462285:web:130ae52fa440dbdc262344"
};

const WHATSAPP_NUMBER = '919048509858';

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

let slideImages   = [];
let slideIndex    = 0;
let slideTimer    = null;
let resumeTimer   = null;
const SLIDE_MS    = 3500;
const RESUME_MS   = 5000;

async function init() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'catalogue.html'; return; }

  try {
    const snap = await db.collection('products').doc(id).get();
    if (!snap.exists) { window.location.href = 'catalogue.html'; return; }
    render({ id: snap.id, ...snap.data() });
  } catch (err) {
    document.getElementById('loading').innerHTML =
      '<p style="color:#c62828">Failed to load product. Check connection.</p>';
  }
}

function render(p) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
  document.title = p.name + ' – Blue Diamond';

  // Build image list: use images[] array, fall back to single image
  const images = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
  const primaryUrl = p.image || images[0] || '';

  // Hero
  const heroImg = document.getElementById('heroImg');
  if (p.mediaType === 'video' && p.image) {
    document.getElementById('heroWrap').innerHTML =
      `<video src="${p.image}" controls autoplay muted playsinline
        style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
  } else {
    heroImg.src = primaryUrl;
    heroImg.alt = p.name;
  }

  // Thumbnail strip + auto-slide — only if multiple images
  if (images.length > 1) {
    slideImages = images;
    slideIndex  = images.indexOf(primaryUrl);
    if (slideIndex < 0) slideIndex = 0;

    const strip = document.getElementById('thumbStrip');
    strip.innerHTML = images.map((url, i) => `
      <div class="thumb-item ${i === slideIndex ? 'active' : ''}"
           onclick="manualSlide(${i})">
        <img src="${url}" alt="${p.name} photo ${i + 1}" loading="lazy">
      </div>
    `).join('');
    document.getElementById('thumbWrap').style.display = 'block';
    startSlide();
  }

  // Info fields
  const catLabel = getCategoryLabel(p.category);
  document.getElementById('prodCategory').textContent = catLabel;
  document.getElementById('prodCat2').textContent     = catLabel;
  document.getElementById('prodName').textContent     = p.name;
  // Price with polish shown first
  const polishEl    = document.getElementById('prodPricePolish');
  const noPolishEl  = document.getElementById('prodPrice');

  if (p.priceWithPolish > 0) {
    polishEl.textContent   = '₹' + p.priceWithPolish + '/sqft (with polish)';
    polishEl.style.display = 'block';
  }
  noPolishEl.textContent = p.priceWithoutPolish > 0
    ? '₹' + p.priceWithoutPolish + '/sqft (without polish)'
    : 'Contact for price';
  document.getElementById('prodSize').textContent     = p.size  || '—';
  document.getElementById('prodColor').textContent    = p.color || '—';
  document.getElementById('prodStock').textContent    = p.inStock !== false ? 'In Stock' : 'Out of Stock';
  document.getElementById('prodStock').style.color    = p.inStock !== false ? '#2e7d32' : '#c62828';
  document.getElementById('prodDesc').textContent     = p.description || '';

  document.getElementById('waEnquire').onclick = () => whatsappEnquiry(p.name, p.size);
}

function goToSlide(idx) {
  if (!slideImages.length) return;
  slideIndex = (idx + slideImages.length) % slideImages.length;
  const url  = slideImages[slideIndex];

  const wrap = document.getElementById('heroWrap');
  const img  = wrap.querySelector('img');
  if (img) {
    img.style.opacity = '0';
    setTimeout(() => { img.src = url; img.style.opacity = '1'; }, 150);
  }

  const thumbs = document.querySelectorAll('.thumb-item');
  thumbs.forEach((t, i) => t.classList.toggle('active', i === slideIndex));

  // Scroll active thumb into view
  if (thumbs[slideIndex]) {
    thumbs[slideIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function startSlide() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => goToSlide(slideIndex + 1), SLIDE_MS);
}

function manualSlide(idx) {
  clearInterval(slideTimer);
  clearTimeout(resumeTimer);
  goToSlide(idx);
  resumeTimer = setTimeout(startSlide, RESUME_MS);
}

function setHero(url, el) {
  // Legacy — kept for safety; manualSlide handles thumb clicks now
  const idx = slideImages.indexOf(url);
  if (idx >= 0) manualSlide(idx);
}

function getCategoryLabel(cat) {
  return { interlock: 'Interlock', natural: 'Natural Stone', blocks: 'Block' }[cat] || (cat || '');
}

function whatsappEnquiry(name, size) {
  const msg = encodeURIComponent(
    `Hello Blue Diamond Interlock!\n\nI'm interested in:\n*${name}* (Size: ${size})\n\nPlease share more details and pricing. Thank you!`
  );
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

function whatsappCall() {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank');
}

window.setHero      = setHero;
window.manualSlide  = manualSlide;
window.whatsappCall = whatsappCall;

document.addEventListener('DOMContentLoaded', init);
