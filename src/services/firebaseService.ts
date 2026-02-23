/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';

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

export interface Dealer {
  id?: string;
  type: 'Dealer' | 'Customer';
  name: string;
  province: string;
  city: string;
  address: string;
  phoneNumber: string;
}

export interface DispatchRecord {
  id?: string;
  dispatchNumber: string;
  indoorSerialNumber?: string;
  outdoorSerialNumber?: string;
  partyType: 'Dealer' | 'Customer';
  partyName: string;
  province?: string;
  city?: string;
  address?: string;
  phoneNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  logisticCompany?: string;
  dispatchDate: any;
  warrantyPolicy: string;
}

export const addDealer = async (dealer: Dealer) => {
  try {
    await addDoc(collection(db, 'dealers'), dealer);
    console.log('Dealer registered successfully');
  } catch (e) {
    console.error('Error adding dealer: ', e);
  }
};

export const checkDealerExists = async (name: string): Promise<boolean> => {
  const q = query(collection(db, 'dealers'), where('name', '==', name));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export const checkSerialNumberExists = async (serialNumber: string): Promise<boolean> => {
  const qIndoor = query(collection(db, 'dispatches'), where('indoorSerialNumber', '==', serialNumber));
  const qOutdoor = query(collection(db, 'dispatches'), where('outdoorSerialNumber', '==', serialNumber));
  
  const [indoorSnapshot, outdoorSnapshot] = await Promise.all([
    getDocs(qIndoor),
    getDocs(qOutdoor)
  ]);

  return !indoorSnapshot.empty || !outdoorSnapshot.empty;
};

export const subscribeToDealers = (callback: (dealers: Dealer[]) => void) => {
  const q = query(collection(db, 'dealers'), orderBy('name', 'asc'));
  return onSnapshot(q, (querySnapshot) => {
    const dealers: Dealer[] = [];
    querySnapshot.forEach((doc) => {
      dealers.push({ id: doc.id, ...doc.data() } as Dealer);
    });
    callback(dealers);
  });
};

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

export const addDispatchRecords = async (records: Omit<DispatchRecord, 'dispatchDate' | 'warrantyPolicy' | 'dispatchNumber'>[]) => {
  try {
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    
    const promises = records.map((record) => {
      const dispatchNumber = `MZ-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
      return addDoc(collection(db, 'dispatches'), {
        ...record,
        dispatchNumber,
        dispatchDate: serverTimestamp(),
        warrantyPolicy: 'New Warranty Policy (15Y/4Y)',
      });
    });
    await Promise.all(promises);
    console.log('All dispatch records added successfully');
  } catch (e) {
    console.error('Error adding multiple documents: ', e);
  }
};

export const subscribeToAllDispatches = (callback: (records: DispatchRecord[]) => void) => {
  const q = query(collection(db, 'dispatches'), orderBy('dispatchDate', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const records: DispatchRecord[] = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as DispatchRecord);
    });
    callback(records);
  });
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
