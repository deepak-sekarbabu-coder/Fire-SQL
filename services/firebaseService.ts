import { initializeApp, FirebaseApp, getApps, deleteApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  WhereFilterOp
} from 'firebase/firestore';
import { FirebaseConfig } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

export const initializeFirebase = (config: FirebaseConfig) => {
  // If an app already exists, delete it to allow re-configuration
  if (getApps().length > 0) {
    const currentApp = getApps()[0];
    deleteApp(currentApp).catch(console.error);
  }

  try {
    app = initializeApp(config);
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Firebase Init Error", e);
    return false;
  }
};

export const isFirebaseInitialized = () => !!db;

// --- Core Operations ---

export const executeSelect = async (colName: string, whereClause?: { field: string, op: string, value: any }) => {
  if (!db) throw new Error("Database not connected");

  const colRef = collection(db, colName);
  let q = query(colRef);

  if (whereClause) {
    // Map SQL operators to Firestore operators
    const opMap: Record<string, WhereFilterOp> = {
      '=': '==',
      '==': '==',
      '>': '>',
      '<': '<',
      '>=': '>=',
      '<=': '<=',
      '!=': '!=',
      'array-contains': 'array-contains'
    };

    const fsOp = opMap[whereClause.op];
    if (!fsOp) throw new Error(`Unsupported operator: ${whereClause.op}`);

    let val = whereClause.value;
    // Basic type inference for the value
    if (val === 'true') val = true;
    if (val === 'false') val = false;
    if (!isNaN(Number(val)) && val !== '') val = Number(val);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);

    q = query(colRef, where(whereClause.field, fsOp, val));
  }

  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return rows;
};

export const executeInsert = async (colName: string, data: any) => {
  if (!db) throw new Error("Database not connected");
  const colRef = collection(db, colName);
  const docRef = await addDoc(colRef, data);
  return { id: docRef.id, ...data };
};

export const executeUpdate = async (colName: string, docId: string, data: any) => {
  if (!db) throw new Error("Database not connected");
  const docRef = doc(db, colName, docId);
  await updateDoc(docRef, data);
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() };
};

export const executeDelete = async (colName: string, docId: string) => {
  if (!db) throw new Error("Database not connected");
  const docRef = doc(db, colName, docId);
  await deleteDoc(docRef);
  return docId;
};
