const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyByDrvOSrRX5W261QAue83aACVE7nKdFkg",
  authDomain:        "blue-diamond-3229a.firebaseapp.com",
  projectId:         "blue-diamond-3229a",
  storageBucket:     "blue-diamond-3229a.firebasestorage.app",
  messagingSenderId: "245929462285",
  appId:             "1:245929462285:web:130ae52fa440dbdc262344"
};

const CLOUDINARY_CLOUD_NAME    = "djy8ckakb";
const CLOUDINARY_UPLOAD_PRESET = "interlock";

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();

async function loadCategories() {
  const snap = await firebase.firestore().collection('categories').get();
  const map = {};
  snap.docs.forEach(d => {
    const data = d.data();
    map[d.id] = data.name || data.label || data.category || d.id;
  });
  return map;
}

// Detect edit mode via ?id= query param
const editId = new URLSearchParams(window.location.search).get('id');
const isEdit = !!editId;

// mediaFiles: [{ url, type, thumbnail } | null]
let mediaFiles   = [];
let primaryIndex = 0;

// ── Auth guard ──
auth.onAuthStateChanged(async user => {
  if (!user) {
    // Firebase may fire null briefly before restoring a cached session.
    // Wait 600ms then check currentUser before redirecting.
    await new Promise(r => setTimeout(r, 600));
    if (!auth.currentUser) { window.location.href = 'admin.html'; }
    return;
  }
  document.getElementById('authGuard').style.display  = 'none';
  document.getElementById('pageContent').style.display = 'block';

  // Populate category select from Firestore
  const catMap = await loadCategories();
  const sel = document.getElementById('fCategory');
  sel.innerHTML = '<option value="">Select category</option>' +
    Object.entries(catMap)
      .filter(([id]) => id !== 'all')
      .map(([id, label]) => `<option value="${id}">${label}</option>`)
      .join('');

  // Populate color chips from Firestore colors collection
  const chipsWrap = document.getElementById('colorChips');
  try {
    const colorSnap = await firebase.firestore().collection('colors').get();
    if (colorSnap.empty) {
      chipsWrap.innerHTML = '<input type="text" id="fColorFallback" placeholder="e.g. Terracotta Red" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;font-size:0.9rem"><small style="color:#999">No colors in Firestore — type manually</small>';
    } else {
      chipsWrap.innerHTML = colorSnap.docs.map(d => {
        const label = d.data().label || d.data().name || d.id;
        return `<label class="color-chip">
          <input type="checkbox" name="fColors" value="${label}">
          <span>${label}</span>
        </label>`;
      }).join('');
    }
  } catch (e) {
    console.error('Colors fetch error:', e.code, e.message);
    // Fallback: text input — likely Firestore rules block colors collection
    chipsWrap.innerHTML = `<input type="text" id="fColorFallback" placeholder="e.g. Terracotta Red" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;font-size:0.9rem"><small style="color:#c62828">Add Firestore rule: allow read for /colors/{doc} — error: ${e.code || e.message}</small>`;
  }

  if (isEdit) {
    document.getElementById('pageTitle').textContent = 'Edit Product';
    document.getElementById('saveBtn').textContent   = 'Update Product';
    await loadProductForEdit(editId);
  }
});

// ── Load existing product into form ──
async function loadProductForEdit(id) {
  const snap = await db.collection('products').doc(id).get();
  if (!snap.exists) { showToast('Product not found', 'error'); return; }
  const p = { id: snap.id, ...snap.data() };

  document.getElementById('fName').value        = p.name     || '';
  document.getElementById('fCategory').value    = p.category || '';
  document.getElementById('fSize').value        = p.size     || '';
  document.getElementById('fDesc').value = p.description || '';

  if ((p.priceType || '').toLowerCase() === 'sqft') {
    document.getElementById('priceTypeSqft').checked  = true;
    document.getElementById('priceTypePiece').checked = false;
    document.getElementById('pricePieceFields').style.display = 'none';
    document.getElementById('priceSqftFields').style.display  = '';
    document.getElementById('fRatePolish').value = p.priceWithPolish    || 0;
    document.getElementById('fRate').value       = p.priceWithoutPolish || 0;
    updateSqftPreview();
  } else {
    document.getElementById('fPricePolish').value = p.priceWithPolish    || 0;
    document.getElementById('fPrice').value       = p.priceWithoutPolish || 0;
  }

  // Pre-select saved colors
  const savedColors = p.colors || (p.color ? [p.color] : []);
  document.querySelectorAll('input[name="fColors"]').forEach(cb => {
    cb.checked = savedColors.includes(cb.value);
  });
  document.getElementById('fFeatured').checked = !!p.featured;
  document.getElementById('fInStock').checked  = p.inStock !== false;

  // Load existing images into grid
  const allImgs = p.images && p.images.length ? p.images : (p.image ? [p.image] : []);
  const primaryUrl = p.image || '';

  allImgs.forEach((url, i) => {
    const media = { url, type: 'image', thumbnail: url };
    mediaFiles.push(media);
    if (url === primaryUrl) primaryIndex = i;
    renderThumb(i, media);
  });
}

