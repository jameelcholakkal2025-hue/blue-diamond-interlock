firebase.initializeApp({
  apiKey: "AIzaSyByDrvOSrRX5W261QAue83aACVE7nKdFkg",
  authDomain: "blue-diamond-3229a.firebaseapp.com",
  projectId: "blue-diamond-3229a",
  storageBucket: "blue-diamond-3229a.firebasestorage.app",
  messagingSenderId: "245929462285",
  appId: "1:245929462285:web:130ae52fa440dbdc262344"
});

const auth = firebase.auth();
const db = firebase.firestore();
const COL = 'categories';

auth.onAuthStateChanged(async user => {
  if (!user) {
    await new Promise(r => setTimeout(r, 600));
    if (!auth.currentUser) { window.location.href = 'admin.html'; return; }
  }
  document.getElementById('authGuard').style.display = 'none';
  document.getElementById('pageContent').style.display = 'block';
  loadCategories();
});

document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
document.getElementById('newCategoryName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCategory();
});

async function loadCategories() {
  const list = document.getElementById('categoryList');
  try {
    const snap = await db.collection(COL).orderBy('name').get();
    if (snap.empty) {
      list.innerHTML = '<p class="empty-msg">No categories yet. Add one above.</p>';
      return;
    }
    list.innerHTML = snap.docs.map(doc => itemHTML(doc.id, doc.data().name)).join('');
  } catch (err) {
    list.innerHTML = '<p class="empty-msg">Error loading categories.</p>';
    showToast(err.message, 'error');
  }
}

function itemHTML(id, name) {
  return `
    <div class="item-row" id="row-${id}">
      <span class="item-name" id="name-${id}">${escHtml(name)}</span>
      <input class="item-edit-input" id="input-${id}" value="${escAttr(name)}" style="display:none">
      <button class="btn-edit"        id="editBtn-${id}"   onclick="startEdit('${id}')">Edit</button>
      <button class="btn-save-edit"   id="saveBtn-${id}"   onclick="saveEdit('${id}')" style="display:none">Save</button>
      <button class="btn-cancel-edit" id="cancelBtn-${id}" onclick="cancelEdit('${id}')" style="display:none">✕</button>
      <button class="btn-delete"      onclick="deleteItem('${id}', '${escAttr(name)}')">Delete</button>
    </div>`;
}

function startEdit(id) {
  document.getElementById('name-' + id).style.display = 'none';
  document.getElementById('input-' + id).style.display = '';
  document.getElementById('editBtn-' + id).style.display = 'none';
  document.getElementById('saveBtn-' + id).style.display = '';
  document.getElementById('cancelBtn-' + id).style.display = '';
  document.getElementById('input-' + id).focus();
}

function cancelEdit(id) {
  document.getElementById('name-' + id).style.display = '';
  document.getElementById('input-' + id).style.display = 'none';
  document.getElementById('editBtn-' + id).style.display = '';
  document.getElementById('saveBtn-' + id).style.display = 'none';
  document.getElementById('cancelBtn-' + id).style.display = 'none';
}

async function saveEdit(id) {
  const val = document.getElementById('input-' + id).value.trim();
  if (!val) { showToast('Name cannot be empty.', 'error'); return; }
  try {
    await db.collection(COL).doc(id).update({ name: val });
    document.getElementById('name-' + id).textContent = val;
    cancelEdit(id);
    showToast('Category updated.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function addCategory() {
  const input = document.getElementById('newCategoryName');
  const name = input.value.trim();
  if (!name) { showToast('Enter a category name.', 'error'); return; }
  try {
    const ref = await db.collection(COL).add({ name });
    document.getElementById('categoryList').insertAdjacentHTML('afterbegin', itemHTML(ref.id, name));
    input.value = '';
    showToast('Category added.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteItem(id, name) {
  if (!confirm(`Delete category "${name}"?`)) return;
  try {
    await db.collection(COL).doc(id).delete();
    document.getElementById('row-' + id).remove();
    const list = document.getElementById('categoryList');
    if (!list.children.length) list.innerHTML = '<p class="empty-msg">No categories yet. Add one above.</p>';
    showToast('Category deleted.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

window.startEdit = startEdit;
window.cancelEdit = cancelEdit;
window.saveEdit = saveEdit;
window.deleteItem = deleteItem;
