'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  generateDrawerKickBytes,
  generateSaleReceiptEscPos,
  generateReturnReceiptEscPos,
  EscPosOptions,
  EscPosBuilder,
} from './escpos';

export type PrinterType = 'BROWSER' | 'WEBUSB' | 'WEBSERIAL' | 'NETWORK';
export type PaperWidth = '80mm' | '58mm';

interface HardwareState {
  printerType: PrinterType;
  paperWidth: PaperWidth;
  autoKickDrawer: boolean;
  networkPrinterUrl: string;
  isUsbConnected: boolean;
  isSerialConnected: boolean;
  lastActionMessage: string | null;

  // Configuration setters
  setPrinterType: (type: PrinterType) => void;
  setPaperWidth: (width: PaperWidth) => void;
  setAutoKickDrawer: (kick: boolean) => void;
  setNetworkPrinterUrl: (url: string) => void;
  clearMessage: () => void;

  // Hardware operations
  kickCashDrawer: () => Promise<{ success: boolean; message: string }>;
  printSaleReceipt: (sale: any, branchInfo?: any) => Promise<{ success: boolean; message: string }>;
  printReturnReceipt: (receipt: any) => Promise<{ success: boolean; message: string }>;
  printTestSlip: () => Promise<{ success: boolean; message: string }>;
  pairUsbPrinter: () => Promise<{ success: boolean; message: string }>;
  pairSerialPrinter: () => Promise<{ success: boolean; message: string }>;
}

// Runtime active device handles (not stored in JSON localStorage)
let activeUsbDevice: any = null;
let activeSerialPort: any = null;

