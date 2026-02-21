import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface DispatchRecord {
  indoorSerialNumber?: string;
  outdoorSerialNumber?: string;
  partyType: 'Dealer' | 'Customer';
  partyName: string;
  city?: string; // New field for city/region
  address?: string; // New field for address
  dispatchDate: any; // Use any for serverTimestamp
  warrantyPolicy: string;
}

export const addDispatchRecord = async (record: Omit<DispatchRecord, 'dispatchDate' | 'warrantyPolicy'>) => {
  try {
    await addDoc(collection(db, 'dispatches'), {
      ...record,
      dispatchDate: serverTimestamp(),
      warrantyPolicy: 'New Warranty Policy (15Y/4Y)',
    });
    console.log('Dispatch record added successfully');
  } catch (e) {
    console.error('Error adding document: ', e);
  }
};

export const subscribeToDispatchHistory = (callback: (records: DispatchRecord[]) => void) => {
  const q = query(collection(db, 'dispatches'), orderBy('dispatchDate', 'desc'), limit(10));
  return onSnapshot(q, (querySnapshot) => {
    const records: DispatchRecord[] = [];
    querySnapshot.forEach((doc) => {
      records.push(doc.data() as DispatchRecord);
    });
    callback(records);
  });
};
