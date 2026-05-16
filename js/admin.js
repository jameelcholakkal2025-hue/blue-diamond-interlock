// Firebase compat SDK is loaded via <script> tags in admin.html
// No ES module imports needed — works with file:// and any HTTP server

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyByDrvOSrRX5W261QAue83aACVE7nKdFkg",
  authDomain:        "blue-diamond-3229a.firebaseapp.com",
  projectId:         "blue-diamond-3229a",
  storageBucket:     "blue-diamond-3229a.firebasestorage.app",
  messagingSenderId: "245929462285",
  appId:             "1:245929462285:web:130ae52fa440dbdc262344"
};

const CLOUDINARY_CLOUD_NAME   = "djy8ckakb";
const CLOUDINARY_UPLOAD_PRESET = "interlock";

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();
const COL  = 'products';

let editingId = null;

// ── Password toggle — set up immediately, independent of auth ──
document.addEventListener('DOMContentLoaded', () => {
  let passVisible = false;
  document.getElementById('togglePass').addEventListener('click', () => {
    passVisible = !passVisible;
    document.getElementById('adminPass').type              = passVisible ? 'text' : 'password';
    document.getElementById('eyeOpen').style.display       = passVisible ? 'none' : '';
    document.getElementById('eyeClosed').style.display     = passVisible ? ''     : 'none';
  });

  // ── Login form ──
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const pass  = document.getElementById('adminPass').value;
    const errEl = document.getElementById('loginError');
    const btn   = e.target.querySelector('button[type=submit]');
    errEl.textContent = '';
    btn.textContent = 'Logging in…';
    btn.disabled = true;
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        errEl.textContent = 'Wrong email or password.';
      } else if (code === 'auth/invalid-email') {
        errEl.textContent = 'Invalid email address.';
      } else if (code === 'auth/too-many-requests') {
        errEl.textContent = 'Too many attempts. Try again later.';
      } else if (code === 'auth/user-disabled') {
        errEl.textContent = 'This account has been disabled.';
      } else if (code === 'auth/network-request-failed') {
        errEl.textContent = 'Network error. Check your connection.';
      } else if (code === 'auth/unauthorized-domain') {
        errEl.textContent = 'Domain not authorised. Add it in Firebase Console → Auth → Settings → Authorized domains.';
      } else {
        errEl.textContent = 'Login failed: ' + (code || err.message);
      }
      btn.textContent = 'Login';
      btn.disabled = false;
    }
  });

  // ── Auth state ──
  auth.onAuthStateChanged(user => {
    if (user) {
      showDash();
    } else {
      showLogin();
    }
  });

  // ── Dashboard controls ──
  document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());
  document.getElementById('addNewBtn').addEventListener('click', () => {
    window.location.href = 'add-product.html';
  });
  document.getElementById('cancelBtn').addEventListener('click', closeForm);
  document.getElementById('productForm').addEventListener('submit', handleSubmit);

  document.getElementById('mediaInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = 'Uploading 0%…';
    try {
      const result = await uploadToCloudinary(file, pct => {
        document.getElementById('progressBar').style.width = pct + '%';
        document.getElementById('progressText').textContent = `Uploading ${pct}%…`;
      });
      document.getElementById('uploadProgress').style.display = 'none';
      const preview = document.getElementById('mediaPreview');
      preview.dataset.url   = result.url;
      preview.dataset.type  = result.type;
      preview.dataset.thumb = result.thumbnail;
      preview.innerHTML = result.type === 'video'
        ? `<video src="${result.url}" controls style="max-height:150px;border-radius:8px;"></video>`
        : `<img src="${result.url}" alt="Preview" style="max-height:150px;border-radius:8px;">`;
      showToast('Uploaded!', 'success');
    } catch (err) {
      document.getElementById('uploadProgress').style.display = 'none';
      showToast(err.message, 'error');
    }
  });
});

// ── Auth UI ──
function showLogin() {
  document.getElementById('loginSection').style.display = 'flex';
  document.getElementById('dashSection').style.display  = 'none';
  document.getElementById('logoutBtn').style.display    = 'none';
}



async function showDash() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashSection').style.display  = 'block';
  document.getElementById('logoutBtn').style.display    = 'inline-block';
  await loadAdminProducts();
}

// ── Firestore CRUD ──
async function getProducts() {
  const snap = await db.collection(COL).orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addProduct(product) {
  product.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection(COL).add(product);
  return { id: ref.id, ...product };
}

async function updateProduct(id, updates) {
  await db.collection(COL).doc(id).update(updates);
}

async function deleteProduct(id) {
  await db.collection(COL).doc(id).delete();
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
        reject(new Error('Upload failed: ' + xhr.statusText));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });
}

// ── Dashboard: product table ──
async function loadAdminProducts() {
  const products = await getProducts();
  const list = document.getElementById('productList');
  document.getElementById('totalCount').textContent    = products.length;
  document.getElementById('featuredCount').textContent = products.filter(p => p.featured).length;
  document.getElementById('stockCount').textContent    = products.filter(p => p.inStock).length;

  if (!products.length) {
    list.innerHTML = '<p class="list-empty">No products yet. Add one!</p>';
    return;
  }

  list.innerHTML = products.map(p => {
    const imgHtml = p.mediaType === 'video'
      ? `<img src="${p.thumbnail || ''}" alt="${p.name}" onerror="this.style.display='none'">`
      : p.image
        ? `<img src="${p.image}" alt="${p.name}">`
        : '<div class="no-img">No Image</div>';
    const videoBadge = p.mediaType === 'video' ? '<span class="vid-badge">VIDEO</span>' : '';
    const price = [
      p.priceWithPolish    > 0 ? '₹' + p.priceWithPolish    + ' (polish)' : '',
      p.priceWithoutPolish > 0 ? '₹' + p.priceWithoutPolish + ' (no polish)' : ''
    ].filter(Boolean).join(' · ') || 'On request';
    return `
      <div class="prod-card">
        <div class="prod-card-body">
          <div class="prod-col-img">
            <div class="prod-img-wrap">${imgHtml}${videoBadge}</div>
          </div>
          <div class="prod-col-info">
            <div class="prod-name">${p.name}</div>
            <div class="prod-info-row">
              <span class="prod-info-label">Size</span>
              <span class="prod-info-val">${p.size}</span>
            </div>
            <div class="prod-info-row">
              <span class="prod-info-label">Price</span>
              <span class="prod-info-val">${price}</span>
            </div>
          </div>
        </div>
        <div class="prod-card-actions">
          <button class="btn-edit"   onclick="openForm('${p.id}')">Edit</button>
          <button class="btn-delete" onclick="confirmDelete('${p.id}', '${p.name.replace(/'/g,"\\'")}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

async function openForm(id = null) {
  if (id) {
    window.location.href = 'add-product.html?id=' + encodeURIComponent(id);
    return;
  }
  window.location.href = 'add-product.html';
}


async function confirmDelete(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await deleteProduct(id);
    showToast('Product deleted.', 'success');
    await loadAdminProducts();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

window.openForm      = openForm;
window.confirmDelete = confirmDelete;
