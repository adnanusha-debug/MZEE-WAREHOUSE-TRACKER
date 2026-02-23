/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { addDispatchRecords, subscribeToDispatchHistory, DispatchRecord, addDealer, subscribeToDealers, Dealer, subscribeToAllDispatches, checkDealerExists, checkSerialNumberExists } from './services/firebaseService';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ChevronDown, Scan, History, Trash2, Send, UserPlus, Package, Truck, Phone, MapPin, Database, Printer, X, Search, Camera } from 'lucide-react';
import { PAKISTAN_REGIONS } from './constants';

interface PendingUnit {
  id: string;
  indoor?: string;
  outdoor?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'dealers' | 'database'>('dispatch');
  const [partyType, setPartyType] = useState<'Dealer' | 'Customer'>('Dealer');
  const [partyName, setPartyName] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [logisticCompany, setLogisticCompany] = useState<string>('');
  
  const [scannerInput, setScannerInput] = useState<string>('');
  const [indoorScans, setIndoorScans] = useState<string[]>([]);
  const [outdoorScans, setOutdoorScans] = useState<string[]>([]);
  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>([]);
  const [allDispatches, setAllDispatches] = useState<DispatchRecord[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>('Syncing...');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Print Preview State
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchRecord | null>(null);

  // Dealer Registration State
  const [newDealer, setNewDealer] = useState<Dealer>({ type: 'Dealer', name: '', province: '', city: '', address: '', phoneNumber: '' });

  const handleScan = useCallback(async (e: React.KeyboardEvent | { key: string, target: { value: string } }) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const code = e.target.value.trim();
      setScannerInput(''); // Clear input immediately after processing

      const isOutdoor = /^O/i.test(code) || /OUT/i.test(code);
      const isIndoor = /^I/i.test(code) || /IN/i.test(code);

      if (isOutdoor) {
        const exists = await checkSerialNumberExists(code);
        if (exists) {
          alert(`Outdoor serial number '${code}' already exists!`);
          return;
        }
        if (!outdoorScans.includes(code)) {
          setOutdoorScans(prev => [...prev, code]);
        }
      } else if (isIndoor) {
        const exists = await checkSerialNumberExists(code);
        if (exists) {
          alert(`Indoor serial number '${code}' already exists!`);
          return;
        }
        if (!indoorScans.includes(code)) {
          setIndoorScans(prev => [...prev, code]);
        }
      } else {
        alert(`Invalid barcode format for: ${code}. Must start with 'I' (Indoor) or 'O' (Outdoor).`);
      }
    }
  }, [indoorScans, outdoorScans]); // Dependencies for useCallback

  useEffect(() => {
    const unsubHistory = subscribeToDispatchHistory((records) => {
      setDispatchHistory(records);
      setSyncStatus('Live Sync: OK');
    });
    const unsubDealers = subscribeToDealers((data) => {
      setDealers(data);
    });
    const unsubAll = subscribeToAllDispatches((data) => {
      setAllDispatches(data);
    });

    let html5QrcodeScanner: Html5QrcodeScanner | undefined;

    if (isScanning) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          disableFlip: false,
        },
        /* verbose= */ false
      );
      html5QrcodeScanner.render((decodedText, decodedResult) => {
        // Simulate a keyboard event for consistency with existing handleScan logic
        handleScan({ key: 'Enter', target: { value: decodedText } } as React.KeyboardEvent);
      }, (errorMessage) => {
        // console.warn(errorMessage);
      });
    }

    return () => {
      unsubHistory();
      unsubDealers();
      unsubAll();
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner", error);
        });
      }
    };
  }, [isScanning, handleScan]);

  const handleDealerSelect = (dealerName: string) => {
    setPartyName(dealerName);
    const dealer = dealers.find(d => d.name === dealerName);
    if (dealer) {
      setProvince(dealer.province);
      setCity(dealer.city);
      setAddress(dealer.address);
      setPhoneNumber(dealer.phoneNumber);
    }
  };

  const handleRegisterDealer = async () => {
    if (newDealer.name && newDealer.province && newDealer.city && newDealer.address && newDealer.phoneNumber) {
      const exists = await checkDealerExists(newDealer.name);
      if (exists) {
        alert(`${newDealer.type} with name '${newDealer.name}' already exists!`);
        return;
      }
      await addDealer(newDealer);
      const registeredType = newDealer.type;
      setNewDealer({ type: 'Dealer', name: '', province: '', city: '', address: '', phoneNumber: '' });
      alert(`${registeredType} Registered Successfully!`);
    } else {
      alert('Please fill all fields');
    }
  };

  const removeIndoor = (index: number) => {
    setIndoorScans(prev => prev.filter((_, i) => i !== index));
  };

  const removeOutdoor = (index: number) => {
    setOutdoorScans(prev => prev.filter((_, i) => i !== index));
  };

  const handleDispatchAll = async () => {
    if (indoorScans.length !== outdoorScans.length) {
      alert(`Quantity Mismatch! Indoors: ${indoorScans.length}, Outdoors: ${outdoorScans.length}. Please ensure quantities are equal.`);
      return;
    }

    if (partyName && indoorScans.length > 0) {
      const records = indoorScans.map((indoor, i) => ({
        indoorSerialNumber: indoor,
        outdoorSerialNumber: outdoorScans[i],
        partyType,
        partyName,
        province,
        city,
        address,
        phoneNumber,
        vehicleNumber,
        driverName,
        logisticCompany,
      }));
      await addDispatchRecords(records);
      setIndoorScans([]);
      setOutdoorScans([]);
      setVehicleNumber('');
      setDriverName('');
      setLogisticCompany('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center p-2 sm:p-4 font-sans bg-[var(--bg)] text-[var(--ink)]"
    >
      <header className="w-full max-w-2xl bg-white shadow-sm rounded-2xl p-3 sm:p-4 mb-4 flex flex-col items-center border border-blue-100 sticky top-2 z-30 backdrop-blur-md">
        <div className="flex flex-col items-center mb-3">
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center transform rotate-12 shadow-sm">
              <Package className="text-white transform -rotate-12" size={20} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-[var(--color-primary)]">MZEE</span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">Home Appliances</p>
        </div>
        
        <div className="flex w-full bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('dispatch')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all whitespace-nowrap text-sm ${activeTab === 'dispatch' ? 'bg-[var(--color-primary)] text-white shadow-md font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <Package size={16} />
            <span className="hidden xs:inline">Dispatch</span>
          </button>
          <button 
            onClick={() => setActiveTab('dealers')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all whitespace-nowrap text-sm ${activeTab === 'dealers' ? 'bg-[var(--color-primary)] text-white shadow-md font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <UserPlus size={16} />
            <span className="hidden xs:inline">Dealers</span>
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all whitespace-nowrap text-sm ${activeTab === 'database' ? 'bg-[var(--color-primary)] text-white shadow-md font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <Database size={16} />
            <span className="hidden xs:inline">Database</span>
          </button>
        </div>
        <div className="w-full flex justify-end mt-1 px-1">
          <span className="text-[9px] text-[var(--color-secondary)] uppercase font-bold tracking-widest">{syncStatus}</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'database' ? (
          <motion.main 
            key="database"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-4xl bg-white shadow-sm rounded-2xl p-4 sm:p-6 mb-4 border border-[var(--line)]"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-[var(--ink)] flex items-center">
                <Database className="mr-2 text-[var(--color-primary)]" size={20} />
                Database
              </h2>
              <div className="relative w-full sm:w-64">
                <input 
                  type="text" 
                  placeholder="Search S/N or Name..." 
                  className="w-full pl-9 pr-4 py-2.5 border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-blue-50/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-primary)]" size={16} />
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="min-w-full text-left text-[11px] sm:text-xs">
                  <thead className="bg-gray-50 text-[var(--color-secondary)] uppercase font-bold">
                    <tr>
                      <th className="p-3 whitespace-nowrap">ID</th>
                      <th className="p-3 whitespace-nowrap">Date</th>
                      <th className="p-3 whitespace-nowrap">Customer / Dealer</th>
                      <th className="p-3 whitespace-nowrap">Region</th>
                      <th className="p-3 whitespace-nowrap">Logistics</th>
                      <th className="p-3 whitespace-nowrap">Indoor</th>
                      <th className="p-3 whitespace-nowrap">Outdoor</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allDispatches
                      .filter(d => 
                        d.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.indoorSerialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.outdoorSerialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.dispatchNumber.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-mono font-bold whitespace-nowrap">{d.dispatchNumber}</td>
                        <td className="p-3 whitespace-nowrap">{new Date(d.dispatchDate?.toDate()).toLocaleDateString()}</td>
                        <td className="p-3 font-bold whitespace-nowrap">{d.partyName}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium">{d.province}</div>
                          <div className="text-[9px] text-gray-400">{d.city}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {d.vehicleNumber ? (
                            <div className="text-[9px]">
                              <p className="font-bold">V: {d.vehicleNumber}</p>
                            </div>
                          ) : (
                            <div className="text-[9px] font-bold">{d.logisticCompany || '---'}</div>
                          )}
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap">{d.indoorSerialNumber}</td>
                        <td className="p-3 font-mono whitespace-nowrap">{d.outdoorSerialNumber}</td>
                        <td className="p-3">
                          <button 
                            onClick={() => setSelectedDispatch(d)}
                            className="p-2 text-[var(--color-primary)] hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Printer size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.main>
        ) : activeTab === 'dealers' ? (
          <motion.main 
            key="dealers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl bg-white shadow-sm rounded-2xl p-4 sm:p-6 mb-4 border border-[var(--line)]"
          >
            <h2 className="text-lg font-bold text-[var(--ink)] mb-4 flex items-center">
              <UserPlus className="mr-2 text-[var(--color-primary)]" size={20} />
              Registration
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setNewDealer({...newDealer, type: 'Dealer'})}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newDealer.type === 'Dealer' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-gray-500'}`}
              >
                Dealer
              </button>
              <button 
                onClick={() => setNewDealer({...newDealer, type: 'Customer'})}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newDealer.type === 'Customer' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-gray-500'}`}
              >
                Customer
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Name</label>
                <input
                  type="text"
                  className="w-full p-3.5 border border-[var(--line)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-base"
                  placeholder="e.g. Al-Madina Electronics"
                  value={newDealer.name}
                  onChange={(e) => setNewDealer({...newDealer, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Province</label>
                  <div className="relative">
                    <select
                      className="w-full p-3.5 border border-[var(--line)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none appearance-none bg-white text-base"
                      value={newDealer.province}
                      onChange={(e) => setNewDealer({...newDealer, province: e.target.value, city: ''})}
                    >
                      <option value="">Select Province</option>
                      {Object.keys(PAKISTAN_REGIONS).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">City</label>
                  <div className="relative">
                    <select
                      className="w-full p-3.5 border border-[var(--line)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none appearance-none bg-white text-base disabled:bg-gray-50"
                      value={newDealer.city}
                      onChange={(e) => setNewDealer({...newDealer, city: e.target.value})}
                      disabled={!newDealer.province}
                    >
                      <option value="">Select City</option>
                      {newDealer.province && PAKISTAN_REGIONS[newDealer.province as keyof typeof PAKISTAN_REGIONS].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    className="w-full p-3.5 border border-[var(--line)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none pl-10 text-base"
                    placeholder="0300-1234567"
                    value={newDealer.phoneNumber}
                    onChange={(e) => setNewDealer({...newDealer, phoneNumber: e.target.value})}
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Address</label>
                <textarea
                  className="w-full p-3.5 border border-[var(--line)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none h-20 text-base"
                  placeholder="Enter complete address..."
                  value={newDealer.address}
                  onChange={(e) => setNewDealer({...newDealer, address: e.target.value})}
                />
              </div>
              <button
                onClick={handleRegisterDealer}
                className="w-full bg-[var(--color-primary)] text-white p-4 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg active:scale-[0.98]"
              >
                Register
              </button>
            </div>
          </motion.main>
        ) : (
          <motion.main 
            key="dispatch"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-2xl bg-white shadow-sm rounded-2xl p-4 sm:p-6 mb-4 border border-[var(--line)]"
          >
            <section className="mb-6">
              <h2 className="text-lg font-bold text-[var(--ink)] mb-3">1. Select Party</h2>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <select
                    id="partyType"
                    className="w-full p-3.5 border border-[var(--line)] rounded-xl pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] text-base"
                    value={partyType}
                    onChange={(e) => {
                      setPartyType(e.target.value as 'Dealer' | 'Customer');
                      setPartyName('');
                      setProvince('');
                      setCity('');
                      setAddress('');
                      setPhoneNumber('');
                    }}
                  >
                    <option value="Dealer">Dealer</option>
                    <option value="Customer">Customer</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>

                {partyType === 'Dealer' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <select
                        className="w-full p-3.5 border border-[var(--line)] rounded-xl pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] text-base"
                        value={partyName}
                        onChange={(e) => handleDealerSelect(e.target.value)}
                      >
                        <option value="">Select Dealer</option>
                        {dealers.filter(d => d.type === 'Dealer').map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                    {partyName && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-1"
                      >
                        <p className="text-xs font-bold text-[var(--color-primary)]">{partyName}</p>
                        <p className="text-[10px] text-gray-500">{phoneNumber}</p>
                        <p className="text-[10px] text-gray-400 leading-tight">{address}, {city}, {province}</p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      className="w-full p-3.5 border border-[var(--line)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] text-base"
                      placeholder="Customer Name"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <select
                          className="w-full p-3 border border-[var(--line)] rounded-xl pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] text-sm"
                          value={province}
                          onChange={(e) => {
                            setProvince(e.target.value);
                            setCity('');
                          }}
                        >
                          <option value="">Region</option>
                          {Object.keys(PAKISTAN_REGIONS).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                      <div className="relative">
                        <select
                          className="w-full p-3 border border-[var(--line)] rounded-xl pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] text-sm"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          disabled={!province}
                        >
                          <option value="">City</option>
                          {province && PAKISTAN_REGIONS[province as keyof typeof PAKISTAN_REGIONS].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                          type="tel"
                          className="w-full p-3 border border-[var(--line)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] text-sm pl-9"
                          placeholder="Phone Number"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full p-3 border border-[var(--line)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white text-[var(--ink)] text-sm pl-9"
                          placeholder="Address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Logistics Details */}
              <div className="border-t border-[var(--line)] pt-4 mt-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center">
                  <Truck size={14} className="mr-2" /> Logistics
                </h3>
                {city === 'Karachi' ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 p-2 rounded-lg border border-green-100 mb-2">
                      <p className="text-[9px] font-bold text-green-700 uppercase flex items-center">
                        <Truck size={10} className="mr-1" /> MZEE Official Delivery
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-gray-400 mb-1 block">Vehicle No.</label>
                        <input
                          type="text"
                          className="w-full p-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="ABC-123"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-gray-400 mb-1 block">Driver Name</label>
                        <input
                          type="text"
                          className="w-full p-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="Name"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[9px] uppercase font-bold text-gray-400 mb-1 block">Logistic Company</label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      placeholder="e.g. TCS, Leopard"
                      value={logisticCompany}
                      onChange={(e) => setLogisticCompany(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="mb-4">
              <h2 className="text-lg font-bold text-[var(--ink)] mb-3">2. Scan Units</h2>
              <div className="flex items-center space-x-2 mb-4">
                <button 
                  onClick={() => setIsScanning(prev => !prev)}
                  className={`flex-1 p-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${isScanning ? 'bg-red-500 text-white' : 'bg-[var(--color-primary)] text-white'} hover:opacity-90 active:scale-[0.98]`}
                >
                  {isScanning ? <X size={20} /> : <Camera size={20} />}
                  <span>{isScanning ? 'STOP SCANNER' : 'START CAMERA SCAN'}</span>
                </button>
                <input
                  type="text"
                  id="smartScanner"
                  className="flex-1 p-4 border-2 border-[var(--color-primary)] rounded-2xl pr-12 focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 bg-white text-[var(--ink)] text-lg font-mono"
                  placeholder="Scan Barcode..."
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  onKeyDown={handleScan}
                  autoFocus
                  inputMode="text"
                />
                <Scan className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)]" size={24} />
              </div>

              {isScanning && (
                <div id="reader" className="w-full mb-4 rounded-xl overflow-hidden border-2 border-[var(--color-primary)]"></div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-2">
                  <h3 className="text-[9px] font-black uppercase text-[var(--color-primary)] tracking-widest">Indoor ({indoorScans.length})</h3>
                  <div className="max-h-40 overflow-y-auto border border-blue-100 rounded-xl p-1.5 space-y-1 bg-[var(--color-primary)]/5">
                    {indoorScans.length === 0 && <p className="text-[9px] text-gray-300 text-center py-6 italic">Empty</p>}
                    {indoorScans.map((sn, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-50 text-[10px] font-mono shadow-sm">
                        <span className="truncate">{sn}</span>
                        <button onClick={() => removeIndoor(i)} className="text-red-400 p-1"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Outdoor ({outdoorScans.length})</h3>
                  <div className="max-h-40 overflow-y-auto border border-orange-100 rounded-xl p-1.5 space-y-1 bg-orange-50/20">
                    {outdoorScans.length === 0 && <p className="text-[9px] text-gray-300 text-center py-6 italic">Empty</p>}
                    {outdoorScans.map((sn, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-2 rounded-lg border border-orange-50 text-[10px] font-mono shadow-sm">
                        <span className="truncate">{sn}</span>
                        <button onClick={() => removeOutdoor(i)} className="text-red-400 p-1"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between ${indoorScans.length === outdoorScans.length && indoorScans.length > 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">{indoorScans.length === outdoorScans.length ? 'Ready' : 'Mismatch'}</span>
                <span className="text-xs font-mono font-bold">{indoorScans.length} IN / {outdoorScans.length} OUT</span>
              </div>

              <button
                onClick={handleDispatchAll}
                disabled={!partyName || indoorScans.length === 0 || indoorScans.length !== outdoorScans.length}
                className="w-full bg-[var(--color-primary)] text-white p-4 rounded-2xl font-black flex items-center justify-center space-x-2 hover:bg-opacity-90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
              >
                <Send size={20} />
                <span>DISPATCH NOW</span>
              </button>
            </section>
          </motion.main>
        )}
      </AnimatePresence>

      <footer className="w-full max-w-2xl bg-white shadow-sm rounded-2xl p-4 sm:p-6 border border-[var(--line)] mb-20 sm:mb-6">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-4 flex items-center"><History className="mr-2 text-[var(--color-primary)]" size={20} /> Recent</h2>
        {
          dispatchHistory.length === 0 ? (
            <p className="text-[10px] text-[var(--color-secondary)] uppercase font-bold tracking-widest text-center py-8">No history</p>
          ) : (
            <div className="space-y-3">
              {dispatchHistory.map((record, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-gray-50 p-3 rounded-xl border border-[var(--line)] text-xs text-[var(--ink)] shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[9px] font-mono font-black text-[var(--color-primary)] uppercase tracking-tighter">{record.dispatchNumber}</p>
                      <p className="text-[10px] font-bold mt-1">{record.partyName}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedDispatch(record)}
                      className="p-2 text-gray-400 hover:text-[var(--color-primary)] active:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-white p-1.5 rounded border border-blue-50">
                      <span className="text-[8px] uppercase font-bold text-blue-400 block">Indoor</span>
                      <span className="text-[10px] font-mono truncate block">{record.indoorSerialNumber}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-orange-50">
                      <span className="text-[8px] uppercase font-bold text-orange-400 block">Outdoor</span>
                      <span className="text-[10px] font-mono truncate block">{record.outdoorSerialNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                    <span>{new Date(record.dispatchDate?.toDate()).toLocaleDateString()}</span>
                    <span className="text-[var(--color-primary)]">{record.city}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        }
      </footer>
      {/* Print Preview Modal */}
      <AnimatePresence>
        {selectedDispatch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700">Dispatch Receipt Preview</h3>
                <button onClick={() => setSelectedDispatch(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div id="print-area" className="p-8 bg-white font-sans">
                <div className="text-center border-b-2 border-[var(--color-primary)] pb-4 mb-6">
                  <div className="flex flex-col items-center mb-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-10 h-10 bg-[var(--color-accent)] rounded-lg flex items-center justify-center transform rotate-12">
                        <Package className="text-white transform -rotate-12" size={24} />
                      </div>
                      <h1 className="text-4xl font-black tracking-tighter uppercase italic text-[var(--color-primary)]">MZEE</h1>
                    </div>
                    <p className="text-[10px] font-bold tracking-[0.3em] text-[var(--color-accent)] uppercase mt-1">Home Appliances</p>
                  </div>
                  <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Official Dispatch Receipt</p>
                </div>

                <div className="flex justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Dispatch ID</p>
                    <p className="text-lg font-mono font-black">{selectedDispatch.dispatchNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Date & Time</p>
                    <p className="text-sm font-bold">{new Date(selectedDispatch.dispatchDate?.toDate()).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 border-b border-gray-100">Party Details</h4>
                    <p className="text-sm font-black">{selectedDispatch.partyName}</p>
                    <p className="text-[10px] font-bold text-gray-500">{selectedDispatch.partyType}</p>
                    <p className="text-[10px] mt-1">{selectedDispatch.phoneNumber}</p>
                    <p className="text-[10px] text-gray-400 leading-tight mt-1">{selectedDispatch.address}, {selectedDispatch.city}, {selectedDispatch.province}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 border-b border-gray-100">Logistics</h4>
                    {selectedDispatch.vehicleNumber ? (
                      <>
                        <p className="text-[10px] font-bold">Vehicle: <span className="font-mono">{selectedDispatch.vehicleNumber}</span></p>
                        <p className="text-[10px] font-bold">Driver: {selectedDispatch.driverName}</p>
                      </>
                    ) : (
                      <p className="text-[10px] font-bold">Logistic: {selectedDispatch.logisticCompany}</p>
                    )}
                  </div>
                </div>

                <div className="border-2 border-[var(--color-primary)] rounded-lg overflow-hidden mb-8">
                  <div className="bg-[var(--color-primary)] text-white p-2 text-[10px] font-bold uppercase grid grid-cols-2">
                    <span>Item Description</span>
                    <span className="text-right">Serial Number</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 text-xs border-b border-gray-100">
                    <span className="font-bold">Indoor Unit</span>
                    <span className="text-right font-mono">{selectedDispatch.indoorSerialNumber}</span>
                  </div>
                  <div className="p-2 grid grid-cols-2 text-xs">
                    <span className="font-bold">Outdoor Unit</span>
                    <span className="text-right font-mono">{selectedDispatch.outdoorSerialNumber}</span>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-dashed border-blue-200 mb-8">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Warranty Policy</p>
                  <p className="text-[10px] font-black text-[var(--color-primary)]">{selectedDispatch.warrantyPolicy}</p>
                </div>

                <div className="flex justify-between items-end mt-12">
                  <div className="text-center">
                    <div className="w-32 border-b border-[var(--color-primary)] mb-1"></div>
                    <p className="text-[8px] font-bold uppercase text-blue-400">Warehouse In-charge</p>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b border-[var(--color-primary)] mb-1"></div>
                    <p className="text-[8px] font-bold uppercase text-blue-400">Receiver Signature</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => window.print()}
                  className="w-full sm:flex-1 bg-[var(--color-primary)] text-white py-4 rounded-2xl font-black flex items-center justify-center space-x-2 active:scale-[0.98] transition-all shadow-lg"
                >
                  <Printer size={20} />
                  <span>PRINT RECEIPT</span>
                </button>
                <button 
                  onClick={() => setSelectedDispatch(null)}
                  className="w-full sm:w-auto px-8 py-4 border border-gray-300 rounded-2xl font-bold text-gray-600 active:bg-gray-100 transition-all"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            margin: 0;
            box-sizing: border-box;
          }
          header, footer, .no-print { display: none !important; }
        }
      `}</style>
    </motion.div>
  );
}
