// Shared categories cache — fetches once from Firestore, reuses across the session
let _catCache = null;

async function loadCategories() {
  if (_catCache) return _catCache;
  const snap = await firebase.firestore()
    .collection('categories')
    .orderBy('label')
    .get();
  _catCache = { all: 'All Products' };
  snap.docs.forEach(d => {
    _catCache[d.id] = d.data().label || d.id;
  });
  return _catCache;
}

function getCatLabel(cat, catMap) {
  if (!cat) return '';
  return (catMap && catMap[cat]) || cat;
}

window.loadCategories = loadCategories;
window.getCatLabel    = getCatLabel;