// ── Price type toggle ──
function parseSizeSqFt(sizeStr) {
  const nums = (sizeStr || '').match(/[\d.]+/g);
  if (!nums || nums.length < 2) return null;
  return (parseFloat(nums[0]) * parseFloat(nums[1])) / 144; // inches → sq ft
}

function updateSqftPreview() {
  const ratePolish = parseFloat(document.getElementById('fRatePolish').value) || 0;
  const rate       = parseFloat(document.getElementById('fRate').value)       || 0;
  const sqft       = parseSizeSqFt(document.getElementById('fSize').value);
  const wrap       = document.getElementById('sqftPreviewWrap');
  const preview    = document.getElementById('sqftCalcPreview');
  if (sqft && (ratePolish || rate)) {
    const withP    = Math.round(ratePolish * sqft);
    const withoutP = Math.round(rate * sqft);
    preview.textContent = `Size: ${sqft.toFixed(3)} sq ft  →  Polished: ₹${withP}  |  Unpolished: ₹${withoutP}`;
    wrap.style.display = '';
  } else {
    wrap.style.display = 'none';
  }
}

document.querySelectorAll('input[name="priceType"]').forEach(r => {
  r.addEventListener('change', () => {
    const isSqft = document.getElementById('priceTypeSqft').checked;
    document.getElementById('pricePieceFields').style.display = isSqft ? 'none' : '';
    document.getElementById('priceSqftFields').style.display  = isSqft ? ''     : 'none';
    if (isSqft) updateSqftPreview();
  });
});

['fRatePolish', 'fRate', 'fSize'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    if (document.getElementById('priceTypeSqft').checked) updateSqftPreview();
  });
});

// ── Open file picker ──
document.getElementById('mediaAddBtn').addEventListener('click', () => {
  document.getElementById('mediaInput').click();
});

// ── File selected — upload each ──
document.getElementById('mediaInput').addEventListener('change', async e => {
  const files = Array.from(e.target.files);
  e.target.value = '';
  for (const file of files) {
    await uploadOne(file);
  }
});

