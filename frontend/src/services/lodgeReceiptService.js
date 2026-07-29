import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateLodgeReceiptPDF = async (payment) => {
  const doc = new jsPDF();

  const brandName = "KRISHNA LODGE & RESIDENCY MANAGER";
  const tagline = "Certified Industrial & Residency Facility";
  const address = "Krishna Complex, Site A, Kuttanassery, Palakkad, Kerala";
  const phone = "+91 98470 12345 | support@krishna.com";

  // Colors
  const primaryColor = [79, 70, 229]; // Indigo-600
  const darkSlate = [15, 23, 42]; // Slate-900
  const lightGray = [248, 250, 252]; // Slate-50

  // 1. Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 38, 'F');

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(brandName, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`${tagline} | ${address}`, 14, 25);
  doc.text(`Contact: ${phone}`, 14, 31);

  // 2. Receipt Badge (Top Right)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(145, 8, 51, 24, 3, 3, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("PAYMENT RECEIPT", 148, 17);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`#${payment.receiptNumber || 'REC-' + payment._id.slice(-6).toUpperCase()}`, 148, 25);

  // 3. Status Ribbon
  doc.setFillColor(220, 252, 231); // Light Green
  doc.rect(0, 38, 210, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text("VERIFIED & PAID - OFFICIAL AUDIT RECORD", 105, 43.5, { align: "center" });

  let y = 54;

  // 4. Details Box (Tenant & Payment info)
  doc.setFillColor(...lightGray);
  doc.roundedRect(14, y, 182, 38, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkSlate);
  doc.text("Tenant & Room Info:", 18, y + 8);
  doc.text("Payment Verification Details:", 110, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const tenantName = payment.tenantName || payment.customerId?.name || 'Valued Tenant';
  const roomNo = payment.roomId?.roomNumber ? `Room #${payment.roomId.roomNumber}` : 'Residency Suite';
  const bookingId = payment.bookingId ? `#${(payment.bookingId._id || payment.bookingId).slice(-6).toUpperCase()}` : 'N/A';
  const period = payment.billingPeriodStart ? `${new Date(payment.billingPeriodStart).toLocaleDateString()} - ${new Date(payment.billingPeriodEnd).toLocaleDateString()}` : 'Current Billing Cycle';

  doc.text(`Tenant Name: ${tenantName}`, 18, y + 15);
  doc.text(`Room/Suite: ${roomNo}`, 18, y + 21);
  doc.text(`Booking ID: ${bookingId}`, 18, y + 27);
  doc.text(`Billing Period: ${period}`, 18, y + 33);

  const payMethod = payment.method || 'UPI QR';
  const txnRef = payment.referenceId || payment.transactionReference || 'N/A';
  const verifiedBy = payment.verifiedByName || 'Admin Verifier';
  const verifiedDate = payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : new Date(payment.createdAt).toLocaleString();

  doc.text(`Payment Method: ${payMethod}`, 110, y + 15);
  doc.text(`Reference / UTR ID: ${txnRef}`, 110, y + 21);
  doc.text(`Verified By: ${verifiedBy}`, 110, y + 27);
  doc.text(`Verified Date: ${verifiedDate}`, 110, y + 33);

  y += 46;

  // 5. Itemized Breakdown Table
  const tableRows = [];

  // Current Rent Row
  tableRows.push([
    "Residency Rent Fee",
    payment.chargeCategory || "Rent",
    `₹${(payment.amount - (payment.additionalCharges?.reduce((a,c) => a + (c.amount||0), 0) || 0)).toLocaleString()}`
  ]);

  // Additional Charges
  if (Array.isArray(payment.additionalCharges) && payment.additionalCharges.length > 0) {
    payment.additionalCharges.forEach(chg => {
      tableRows.push([
        `Additional Charge: ${chg.name}`,
        "Utility / Service",
        `₹${parseFloat(chg.amount || 0).toLocaleString()}`
      ]);
    });
  }

  // Previous Due
  if (payment.previousDue > 0) {
    tableRows.push(["Previous Outstanding Due", "Rollover Due", `₹${payment.previousDue.toLocaleString()}`]);
  }

  // Advance Balance
  if (payment.advanceBalance > 0) {
    tableRows.push(["Advance Credit Balance", "Credit Balance", `- ₹${payment.advanceBalance.toLocaleString()}`]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Item Description", "Category", "Amount (INR)"]],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 45 },
      2: { cellWidth: 37, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // 6. Grand Total Box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(120, finalY, 76, 20, 2, 2, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL PAID:", 125, finalY + 12);
  doc.setFontSize(14);
  doc.text(`₹${(payment.grandTotal || payment.amount).toLocaleString()}`, 190, finalY + 13, { align: "right" });

  // 7. Footer & Stamp
  const footerY = finalY + 32;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, 196, footerY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer-generated official receipt issued by Krishna Lodge Management System.", 105, footerY + 8, { align: "center" });
  doc.text("For query or support, please visit the Lodge Portal or contact admin.", 105, footerY + 13, { align: "center" });

  // Save PDF
  const filename = `Receipt_${payment.receiptNumber || 'REC_' + payment._id.slice(-6).toUpperCase()}.pdf`;
  doc.save(filename);
};
