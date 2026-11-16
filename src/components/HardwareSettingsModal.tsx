'use client';

import React, { useState } from 'react';
import {
  Printer,
  X,
  Check,
  Usb,
  Cpu,
  Globe,
  Monitor,
  KeyRound,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useHardwareStore, PrinterType, PaperWidth } from '../lib/hardware-store';

interface HardwareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HardwareSettingsModal({ isOpen, onClose }: HardwareSettingsModalProps) {
  const {
    printerType,
    paperWidth,
    autoKickDrawer,
    networkPrinterUrl,
    isUsbConnected,
    isSerialConnected,
    lastActionMessage,
    setPrinterType,
    setPaperWidth,
    setAutoKickDrawer,
    setNetworkPrinterUrl,
    kickCashDrawer,
    printTestSlip,
    pairUsbPrinter,
    pairSerialPrinter,
    clearMessage,
  } = useHardwareStore();

  const [isKicking, setIsKicking] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [isPairingUsb, setIsPairingUsb] = useState(false);
  const [isPairingSerial, setIsPairingSerial] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKickDrawer = async () => {
    setIsKicking(true);
    setFeedback(null);
    const res = await kickCashDrawer();
    setFeedback(res.message);
    setIsKicking(false);
  };

  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    setFeedback(null);
    const res = await printTestSlip();
    setFeedback(res.message);
    setIsTestingPrint(false);
  };

  const handlePairUsb = async () => {
    setIsPairingUsb(true);
    setFeedback(null);
    const res = await pairUsbPrinter();
    setFeedback(res.message);
    setIsPairingUsb(false);
  };

  const handlePairSerial = async () => {
    setIsPairingSerial(true);
    setFeedback(null);
    const res = await pairSerialPrinter();
    setFeedback(res.message);
    setIsPairingSerial(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Thermal Printer & Cash Drawer</h3>
              <p className="text-xs text-slate-400">ESC/POS hardware communication & RJ11 drawer kick</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-300">
          {/* Quick Action Test Buttons */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Hardware Test Station</span>
              <span className="text-[10px] text-slate-500 font-normal">Direct Hardware Pulse</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleKickDrawer}
                disabled={isKicking}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/50 transition"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isKicking ? 'Pulsing...' : 'Kick Cash Drawer'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTestingPrint}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-950/50 transition"
              >
                <FileText className="w-4 h-4" />
                <span>{isTestingPrint ? 'Printing...' : 'Test Print Slip'}</span>
              </button>
            </div>

            {feedback && (
              <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/80 text-indigo-300 text-[11px] flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>{feedback}</span>
              </div>
            )}
          </div>

          {/* Setting 1: Printer Interface Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white uppercase tracking-wider">
              Communication Interface
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrinterType('BROWSER')}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                  printerType === 'BROWSER'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <Monitor className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">Browser Print</div>
                  <div className="text-[10px] text-slate-400">Isolated 80mm/58mm thermal CSS</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrinterType('WEBUSB')}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                  printerType === 'WEBUSB'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <Usb className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">Direct WebUSB</div>
                  <div className="text-[10px] text-slate-400">Raw ESC/POS (Epson/Xprinter)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrinterType('WEBSERIAL')}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                  printerType === 'WEBSERIAL'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <Cpu className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">Serial / COM Port</div>
                  <div className="text-[10px] text-slate-400">Virtual COM (9600 baud)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrinterType('NETWORK')}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                  printerType === 'NETWORK'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <Globe className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">Network / Proxy</div>
                  <div className="text-[10px] text-slate-400">RawBT / TCP Socket :9100</div>
                </div>
              </button>
            </div>
          </div>

          {/* USB Device Pairing Action (if WEBUSB selected) */}
          {printerType === 'WEBUSB' && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Pair USB Thermal Printer</div>
                <div className="text-[10px] text-slate-400">
                  {isUsbConnected ? 'Connected to USB Thermal Printer' : 'Click to authorize connected USB printer'}
                </div>
              </div>
              <button
                type="button"
                onClick={handlePairUsb}
                disabled={isPairingUsb}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition"
              >
                {isPairingUsb ? 'Connecting...' : isUsbConnected ? 'Re-pair Device' : 'Connect USB'}
              </button>
            </div>
          )}

          {/* Serial Device Pairing Action (if WEBSERIAL selected) */}
          {printerType === 'WEBSERIAL' && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Pair Serial / COM Port</div>
                <div className="text-[10px] text-slate-400">
                  {isSerialConnected ? 'Serial Port Open (9600 baud)' : 'Authorize COM / RS-232 serial port'}
                </div>
              </div>
              <button
                type="button"
                onClick={handlePairSerial}
                disabled={isPairingSerial}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs transition"
              >
                {isPairingSerial ? 'Connecting...' : isSerialConnected ? 'Re-pair Port' : 'Connect COM Port'}
              </button>
            </div>
          )}

          {/* Network URL input (if NETWORK selected) */}
          {printerType === 'NETWORK' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Network Printer Endpoint / Local RawBT Proxy URL
              </label>
              <input
                type="text"
                value={networkPrinterUrl}
                onChange={(e) => setNetworkPrinterUrl(e.target.value)}
                placeholder="http://localhost:9100/print"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Setting 2: Thermal Paper Width */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white uppercase tracking-wider">
              Thermal Paper Width
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  paperWidth === '80mm'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                80mm (Standard 48 columns)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  paperWidth === '58mm'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                58mm (Compact 32 columns)
              </button>
            </div>
          </div>

          {/* Setting 3: Cash Drawer Automation */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-xs">Auto-Kick Cash Drawer</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Automatically pop the physical cash drawer open when completing cash checkout
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoKickDrawer}
                onChange={(e) => setAutoKickDrawer(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