async function uploadOne(file) {
  const idx = mediaFiles.length;
  mediaFiles.push(null);

  const placeholder = document.createElement('div');
  placeholder.className = 'media-thumb-uploading';
  placeholder.id = `placeholder-${idx}`;
  placeholder.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#90A4AE" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
    <div class="mini-progress"><div class="mini-progress-bar" id="bar-${idx}"></div></div>
    <span id="pct-${idx}">0%</span>`;
  document.getElementById('mediaAddBtn').before(placeholder);

  try {
    const fileToUpload = await compressIfNeeded(file);
    const result = await uploadToCloudinary(fileToUpload, pct => {
      const bar   = document.getElementById(`bar-${idx}`);
      const pctEl = document.getElementById(`pct-${idx}`);
      if (bar)   bar.style.width     = pct + '%';
      if (pctEl) pctEl.textContent   = pct + '%';
    });
    mediaFiles[idx] = result;
    if (mediaFiles.filter(Boolean).length === 1) primaryIndex = idx;
    placeholder.remove();
    renderThumb(idx, result);
  } catch (err) {
    placeholder.remove();
    mediaFiles[idx] = null;
    showToast('Upload failed: ' + err.message, 'error');
  }
}

function renderThumb(idx, media) {
  const isPrimary = idx === primaryIndex;
  const thumb = document.createElement('div');
  thumb.className = 'media-thumb' + (isPrimary ? ' primary' : '');
  thumb.id = `thumb-${idx}`;
  thumb.title = 'Tap to set as primary';

  const src = media.thumbnail || media.url;
  thumb.innerHTML = `
    <img src="${src}" alt="Media ${idx + 1}">
    <button class="media-remove" title="Remove" onclick="removeMedia(event,${idx})">×</button>
    <div class="primary-badge">Primary</div>`;

  thumb.addEventListener('click', () => setPrimary(idx));
  document.getElementById('mediaAddBtn').before(thumb);
}

function setPrimary(idx) {
  if (!mediaFiles[idx]) return;
  primaryIndex = idx;
  document.querySelectorAll('.media-thumb').forEach(el => el.classList.remove('primary'));
  const t = document.getElementById(`thumb-${idx}`);
  if (t) t.classList.add('primary');
}

function removeMedia(e, idx) {
  e.stopPropagation();
  mediaFiles[idx] = null;
  const thumb = document.getElementById(`thumb-${idx}`);
  if (thumb) thumb.remove();
  const remaining = mediaFiles.map((m, i) => m ? i : null).filter(i => i !== null);
  if (remaining.length && primaryIndex === idx) {
    primaryIndex = remaining[0];
    const first = document.getElementById(`thumb-${primaryIndex}`);
    if (first) first.classList.add('primary');
  }
}

// ── Form submit (add or update) ──
document.getElementById('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('saveBtn');
  const validMedia  = mediaFiles.filter(Boolean);
  const primaryMedia = mediaFiles[primaryIndex] || validMedia[0] || null;

  btn.textContent = isEdit ? 'Updating…' : 'Saving…';
  btn.disabled = true;

  const isSqft = document.getElementById('priceTypeSqft').checked;
  const sizeVal = document.getElementById('fSize').value.trim();
  const priceWithPolish    = isSqft
    ? (parseFloat(document.getElementById('fRatePolish').value) || 0)
    : (parseInt(document.getElementById('fPricePolish').value)  || 0);
  const priceWithoutPolish = isSqft
    ? (parseFloat(document.getElementById('fRate').value)       || 0)
    : (parseInt(document.getElementById('fPrice').value)        || 0);

  const product = {
    name:              document.getElementById('fName').value.trim(),
    category:          document.getElementById('fCategory').value,
    size:              sizeVal,
    priceType:         isSqft ? 'sqft' : 'piece',
    priceWithPolish,
    priceWithoutPolish,
    ratePerSqFt:           firebase.firestore.FieldValue.delete(),
    ratePerSqFtWithPolish: firebase.firestore.FieldValue.delete(),
    colors:      (() => {
      const chips = Array.from(document.querySelectorAll('input[name="fColors"]:checked')).map(cb => cb.value);
      if (chips.length) return chips;
      const fallback = document.getElementById('fColorFallback');
      return fallback && fallback.value.trim() ? [fallback.value.trim()] : [];
    })(),
    color:       (() => {
      const chips = Array.from(document.querySelectorAll('input[name="fColors"]:checked')).map(cb => cb.value);
      if (chips.length) return chips.join(', ');
      const fallback = document.getElementById('fColorFallback');
      return fallback ? fallback.value.trim() : '';
    })(),
    description: document.getElementById('fDesc').value.trim(),
    featured:    document.getElementById('fFeatured').checked,
    inStock:     document.getElementById('fInStock').checked,
    mediaType:   primaryMedia ? primaryMedia.type  : 'image',
    image:       primaryMedia ? primaryMedia.url    : '',
    thumbnail:   primaryMedia ? primaryMedia.thumbnail : '',
    images:      validMedia.map(m => m.url)
  };

  try {
    if (isEdit) {
      await db.collection('products').doc(editId).update(product);
      showToast('Product updated!', 'success');
    } else {
      // FieldValue.delete() not valid on add — strip before creating
      delete product.ratePerSqFt;
      delete product.ratePerSqFtWithPolish;
      product.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(product);
      showToast('Product added!', 'success');
    }
    setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    btn.textContent = isEdit ? 'Update Product' : 'Save Product';
    btn.disabled = false;
  }
});

// ── Image compression (canvas binary-search, images only) ──
const COMPRESS_LIMIT = 1 * 1024 * 1024; // 1 MB

function loadImageEl(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = rej;
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
}

async function compressIfNeeded(file) {
  if (!file.type.startsWith('image') || file.size <= COMPRESS_LIMIT) return file;

  const img    = await loadImageEl(file);
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);

  // Binary search: highest JPEG quality that fits COMPRESS_LIMIT
  let lo = 0.10, hi = 0.92, best = null;
  for (let i = 0; i < 8; i++) {
    const mid  = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, mid);
    if (blob.size <= COMPRESS_LIMIT) { best = blob; lo = mid; }
    else                             {              hi = mid; }
  }
  // Fallback: force minimum quality if still too large
  if (!best) best = await canvasToBlob(canvas, 0.10);

  const name = file.name.replace(/\.[^.]+$/, '.jpg');
  return new File([best], name, { type: 'image/jpeg' });
}

// ── Cloudinary upload ──
async function uploadToCloudinary(file, onProgress) {
  const MAX = 100 * 1024 * 1024;
  if (file.size > MAX) throw new Error('File too large. Max 100 MB.');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'bluediamond');
  return new Promise((resolve, reject) => {
    const xhr  = new XMLHttpRequest();
    const type = file.type.startsWith('video') ? 'video' : 'image';
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url:       data.secure_url,
          publicId:  data.public_id,
          type:      data.resource_type,
          thumbnail: data.resource_type === 'video'
            ? data.secure_url.replace('/upload/', '/upload/so_0,w_400,h_300,c_fill/')
            : data.secure_url
        });
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try { const err = JSON.parse(xhr.responseText); if (err.error?.message) msg = err.error.message; } catch (_) {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

window.removeMedia = removeMedia;
