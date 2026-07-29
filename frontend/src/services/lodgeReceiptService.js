import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateLodgeReceiptPDF = async (payment) => {
  const doc = new jsPDF();

  const brandName = "KRISHNA LODGE & RESIDENCY MANAGER";
  const tagline = "Certified Industrial & Residency Facility";
  const address = "Krishna Complex, Site A, Kuttanassery, Palakkad, Kerala 679514";
  const phone = "+91 94479 40835 | contact@krishnaengg.com";

  // Standard Theme Colors
  const primaryColor = [79, 70, 229];  // Indigo-600
  const darkSlate = [15, 23, 42];     // Slate-900
  const lightGray = [248, 250, 252];   // Slate-50

  const formatINR = (amount) => {
    const val = parseFloat(amount || 0);
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Header Banner (A4 Top Margin)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 38, 'F');

  // Company Name (18pt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(brandName, 15, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`${tagline} | ${address}`, 15, 25);
  doc.text(`Contact: ${phone}`, 15, 31);

  // 2. Receipt Badge (Top Right)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(140, 8, 55, 24, 3, 3, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("PAYMENT RECEIPT", 143, 17);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const receiptNum = `#${payment.receiptNumber || 'REC-' + (payment._id ? payment._id.slice(-6).toUpperCase() : '2026')}`;
  doc.text(receiptNum, 143, 25);

  // 3. Status Ribbon
  doc.setFillColor(220, 252, 231); // Light Green
  doc.rect(0, 38, 210, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text("VERIFIED & PAID - OFFICIAL AUDIT RECORD", 105, 43.5, { align: "center" });

  let y = 54;

  // 4. Details Box (Tenant & Payment info)
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, y, 180, 40, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkSlate);
  doc.text("Tenant & Room Info:", 20, y + 9);
  doc.text("Payment Verification Details:", 108, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const tenantName = payment.tenantName || payment.customerId?.name || 'Valued Tenant';
  const roomNo = payment.roomId?.roomNumber ? `Room #${payment.roomId.roomNumber}` : 'Residency Suite';
  const bookingId = payment.bookingId ? `#${(payment.bookingId._id || payment.bookingId).slice(-6).toUpperCase()}` : 'N/A';
  const period = payment.billingPeriodStart ? `${new Date(payment.billingPeriodStart).toLocaleDateString()} - ${new Date(payment.billingPeriodEnd).toLocaleDateString()}` : 'Current Billing Cycle';

  doc.text(`Tenant Name: ${tenantName}`, 20, y + 16);
  doc.text(`Room/Suite: ${roomNo}`, 20, y + 22);
  doc.text(`Booking ID: ${bookingId}`, 20, y + 28);
  doc.text(`Billing Period: ${period}`, 20, y + 34);

  const payMethod = payment.method || 'UPI QR';
  const txnRef = payment.referenceId || payment.transactionReference || 'N/A';
  const verifiedBy = payment.verifiedByName || 'Admin Verifier';
  const verifiedDate = payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : new Date(payment.createdAt || Date.now()).toLocaleString();

  doc.text(`Payment Method: ${payMethod}`, 108, y + 16);
  doc.text(`Reference / UTR ID: ${txnRef}`, 108, y + 22);
  doc.text(`Verified By: ${verifiedBy}`, 108, y + 28);
  doc.text(`Verified Date: ${verifiedDate}`, 108, y + 34);

  y += 48;

  // 5. Itemized Breakdown Table
  const tableRows = [];

  const rentFee = payment.amount - (payment.additionalCharges?.reduce((a,c) => a + (parseFloat(c.amount)||0), 0) || 0);
  tableRows.push([
    "Residency Rent Fee",
    payment.chargeCategory || "Rent",
    formatINR(Math.max(0, rentFee))
  ]);

  if (Array.isArray(payment.additionalCharges) && payment.additionalCharges.length > 0) {
    payment.additionalCharges.forEach(chg => {
      tableRows.push([
        `Additional Charge: ${chg.name}`,
        "Utility / Service",
        formatINR(chg.amount)
      ]);
    });
  }

  if (payment.previousDue > 0) {
    tableRows.push(["Previous Outstanding Due", "Rollover Due", formatINR(payment.previousDue)]);
  }

  if (payment.advanceBalance > 0) {
    tableRows.push(["Advance Credit Balance", "Credit Balance", `- ${formatINR(payment.advanceBalance)}`]);
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

  // 6. Grand Total Box (Auto-scaling text)
  doc.setFillColor(...primaryColor);
  doc.roundedRect(115, finalY, 80, 20, 2, 2, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL PAID:", 120, finalY + 13);
  
  const grandTotalText = formatINR(payment.grandTotal || payment.amount);
  let grandFontSize = 14;
  doc.setFontSize(grandFontSize);
  let textW = doc.getTextWidth(grandTotalText);
  while (textW > 45 && grandFontSize > 9) {
    grandFontSize -= 1;
    doc.setFontSize(grandFontSize);
    textW = doc.getTextWidth(grandTotalText);
  }
  doc.text(grandTotalText, 190, finalY + 13, { align: "right" });

  // 7. Footer
  const footerY = finalY + 34;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, 195, footerY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("This is an official computer-generated receipt issued by Krishna Lodge Management System.", 105, footerY + 8, { align: "center" });
  doc.text(`Generated Date: ${new Date().toLocaleString()} | Support: +91 94479 40835 | www.krishnaengg.com`, 105, footerY + 13, { align: "center" });

  // Save PDF
  const filename = `Receipt_${payment.receiptNumber || 'REC_' + (payment._id ? payment._id.slice(-6).toUpperCase() : '2026')}.pdf`;
  doc.save(filename);
};
