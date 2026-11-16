/**
 * ESC/POS Binary Command Generator & Thermal Receipt Formatter
 * Supports standard 80mm (48 columns) and 58mm (32 columns) thermal printers.
 * Supports Epson, Star Micronics, Xprinter, Rongta, Bixolon, POS-58/80.
 */

export const ESC = 0x1b;
export const GS = 0x1d;
export const FS = 0x1c;
export const LF = 0x0a;

export interface EscPosOptions {
  paperWidth?: '80mm' | '58mm';
  kickDrawer?: boolean;
  cutPaper?: boolean;
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private cols: number;

  constructor(paperWidth: '80mm' | '58mm' = '80mm') {
    this.cols = paperWidth === '58mm' ? 32 : 48;
    this.init();
  }

  // Initialize printer
  init(): this {
    this.buffer.push(ESC, 0x40);
    return this;
  }

  // Text alignment: 0=Left, 1=Center, 2=Right
  align(align: 'left' | 'center' | 'right'): this {
    const code = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, code);
    return this;
  }

  // Bold text toggle
  bold(enable: boolean = true): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  // Font size: normal, double-height, double-width, quad
  size(size: 'normal' | 'double-height' | 'double-width' | 'quad'): this {
    let n = 0;
    if (size === 'double-height') n = 0x01;
    if (size === 'double-width') n = 0x10;
    if (size === 'quad') n = 0x11;
    this.buffer.push(GS, 0x21, n);
    return this;
  }

  // Text write with automatic UTF-8 to single-byte/ASCII normalization
  text(str: string): this {
    // Normalize and sanitize text for thermal printer character tables
    const sanitized = str.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
    for (let i = 0; i < sanitized.length; i++) {
      this.buffer.push(sanitized.charCodeAt(i) & 0xff);
    }
    return this;
  }

  // Line feed
  line(str: string = ''): this {
    if (str) {
      this.text(str);
    }
    this.buffer.push(LF);
    return this;
  }

  // Multiple line feeds
  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  // Horizontal divider line
  divider(char: string = '-'): this {
    this.align('left');
    this.line(char.repeat(this.cols));
    return this;
  }

  // Two-column row: Left-aligned label and right-aligned value
  twoColumns(left: string, right: string, bold: boolean = false): this {
    this.align('left');
    if (bold) this.bold(true);

    const spaceAvailable = this.cols - right.length;
    let truncatedLeft = left;
    if (left.length >= spaceAvailable) {
      truncatedLeft = left.substring(0, Math.max(0, spaceAvailable - 1));
    }
    const padding = Math.max(1, this.cols - truncatedLeft.length - right.length);
    this.line(truncatedLeft + ' '.repeat(padding) + right);

    if (bold) this.bold(false);
    return this;
  }

  // Three-column row: Item (wide) | Qty (mid) | Total (right)
  threeColumns(col1: string, col2: string, col3: string): this {
    this.align('left');
    const col3Width = 10;
    const col2Width = 6;
    const col1Width = this.cols - col2Width - col3Width - 2;

    const c1 = col1.substring(0, col1Width).padEnd(col1Width);
    const c2 = col2.padStart(col2Width);
    const c3 = col3.padStart(col3Width);

    this.line(`${c1} ${c2} ${c3}`);
    return this;
  }

  // Cash Drawer Kick Pulse (Pins 2 & 5 standard pulses)
  // ESC p m t1 t2
  // m=0 (pin 2), t1=25 (50ms on), t2=250 (500ms off)
  kickCashDrawer(): this {
    // Pulse pin 2
    this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    // Pulse pin 5
    this.buffer.push(ESC, 0x70, 0x01, 0x19, 0xfa);
    // Star Micronics BEL command
    this.buffer.push(0x07);
    return this;
  }

  // Partial / Full paper cut with feed
  cut(full: boolean = false): this {
    this.feed(3);
    // GS V m
    this.buffer.push(GS, 0x56, full ? 0x00 : 0x01);
    return this;
  }

  // Return generated Uint8Array
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Generate standard Cash Drawer Kick binary payload (standalone)
 */
export function generateDrawerKickBytes(): Uint8Array {
  const b = new EscPosBuilder();
  b.kickCashDrawer();
  return b.getBytes();
}

/**
 * Generate complete ESC/POS binary receipt for a POS sale
 */
export function generateSaleReceiptEscPos(
  sale: any,
  branchInfo?: { name?: string; address?: string; phone?: string; taxNumber?: string },
  options: EscPosOptions = {},
): Uint8Array {
  const paper = options.paperWidth || '80mm';
  const builder = new EscPosBuilder(paper);

  // 1. Optional Cash Drawer Kick at start of printing
  if (options.kickDrawer) {
    builder.kickCashDrawer();
  }

  // 2. Header
  builder.align('center');
  builder.bold(true);
  builder.size('double-height');
  builder.line(branchInfo?.name || 'RETAIL CLOUD POS');
  builder.size('normal');
  builder.bold(false);

  if (branchInfo?.address) {
    builder.line(branchInfo.address);
  }
  if (branchInfo?.phone) {
    builder.line(`Tel: ${branchInfo.phone}`);
  }
  if (branchInfo?.taxNumber) {
    builder.line(`VAT/Tax Reg: ${branchInfo.taxNumber}`);
  }

  builder.feed(1);
  builder.bold(true);
  builder.line('OFFICIAL SALES RECEIPT');
  builder.bold(false);
  builder.divider('=');

  // 3. Metadata
  builder.twoColumns('Invoice No:', sale.invoiceNumber || 'INV-0000');
  builder.twoColumns('Date/Time:', new Date(sale.completedAt || Date.now()).toLocaleString());
  if (sale.cashier) {
    const cashierName = `${sale.cashier.firstName || ''} ${sale.cashier.lastName || ''}`.trim() || 'Front Desk';
    builder.twoColumns('Cashier:', cashierName);
  }
  if (sale.customer?.name) {
    builder.twoColumns('Customer:', sale.customer.name);
  }
  builder.divider('-');

  // 4. Line Items
  if (paper === '80mm') {
    builder.threeColumns('ITEM', 'QTY', 'AMOUNT(LKR)');
    builder.divider('-');
    (sale.items || []).forEach((item: any) => {
      const name = item.variant?.product?.name || item.variant?.sku || item.name || 'Item';
      const qtyNum = Number(item.quantity || 1);
      const qty = qtyNum.toFixed(qtyNum % 1 === 0 ? 0 : 3);
      const total = Number(item.lineTotal || 0).toFixed(2);

      builder.threeColumns(name, qty, total);

      // Detail line if batch or item discount
      if (item.batchNumber || Number(item.discountAmount || 0) > 0) {
        let note = '';
        if (item.batchNumber) note += `Batch:#${item.batchNumber} `;
        if (Number(item.discountAmount || 0) > 0) note += `Disc:-${Number(item.discountAmount).toFixed(2)}`;
        builder.align('left');
        builder.line(`  ${note}`);
      }
    });
  } else {
    // 58mm compact format
    (sale.items || []).forEach((item: any) => {
      const name = item.variant?.product?.name || item.variant?.sku || item.name || 'Item';
      const qtyNum = Number(item.quantity || 1);
      const qty = qtyNum.toFixed(qtyNum % 1 === 0 ? 0 : 2);
      const price = Number(item.unitPrice || 0).toFixed(2);
      const total = Number(item.lineTotal || 0).toFixed(2);

      builder.align('left');
      builder.line(name);
      builder.twoColumns(`  ${qty} x ${price}`, total);
    });
  }

  builder.divider('-');

  // 5. Totals & Summaries
  const subtotal = Number(sale.subtotalAmount || sale.totalGrossAmount || sale.totalAmount || 0);
  const discount = Number(sale.discountAmount || sale.totalDiscountAmount || 0);
  const tax = Number(sale.taxAmount || sale.totalTaxAmount || 0);
  const grandTotal = Number(sale.totalAmount || sale.totalNetAmount || 0);

  if (discount > 0 || tax > 0) {
    builder.twoColumns('Subtotal:', `LKR ${subtotal.toFixed(2)}`);
  }
  if (discount > 0) {
    builder.twoColumns('Total Discount:', `-LKR ${discount.toFixed(2)}`);
  }
  if (tax > 0) {
    builder.twoColumns('Tax / VAT:', `LKR ${tax.toFixed(2)}`);
  }

  builder.bold(true);
  builder.size('double-height');
  builder.twoColumns('TOTAL DUE:', `LKR ${grandTotal.toFixed(2)}`, true);
  builder.size('normal');
  builder.bold(false);

  builder.divider('-');

  // 6. Tendered Payments Breakdown
  if (sale.payments && sale.payments.length > 0) {
    sale.payments.forEach((p: any) => {
      builder.twoColumns(`Paid (${p.tenderType || 'CASH'}):`, `LKR ${Number(p.amount || 0).toFixed(2)}`);
    });
  } else {
    builder.twoColumns('Paid:', `LKR ${grandTotal.toFixed(2)}`);
  }

  const change = Number(sale.changeGiven || 0);
  if (change > 0) {
    builder.bold(true);
    builder.twoColumns('CHANGE GIVEN:', `LKR ${change.toFixed(2)}`, true);
    builder.bold(false);
  }

  builder.divider('=');

  // 7. Footer Policy
  builder.align('center');
  builder.line('Thank you for shopping with us!');
  builder.line('Goods exchangeable within 7 days');
  builder.line('with original receipt in saleable condition.');
  builder.feed(1);
  builder.line(`*** ${sale.invoiceNumber} ***`);

  // 8. Cut
  if (options.cutPaper !== false) {
    builder.cut(false);
  }

  return builder.getBytes();
}

/**
 * Format a Customer Return / Refund / Exchange Voucher Slip into ESC/POS binary bytes
 */
export function generateReturnReceiptEscPos(
  receipt: any,
  options: EscPosOptions = {},
): Uint8Array {
  const paper = options.paperWidth || '80mm';
  const builder = new EscPosBuilder(paper);

  const isItemToItem = receipt.refundMethod === 'ITEM_TO_ITEM' || !!receipt.voucherCode;
  const isOnline = receipt.refundMethod === 'ONLINE_TRANSFER';

  // 1. Kick drawer if cash refund and requested
  if (options.kickDrawer && !isItemToItem && !isOnline) {
    builder.kickCashDrawer();
  }

  // 2. Header
  builder.align('center');
  builder.bold(true);
  builder.size('double-height');
  builder.line(receipt.store?.branchName || receipt.store?.companyName || 'RETAIL CLOUD POS');
  builder.size('normal');
  builder.bold(false);

  if (receipt.store?.branchAddress) {
    builder.line(receipt.store.branchAddress);
  }
  if (receipt.store?.branchPhone) {
    builder.line(`Tel: ${receipt.store.branchPhone}`);
  }
  if (receipt.store?.taxNumber) {
    builder.line(`VAT/Tax Reg: ${receipt.store.taxNumber}`);
  }

  builder.feed(1);
  builder.bold(true);
  if (isItemToItem) {
    builder.size('double-height');
    builder.line('ITEM EXCHANGE VOUCHER');
    builder.size('normal');
    builder.line('(Valid for 24 Hours Only)');
  } else if (isOnline) {
    builder.line('ONLINE REFUND RECEIPT');
  } else {
    builder.line('CASH REFUND RECEIPT');
  }
  builder.bold(false);
  builder.divider('=');

  // 3. Metadata
  builder.twoColumns('Return Slip:', receipt.returnNumber || 'RET-0000');
  builder.twoColumns('Original Inv:', receipt.originalInvoiceNumber || 'INV-0000');
  builder.twoColumns('Date/Time:', new Date(receipt.issuedAt || Date.now()).toLocaleString());
  if (receipt.customer?.name) {
    builder.twoColumns('Customer:', receipt.customer.name);
  }
  builder.divider('-');

  // 4. Returned Items
  if (paper === '80mm') {
    builder.threeColumns('RETURNED ITEM', 'QTY', 'REFUND(LKR)');
    builder.divider('-');
    (receipt.items || []).forEach((item: any) => {
      const name = item.name || item.sku || 'Returned Item';
      const qtyNum = Number(item.quantity || 1);
      const qty = qtyNum.toFixed(qtyNum % 1 === 0 ? 0 : 3);
      const subtotal = Number(item.refundSubtotal || item.unitPrice * qtyNum || 0).toFixed(2);
      builder.threeColumns(name, qty, subtotal);

      const actionNote = item.returnAction === 'RETURN_TO_STOCK' ? 'Restocked to Inventory' : 'Damage Disposal';
      builder.align('left');
      builder.line(`  Action: ${actionNote}`);
    });
  } else {
    builder.twoColumns('RETURNED ITEM', 'REFUND');
    builder.divider('-');
    (receipt.items || []).forEach((item: any) => {
      const name = item.name || item.sku || 'Returned Item';
      const qtyNum = Number(item.quantity || 1);
      const qty = qtyNum.toFixed(qtyNum % 1 === 0 ? 0 : 2);
      const subtotal = Number(item.refundSubtotal || 0).toFixed(2);
      builder.twoColumns(`${name} x${qty}`, `LKR ${subtotal}`);
    });
  }

  builder.divider('=');

  // 5. Total Refund Value
  builder.bold(true);
  builder.size('double-height');
  builder.twoColumns('TOTAL REFUND:', `LKR ${Number(receipt.totalRefund || 0).toFixed(2)}`, true);
  builder.size('normal');
  builder.bold(false);
  builder.divider('-');

  // 6. Settlement Details
  if (isItemToItem && receipt.voucherCode) {
    builder.align('center');
    builder.bold(true);
    builder.line('*** 24-HOUR CREDIT VOUCHER ***');
    builder.size('double-height');
    builder.line(receipt.voucherCode);
    builder.size('normal');
    builder.feed(1);

    const expStr = receipt.voucherExpiresAt
      ? new Date(receipt.voucherExpiresAt).toLocaleString()
      : 'In 24 Hours';
    builder.line(`EXPIRES AT: ${expStr}`);
    builder.bold(false);
    builder.line('Scan or present code on your next purchase.');
    builder.line('Deducts credit value from your next bill.');
  } else if (isOnline) {
    builder.twoColumns('Method:', 'Online / Bank Transfer');
    if (receipt.transferReference) {
      builder.twoColumns('Ref No:', receipt.transferReference);
    }
  } else {
    builder.twoColumns('Method:', 'Cash Paid to Customer');
  }

  builder.divider('=');

  // 7. Footer
  builder.align('center');
  if (receipt.footer?.message) {
    builder.line(receipt.footer.message);
  }
  builder.line('Computer Generated Return Receipt');
  builder.feed(1);
  builder.line(`*** ${receipt.returnNumber} ***`);

  // 8. Cut
  if (options.cutPaper !== false) {
    builder.cut(false);
  }

  return builder.getBytes();
}
