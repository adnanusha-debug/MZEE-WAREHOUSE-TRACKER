/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { addDispatchRecord, subscribeToDispatchHistory, DispatchRecord } from './services/firebaseService';
import { motion } from 'motion/react';
import { ChevronDown, Scan, History } from 'lucide-react';
import { PAKISTANI_CITIES } from './constants';

export default function App() {
  const [partyType, setPartyType] = useState<'Dealer' | 'Customer'>('Dealer');
  const [partyName, setPartyName] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [indoorSerialNumber, setIndoorSerialNumber] = useState<string>('');
  const [outdoorSerialNumber, setOutdoorSerialNumber] = useState<string>('');
  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>('Syncing...');

  useEffect(() => {
    const unsubscribe = subscribeToDispatchHistory((records) => {
      setDispatchHistory(records);
      setSyncStatus('Live Sync: OK');
    });
    return () => unsubscribe();
  }, []);

  const handleScan = async () => {
    if (partyName && (indoorSerialNumber || outdoorSerialNumber)) {
      await addDispatchRecord({ indoorSerialNumber, outdoorSerialNumber, partyType, partyName, city, address });
      setIndoorSerialNumber('');
      setOutdoorSerialNumber('');
      setCity('');
      setAddress('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center p-4 font-sans bg-[var(--bg)] text-[var(--ink)]"
    >
      <header className="w-full max-w-2xl bg-white shadow-md rounded-xl p-4 mb-6 flex justify-between items-center border border-[var(--line)]">
        <h1 className="text-2xl font-bold text-[var(--ink)]">MZEE Warehouse</h1>
        <span className="text-sm text-[var(--color-secondary)]">{syncStatus}</span>
      </header>

      <main className="w-full max-w-2xl bg-white shadow-md rounded-xl p-6 mb-6 border border-[var(--line)]">
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-2">Step 1: Party Selection</h2>
          <div className="relative mb-4">
            <select
              id="partyType"
              className="w-full p-3 border border-[var(--line)] rounded-lg pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)]"
              value={partyType}
              onChange={(e) => setPartyType(e.target.value as 'Dealer' | 'Customer')}
            >
              <option value="Dealer">Dealer</option>
              <option value="Customer">Customer</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" size={20} />
          </div>
          <input
            type="text"
            id="partyName"
            className="w-full p-3 border border-[var(--line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)]"
            placeholder={partyType === 'Dealer' ? 'Select Dealer (e.g., Al-Madina Electronics)' : 'Enter Customer Name'}
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
          />
          {partyType === 'Dealer' && (
            <div className="relative mt-4">
              <select
                id="city"
                className="w-full p-3 border border-[var(--line)] rounded-lg pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)]"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Select City</option>
                {PAKISTANI_CITIES.map((cityName) => (
                  <option key={cityName} value={cityName}>{cityName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" size={20} />
            </div>
          )}
          <input
            type="text"
            id="address"
            className="w-full p-3 border border-[var(--line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] mt-4"
            placeholder="Enter Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--ink)] mb-2">Step 2: Barcode Input</h2>
          <div className="relative mb-4">
            <input
              type="text"
              id="indoorScannerField"
              className="w-full p-3 border border-[var(--line)] rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)]"
              placeholder="Scan Indoor Unit Barcode..."
              value={indoorSerialNumber}
              onChange={(e) => setIndoorSerialNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleScan();
                }
              }}
            />
            <Scan className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" size={20} />
          </div>
          <div className="relative">
            <input
              type="text"
              id="outdoorScannerField"
              className="w-full p-3 border border-[var(--line)] rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)]"
              placeholder="Scan Outdoor Unit Barcode..."
              value={outdoorSerialNumber}
              onChange={(e) => setOutdoorSerialNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleScan();
                }
              }}
            />
            <Scan className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" size={20} />
          </div>
          <button
            onClick={handleScan}
            className="mt-4 w-full bg-[var(--color-accent)] text-white p-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors duration-200"
          >
            Dispatch Unit
          </button>
        </section>
      </main>

      <footer className="w-full max-w-2xl bg-white shadow-md rounded-xl p-6 border border-[var(--line)]">
        <h2 className="text-lg font-semibold text-[var(--ink)] mb-4 flex items-center"><History className="mr-2 text-[var(--color-secondary)]" size={20} /> Dispatch History</h2>
        {
          dispatchHistory.length === 0 ? (
            <p className="text-[var(--color-secondary)]">No dispatches yet.</p>
          ) : (
            <ul className="space-y-3">
              {dispatchHistory.map((record, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-gray-50 p-3 rounded-lg border border-[var(--line)] text-sm text-[var(--ink)] data-row"
                >
                  {record.indoorSerialNumber && <p className="data-value"><span className="font-medium">Indoor S/N:</span> {record.indoorSerialNumber}</p>}
                  {record.outdoorSerialNumber && <p className="data-value"><span className="font-medium">Outdoor S/N:</span> {record.outdoorSerialNumber}</p>}
                  <p className="data-value"><span className="font-medium">Party:</span> {record.partyName} ({record.partyType}) {record.city && ` - ${record.city}`}</p>
                  {record.address && <p className="data-value"><span className="font-medium">Address:</span> {record.address}</p>}
                  <p className="data-value"><span className="font-medium">Date:</span> {new Date(record.dispatchDate?.toDate()).toLocaleString()}</p>
                  <p className="data-value"><span className="font-medium">Warranty:</span> {record.warrantyPolicy}</p>
                </motion.li>
              ))}
            </ul>
          )
        }
      </footer>
    </motion.div>
  );
}
