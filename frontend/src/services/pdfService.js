import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateQuotePDF = (quote) => {
    const doc = new jsPDF();
    const primaryColor = [26, 26, 26]; // Brand 950
    const accentColor = [255, 182, 18]; // Brand Accent

    // Header System
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFillColor(...accentColor);
    doc.rect(10, 10, 15, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('KRISHNA ENGINEERING WORKS', 30, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(...accentColor);
    doc.text('OFFICIAL PROJECT ESTIMATION & BLUEPRINT', 30, 30);

    // Identity Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`QUOTE ID: ${quote._id.slice(-8).toUpperCase()}`, 10, 55);
    doc.text(`DATE: ${new Date(quote.createdAt).toLocaleDateString()}`, 150, 55);

    doc.setDrawColor(200, 200, 200);
    doc.line(10, 60, 200, 60);

    // Client/Project Table
    doc.autoTable({
        startY: 70,
        head: [['Project Parameter', 'Specification Details']],
        body: [
            ['CLIENT NAME', quote.name.toUpperCase()],
            ['CONTACT PHONE', quote.phone],
            ['SITE LOCATION', quote.location.toUpperCase()],
            ['OPERATION TYPE', quote.serviceType.toUpperCase()],
            ['WORK DESCRIPTION', quote.description],
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', width: 50 } },
    });

    // Financial Calculation
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFillColor(245, 245, 245);
    doc.rect(10, finalY, 190, 30, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL ESTIMATED COST (INR)', 20, finalY + 18);
    
    doc.setFontSize(20);
    doc.text(`RS. ${quote.estimatedCost?.toLocaleString()}`, 130, finalY + 18);

    // Footer Policy
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerY = 280;
    doc.text('DISCLAIMER: This is a system-generated preliminary estimation. Material indices and labor frequencies may vary', 20, footerY);
    doc.text('Contact Krishna Engineering Works for final operational sign-off.', 70, footerY + 5);

    // Final Output Authorization
    doc.save(`Quote_${quote._id.slice(-8).toUpperCase()}.pdf`);
};

export const generateSalaryPDF = (salary, user) => {
    const doc = new jsPDF();
    const primaryColor = [26, 26, 26];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('K.E.W. COMPENSATION ARCHIVE', 20, 25);

    // Employee Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`STAFF NAME: ${user.name.toUpperCase()}`, 10, 55);
    doc.text(`MONTH: ${salary.month} ${salary.year}`, 150, 55);

    // Breakdown Table
    doc.autoTable({
        startY: 65,
        head: [['Earnings Type', 'Calculation', 'Subtotal (INR)']],
        body: [
            ['BASE REMUNERATION', 'Monthly Standard', `₹ ${salary.amount?.toLocaleString()}`],
            ['BONUS/INCENTIVE', 'Discretionary', '₹ 0'],
            ['TAX DEDUCTION', 'Standard Index', '₹ 0'],
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColor }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text(`NET DISBURSED: ₹ ${salary.amount?.toLocaleString()}`, 120, finalY);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 150, 0);
    doc.text(`STATUS: ${salary.status.toUpperCase()}`, 10, finalY);

    doc.save(`SalarySlip_${salary.month}_${salary.year}.pdf`);
};
