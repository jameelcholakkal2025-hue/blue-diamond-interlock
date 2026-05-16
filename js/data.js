import { FIREBASE_CONFIG, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './config.js';
import { initializeApp }                    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, doc,
         getDocs, addDoc, updateDoc,
         deleteDoc, query, orderBy,
         serverTimestamp }                  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }      from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ── Init ──
const app  = initializeApp(FIREBASE_CONFIG);
const db   = getFirestore(app);
const auth = getAuth(app);
const COL  = 'products';

// ── Auth ──
async function adminLogin(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

async function adminLogout() {
  await signOut(auth);
}

function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Firestore CRUD ──
async function getProducts() {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addProduct(product) {
  product.createdAt = serverTimestamp();
  const ref = await addDoc(collection(db, COL), product);
  return { id: ref.id, ...product };
}

async function updateProduct(id, updates) {
  await updateDoc(doc(db, COL, id), updates);
}

async function deleteProduct(id) {
  await deleteDoc(doc(db, COL, id));
}

// ── Cloudinary upload (images + videos) ──
async function uploadToCloudinary(file, onProgress) {
  const MAX = 100 * 1024 * 1024; // 100 MB
  if (file.size > MAX) throw new Error('File too large. Max 100 MB.');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'bluediamond');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const type = file.type.startsWith('video') ? 'video' : 'image';
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
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

export {
  adminLogin, adminLogout, onAuthChange,
  getProducts, addProduct, updateProduct, deleteProduct,
  uploadToCloudinary
};