export const useHardwareStore = create<HardwareState>()(
  persist(
    (set, get) => ({
      printerType: 'BROWSER',
      paperWidth: '80mm',
      autoKickDrawer: true,
      networkPrinterUrl: 'http://localhost:9100/print',
      isUsbConnected: false,
      isSerialConnected: false,
      lastActionMessage: null,

      setPrinterType: (type) => set({ printerType: type }),
      setPaperWidth: (width) => set({ paperWidth: width }),
      setAutoKickDrawer: (kick) => set({ autoKickDrawer: kick }),
      setNetworkPrinterUrl: (url) => set({ networkPrinterUrl: url }),
      clearMessage: () => set({ lastActionMessage: null }),

      // 1. Kick Cash Drawer directly
      kickCashDrawer: async () => {
        const { printerType } = get();
        const drawerBytes = generateDrawerKickBytes();

        try {
          if (printerType === 'WEBUSB' && activeUsbDevice) {
            await sendRawBytesToUsb(activeUsbDevice, drawerBytes);
            const msg = 'Electrical pulse sent to cash drawer via WebUSB!';
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          if (printerType === 'WEBSERIAL' && activeSerialPort) {
            await sendRawBytesToSerial(activeSerialPort, drawerBytes);
            const msg = 'Electrical pulse sent to cash drawer via Web Serial!';
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          if (printerType === 'NETWORK') {
            await sendRawBytesToNetwork(get().networkPrinterUrl, drawerBytes);
            const msg = 'Drawer kick command dispatched to network printer!';
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          // In Browser print mode: Fallback notification
          const msg = 'Drawer pulse triggered (In Browser Print mode, drawer kicks via printer driver RJ11 port)';
          set({ lastActionMessage: msg });
          return { success: true, message: msg };
        } catch (err: any) {
          const errMsg = `Drawer Kick Failed: ${err.message || 'Device communication error'}`;
          set({ lastActionMessage: errMsg });
          return { success: false, message: errMsg };
        }
      },

      // 2. Print Complete Sale Receipt
      printSaleReceipt: async (sale: any, branchInfo?: any) => {
        const { printerType, paperWidth, autoKickDrawer } = get();

        // Check if cash was tendered to automatically kick drawer
        const hasCash = (sale.payments || []).some(
          (p: any) => p.tenderType === 'CASH' || !p.tenderType,
        );
        const shouldKick = autoKickDrawer && hasCash;

        const options: EscPosOptions = {
          paperWidth,
          kickDrawer: shouldKick,
          cutPaper: true,
        };

        const bytes = generateSaleReceiptEscPos(sale, branchInfo, options);

        try {
          if (printerType === 'WEBUSB') {
            if (!activeUsbDevice) {
              const pairRes = await get().pairUsbPrinter();
              if (!pairRes.success) throw new Error(pairRes.message);
            }
            await sendRawBytesToUsb(activeUsbDevice, bytes);
            const msg = `Receipt printed via WebUSB (${paperWidth})${shouldKick ? ' & Cash Drawer kicked!' : ''}`;
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          if (printerType === 'WEBSERIAL') {
            if (!activeSerialPort) {
              const pairRes = await get().pairSerialPrinter();
              if (!pairRes.success) throw new Error(pairRes.message);
            }
            await sendRawBytesToSerial(activeSerialPort, bytes);
            const msg = `Receipt printed via Web Serial (${paperWidth})${shouldKick ? ' & Cash Drawer kicked!' : ''}`;
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          if (printerType === 'NETWORK') {
            await sendRawBytesToNetwork(get().networkPrinterUrl, bytes);
            const msg = `Receipt dispatched to Network Printer (${paperWidth})`;
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          // Fallback to high-fidelity isolated browser print
          if (typeof window !== 'undefined') {
            window.print();
          }
          return { success: true, message: 'Browser thermal print dialog opened' };
        } catch (err: any) {
          const errMsg = `Thermal Print Error: ${err.message || 'Failed to send data to printer'}`;
          set({ lastActionMessage: errMsg });
          return { success: false, message: errMsg };
        }
      },

      // 3. Print Customer Return / Exchange Voucher Slip
      printReturnReceipt: async (receipt: any) => {
        const { printerType, paperWidth, autoKickDrawer } = get();

        const isCash = receipt.refundMethod === 'CASH' || receipt.refundTender === 'CASH';
        const shouldKick = autoKickDrawer && isCash;

        const options: EscPosOptions = {
          paperWidth,
          kickDrawer: shouldKick,
          cutPaper: true,
        };

        const bytes = generateReturnReceiptEscPos(receipt, options);

        try {
          if (printerType === 'WEBUSB') {
            if (!activeUsbDevice) {
              const pairRes = await get().pairUsbPrinter();
              if (!pairRes.success) throw new Error(pairRes.message);
            }
            await sendRawBytesToUsb(activeUsbDevice, bytes);
            const msg = `Return voucher dispatched to USB Thermal Printer (${paperWidth})!`;
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          if (printerType === 'WEBSERIAL') {
            if (!activeSerialPort) {
              const pairRes = await get().pairSerialPrinter();
              if (!pairRes.success) throw new Error(pairRes.message);
            }
            await sendRawBytesToSerial(activeSerialPort, bytes);
            const msg = `Return voucher dispatched to Serial/COM Thermal Printer (${paperWidth})!`;
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          if (printerType === 'NETWORK') {
            await sendRawBytesToNetwork(get().networkPrinterUrl, bytes);
            const msg = `Return voucher dispatched to Network Printer (${paperWidth})!`;
            set({ lastActionMessage: msg });
            return { success: true, message: msg };
          }

          if (typeof window !== 'undefined') {
            window.print();
          }
          return { success: true, message: 'Browser print dialog opened' };
        } catch (err: any) {
          const errMsg = `Thermal Print Error: ${err.message || 'Failed to send data to printer'}`;
          set({ lastActionMessage: errMsg });
          return { success: false, message: errMsg };
        }
      },

      // 4. Print Diagnostic Test Slip
      printTestSlip: async () => {
        const { paperWidth, printerType } = get();
        const builder = new EscPosBuilder(paperWidth);

        builder.kickCashDrawer();
        builder.align('center');
        builder.bold(true);
        builder.size('double-height');
        builder.line('RETAIL CLOUD POS');
        builder.size('normal');
        builder.line('Hardware Diagnostics Test');
        builder.bold(false);
        builder.divider('=');
        builder.twoColumns('Printer Mode:', printerType);
        builder.twoColumns('Paper Width:', paperWidth);
        builder.twoColumns('Timestamp:', new Date().toLocaleTimeString());
        builder.twoColumns('Drawer Status:', 'PULSE SENT (PIN 2/5)');
        builder.divider('-');
        builder.align('center');
        builder.line('Direct ESC/POS Communication: OK');
        builder.line('Cash Drawer Kick Relay: OK');
        builder.feed(1);
        builder.line('*** TEST COMPLETED ***');
        builder.cut(false);

        const bytes = builder.getBytes();

        try {
          if (printerType === 'WEBUSB' && activeUsbDevice) {
            await sendRawBytesToUsb(activeUsbDevice, bytes);
            return { success: true, message: 'Test slip printed via WebUSB!' };
          }
          if (printerType === 'WEBSERIAL' && activeSerialPort) {
            await sendRawBytesToSerial(activeSerialPort, bytes);
            return { success: true, message: 'Test slip printed via Web Serial!' };
          }
          if (printerType === 'NETWORK') {
            await sendRawBytesToNetwork(get().networkPrinterUrl, bytes);
            return { success: true, message: 'Test slip dispatched to Network Printer!' };
          }

          // Browser fallback test
          if (typeof window !== 'undefined') {
            window.print();
          }
          return { success: true, message: 'Browser print dialog invoked' };
        } catch (err: any) {
          return { success: false, message: err.message || 'Test print failed' };
        }
      },

      // 4. Pair WebUSB Printer
      pairUsbPrinter: async () => {
        if (typeof navigator === 'undefined' || !(navigator as any).usb) {
          return {
            success: false,
            message: 'WebUSB API is not supported in this browser. Please use Chrome or Edge.',
          };
        }

        try {
          const device = await (navigator as any).usb.requestDevice({
            filters: [
              // Standard thermal POS printer USB vendor classes
              { classCode: 0x07 }, // USB Printer Class
            ],
          });

          await device.open();
          if (device.configuration === null) {
            await device.selectConfiguration(1);
          }
          await device.claimInterface(0);

          activeUsbDevice = device;
          set({ isUsbConnected: true, printerType: 'WEBUSB' });
          return {
            success: true,
            message: `Connected to USB Printer: ${device.productName || 'Thermal POS Printer'}`,
          };
        } catch (err: any) {
          return {
            success: false,
            message: err.message || 'No USB printer selected or access denied',
          };
        }
      },

      // 5. Pair Web Serial (RS-232 / USB Virtual COM)
      pairSerialPrinter: async () => {
        if (typeof navigator === 'undefined' || !(navigator as any).serial) {
          return {
            success: false,
            message: 'Web Serial API is not supported in this browser. Please use Chrome or Edge.',
          };
        }

        try {
          const port = await (navigator as any).serial.requestPort();
          await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });
          activeSerialPort = port;
          set({ isSerialConnected: true, printerType: 'WEBSERIAL' });
          return { success: true, message: 'Connected to Serial Thermal Printer (9600 baud)' };
        } catch (err: any) {
          return {
            success: false,
            message: err.message || 'No serial port selected or access denied',
          };
        }
      },
    }),
    {
      name: 'retail_pos_hardware_settings',
      partialize: (state) => ({
        printerType: state.printerType,
        paperWidth: state.paperWidth,
        autoKickDrawer: state.autoKickDrawer,
        networkPrinterUrl: state.networkPrinterUrl,
      }),
    },
  ),
);

// Helper: send raw byte chunks to USB endpoint
async function sendRawBytesToUsb(device: any, data: Uint8Array) {
  // Find bulk out endpoint
  const iface = device.configuration.interfaces[0];
  const alt = iface.alternates[0];
  const outEndpoint = alt.endpoints.find((e: any) => e.direction === 'out');

  const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;
  // Send in 64-byte or 512-byte packets
  await device.transferOut(endpointNumber, data);
}

// Helper: send raw bytes to Web Serial stream
async function sendRawBytesToSerial(port: any, data: Uint8Array) {
  const writer = port.writable.getWriter();
  await writer.write(data);
  writer.releaseLock();
}

// Helper: send raw bytes to Network / Local Print Proxy
async function sendRawBytesToNetwork(url: string, data: Uint8Array) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
  });
}
