// Shared categories cache — fetches once from Firestore, reuses across the session
let _catCache = null;

async function loadCategories() {
  if (_catCache) return _catCache;
  try {
    const snap = await firebase.firestore().collection('categories').get();
    _catCache = { all: 'All Products' };
    snap.docs.forEach(d => {
      _catCache[d.id] = d.data().label || d.id;
    });
  } catch (e) {
    // categories fetch failed — degrade gracefully, labels fall back to raw IDs
    _catCache = { all: 'All Products' };
  }
  return _catCache;
}

function getCatLabel(cat, catMap) {
  if (!cat) return '';
  return (catMap && catMap[cat]) || cat;
}

window.loadCategories = loadCategories;
window.getCatLabel    = getCatLabel;
