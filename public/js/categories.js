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
    const snap = await db.collection(COL).get();
    if (snap.empty) {
      list.innerHTML = '<p class="empty-msg">No categories yet. Add one above.</p>';
      return;
    }
    const docs = snap.docs
      .map(doc => ({ id: doc.id, name: doc.data().name || doc.data().label || doc.data().category || '' }))
      .filter(d => d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!docs.length) {
      list.innerHTML = '<p class="empty-msg">No categories yet. Add one above.</p>';
      return;
    }
    list.innerHTML = docs.map(d => itemHTML(d.id, d.name)).join('');
  } catch (err) {
    list.innerHTML = `<p class="empty-msg">Error: ${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function itemHTML(id, name) {
  return `
    <div class="item-row" id="row-${id}">
      <span class="item-name" id="name-${id}">${escHtml(name)}</span>
      <input class="item-edit-input" id="input-${id}" value="${escAttr(name)}" style="display:none">
      <button class="btn-edit"        id="editBtn-${id}"   onclick="startEdit('${id}')" aria-label="Edit"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="btn-save-edit"   id="saveBtn-${id}"   onclick="saveEdit('${id}')"   aria-label="Save"   style="display:none"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button>
      <button class="btn-cancel-edit" id="cancelBtn-${id}" onclick="cancelEdit('${id}')" aria-label="Cancel" style="display:none"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <button class="btn-delete"      onclick="deleteItem('${id}', '${escAttr(name)}')"  aria-label="Delete"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
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
