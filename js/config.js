// ─────────────────────────────────────────────
//  STEP 1 — Firebase
//  1. Go to https://console.firebase.google.com
//  2. Create project → Add web app → copy config below
//  3. Firestore: Build → Firestore Database → Create (production mode)
//  4. Auth: Build → Authentication → Sign-in method → Email/Password → Enable
//  5. Auth → Users → Add user  (your admin email + password)
// ─────────────────────────────────────────────
// const FIREBASE_CONFIG = {
//   apiKey:            "YOUR_API_KEY",
//   authDomain:        "YOUR_PROJECT.firebaseapp.com",
//   projectId:         "YOUR_PROJECT_ID",
//   storageBucket:     "YOUR_PROJECT.appspot.com",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId:             "YOUR_APP_ID"
// };
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyByDrvOSrRX5W261QAue83aACVE7nKdFkg",
  authDomain: "blue-diamond-3229a.firebaseapp.com",
  projectId: "blue-diamond-3229a",
  storageBucket: "blue-diamond-3229a.firebasestorage.app",
  messagingSenderId: "245929462285",
  appId: "1:245929462285:web:130ae52fa440dbdc262344",
  measurementId: "G-QP3T34FP91"
};
// ─────────────────────────────────────────────
//  STEP 2 — Cloudinary  (images + videos)
//  1. Go to https://cloudinary.com  → Sign up free
//  2. Dashboard → copy Cloud Name below
//  3. Settings → Upload → Add upload preset
//     • Signing mode: Unsigned
//     • Folder: bluediamond
//     • Copy preset name below
// ─────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "djy8ckakb";
const CLOUDINARY_UPLOAD_PRESET = "interlock";

// ─────────────────────────────────────────────
//  STEP 3 — Firestore security rules
//  Firebase Console → Firestore → Rules → paste:
//
//  rules_version = '2';
//  service cloud.firestore {
//    match /databases/{database}/documents {
//      match /products/{id} {
//        allow read: if true;
//        allow write: if request.auth != null;
//      }
//    }
//  }
// ─────────────────────────────────────────────

export { FIREBASE_CONFIG, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET };
