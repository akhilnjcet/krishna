import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyINR, fitTextIntoBox, cleanTextString } from '../utils/pdfHelpers';

export const generateLodgeReceiptPDF = async (payment) => {
  const doc = new jsPDF();
  doc.setCharSpace(0);

  const brandName = "KRISHNA LODGE & RESIDENCY MANAGER";
  const tagline = "Certified Industrial & Residency Facility";
  const address = "Krishna Complex, Site A, Kuttanassery, Palakkad, Kerala 679514";
  const phone = "+91 94479 40835 | contact@krishnaengg.com";

  // Standard Theme Colors
  const primaryColor = [79, 70, 229];  // Indigo-600
  const darkSlate = [15, 23, 42];     // Slate-900
  const lightGray = [248, 250, 252];   // Slate-50

  // 1. Header Banner (A4 Top Margin)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 38, 'F');

  // Company Name (18pt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(brandName, 15, 18, { charSpace: 0 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`${tagline} | ${address}`, 15, 25, { charSpace: 0 });
  doc.text(`Contact: ${phone}`, 15, 31, { charSpace: 0 });

  // 2. Receipt Badge (Top Right)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(140, 8, 55, 24, 3, 3, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("PAYMENT RECEIPT", 143, 17, { charSpace: 0 });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const receiptNum = `#${payment.receiptNumber || 'REC-' + (payment._id ? payment._id.slice(-6).toUpperCase() : '2026')}`;
  doc.text(receiptNum, 143, 25, { charSpace: 0 });

  // 3. Status Ribbon
  doc.setFillColor(220, 252, 231);
  doc.rect(0, 38, 210, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text("VERIFIED & PAID - OFFICIAL AUDIT RECORD", 105, 43.5, { align: "center", charSpace: 0 });

  let y = 54;

  // 4. Details Box (Tenant & Payment info)
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, y, 180, 40, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkSlate);
  doc.text("Tenant & Room Info:", 20, y + 9, { charSpace: 0 });
  doc.text("Payment Verification Details:", 108, y + 9, { charSpace: 0 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const tenantName = payment.tenantName || payment.customerId?.name || 'Valued Tenant';
  const roomNo = payment.roomId?.roomNumber ? `Room #${payment.roomId.roomNumber}` : 'Residency Suite';
  const bookingId = payment.bookingId ? `#${(payment.bookingId._id || payment.bookingId).slice(-6).toUpperCase()}` : 'N/A';
  const period = payment.billingPeriodStart ? `${new Date(payment.billingPeriodStart).toLocaleDateString()} - ${new Date(payment.billingPeriodEnd).toLocaleDateString()}` : 'Current Billing Cycle';

  doc.text(`Tenant Name: ${cleanTextString(tenantName)}`, 20, y + 16, { charSpace: 0 });
  doc.text(`Room/Suite: ${roomNo}`, 20, y + 22, { charSpace: 0 });
  doc.text(`Booking ID: ${bookingId}`, 20, y + 28, { charSpace: 0 });
  doc.text(`Billing Period: ${period}`, 20, y + 34, { charSpace: 0 });

  const payMethod = payment.method || 'UPI QR';
  const txnRef = payment.referenceId || payment.transactionReference || 'N/A';
  const verifiedBy = payment.verifiedByName || 'Admin Verifier';
  const verifiedDate = payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : new Date(payment.createdAt || Date.now()).toLocaleString();

  doc.text(`Payment Method: ${payMethod}`, 108, y + 16, { charSpace: 0 });
  doc.text(`Reference / UTR ID: ${cleanTextString(txnRef)}`, 108, y + 22, { charSpace: 0 });
  doc.text(`Verified By: ${cleanTextString(verifiedBy)}`, 108, y + 28, { charSpace: 0 });
  doc.text(`Verified Date: ${verifiedDate}`, 108, y + 34, { charSpace: 0 });

  y += 48;

  // 5. Itemized Breakdown Table
  const tableRows = [];

  const rentFee = payment.amount - (payment.additionalCharges?.reduce((a,c) => a + (parseFloat(c.amount)||0), 0) || 0);
  tableRows.push([
    "Residency Rent Fee",
    payment.chargeCategory || "Rent",
    formatCurrencyINR(Math.max(0, rentFee))
  ]);

  if (Array.isArray(payment.additionalCharges) && payment.additionalCharges.length > 0) {
    payment.additionalCharges.forEach(chg => {
      tableRows.push([
        `Additional Charge: ${chg.name}`,
        "Utility / Service",
        formatCurrencyINR(chg.amount)
      ]);
    });
  }

  if (payment.previousDue > 0) {
    tableRows.push(["Previous Outstanding Due", "Rollover Due", formatCurrencyINR(payment.previousDue)]);
  }

  if (payment.advanceBalance > 0) {
    tableRows.push(["Advance Credit Balance", "Credit Balance", `- ${formatCurrencyINR(payment.advanceBalance)}`]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15, bottom: 20 },
    head: [["Item Description", "Category", "Amount (INR)"]],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { font: 'helvetica', fontSize: 9, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 95, halign: 'left' },
      1: { cellWidth: 45, halign: 'left' },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 12;

  // 6. Grand Total Box (Auto Font Scaling & Zero Clipping)
  fitTextIntoBox(doc, 'TOTAL PAID:', payment.grandTotal || payment.amount || 0, 115, finalY, 80, 20, {
    bg: primaryColor,
    border: primaryColor,
    labelColor: [255, 255, 255],
    amountColor: [255, 255, 255]
  });

  // 7. Footer
  const footerY = finalY + 34;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, 195, footerY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("This is an official computer-generated receipt issued by Krishna Lodge Management System.", 105, footerY + 8, { align: "center", charSpace: 0 });
  doc.text(`Generated Date: ${new Date().toLocaleString()} | Support: +91 94479 40835 | www.krishnaengg.com`, 105, footerY + 13, { align: "center", charSpace: 0 });

  const filename = `Receipt_${payment.receiptNumber || 'REC_' + (payment._id ? payment._id.slice(-6).toUpperCase() : '2026')}.pdf`;
  doc.save(filename);
};
