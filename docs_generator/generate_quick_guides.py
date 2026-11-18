"""
Generator for Krishna_ERP_Role_Wise_Quick_Guides.pdf
Standard Operating Procedures (SOP) & Quick Reference Cards for every user role:
Super Admin, Production Engineer, Storekeeper, Commercial/Accounts, HR & Shift Supervisor,
Client Stakeholder, and Lodge Manager.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable, Image
)
from reportlab.lib.units import inch

from common import (
    NumberedCanvas, get_custom_styles, make_callout, make_kv_table, make_grid_table,
    COLOR_BORDER, COLOR_ACCENT_BLUE, COMPANY_INFO
)


def build_quick_guides():
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Krishna_ERP_Role_Wise_Quick_Guides.pdf"))

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=38,
        rightMargin=38,
        topMargin=48,
        bottomMargin=48
    )

    styles = get_custom_styles()
    story = []

    # ─────────────────────────────────────────────────────────────────────────
    # COVER PAGE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 30))

    logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "logo.png"))
    if os.path.exists(logo_path):
        try:
            story.append(Image(logo_path, width=2.4*inch, height=1.0*inch))
        except Exception:
            pass
    story.append(Spacer(1, 25))

    story.append(Paragraph("KRISHNA ENGINEERING WORKS", styles['CoverTitle']))
    story.append(Paragraph("ROLE-WISE QUICK REFERENCE GUIDES & SOPS", styles['CoverSubtitle']))
    story.append(HRFlowable(width="100%", thickness=3, color=COLOR_ACCENT_BLUE, spaceBefore=10, spaceAfter=25))

    p_intro = (
        "<b>Standard Operating Procedure (SOP) Quick Cards</b><br/><br/>"
        "Tailored operational protocols, daily duty checklists, system navigation paths, "
        "and strict compliance guardrails designed for each distinct user role across the enterprise: "
        "Managing Director / Super Admin, Production & QC Engineers, Warehouse Storekeepers, "
        "Commercial & Accounts Officers, HR & Shift Supervisors, Client Stakeholders, and Lodge Managers."
    )
    story.append(Paragraph(p_intro, styles['Body_Custom']))
    story.append(Spacer(1, 25))

    meta_rows = [
        ["Document Code", "KEW-ERP-SOP-2026-V6.4"],
        ["System Version", COMPANY_INFO['version']],
        ["Applicable Scope", "All Manufacturing Yards, Stores, Offices, and Erection Sites"],
        ["Mandatory Reading", "Every staff member must review their designated role SOP upon induction."],
        ["Security Classification", "INTERNAL OPERATIONAL PROCEDURE — CONFIDENTIAL"],
        ["Publication Date", "November 2026"]
    ]
    story.append(make_kv_table(meta_rows, col_widths=[140, 375], styles=styles))
    story.append(Spacer(1, 30))

    story.append(make_callout(
        "Each section of this document forms an autonomous Quick Reference Card. Department heads may print and post "
        "their specific section at workstations, store counters, and inspection desks as the official workplace SOP.",
        title="WORKPLACE SOP DEPLOYMENT",
        callout_type="info",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 1: SUPER ADMIN & EXECUTIVE MANAGEMENT
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Role SOP 1: Super Admin & Managing Director", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "<b>Role Objective:</b> Strategic oversight, high-value commercial approvals, drawing sign-offs, "
        "system configuration, financial auditing, and risk management.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    admin_daily = [
        ["Time Window", "Mandatory Task", "ERP Navigation Path & Action"],
        ["09:15 AM", "Morning Shopfloor & Shift Audit", "Admin Panel → Attendance: Review late arrivals beyond 10-min grace; inspect staff on-duty count."],
        ["10:00 AM", "Drawing Revision Approvals", "Drawings & Designs: Inspect pending CAD revisions; review change notes; click 'Approve Revision'."],
        ["11:30 AM", "Procurement Approvals (> ₹50k)", "Procurement → Purchase Orders: Review tier-2 POs; verify quotation comparisons; authorize POs."],
        ["03:00 PM", "Cash Flow & Receivables Review", "Finance → Cash Flow: Review 30-day runway; inspect overdue client accounts; follow up with commercial."],
        ["05:30 PM", "Daily Production & Dispatch Sign-Off", "Production → JWO / Dispatch: Review completed orders; sign off digital KEC-CERT handover certificates."]
    ]
    story.append(make_grid_table(admin_daily[0], admin_daily[1:], col_widths=[85, 170, 260], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Key Admin Controls & Settings Checklist:", styles['Heading2_Custom']))
    story.append(Paragraph("• <b>Shift Configuration:</b> Admin Panel → Shift Management (Morning Shift 09:00 AM, Grace: 10m, Shift End: 17:00, Allowance: 10m).", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>User Role Management:</b> Admin Panel → Users (Promote, demote, deactivate, reset passwords).", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Database Snapshot:</b> System Admin → Backups (Verify daily automated hot dump timestamp).", styles['Bullet_Custom']))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 2: PRODUCTION & QC ENGINEERS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Role SOP 2: Production & Quality Control (QC) Engineers", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "<b>Role Objective:</b> Flawless fabrication execution, workstation throughput, strict drawing adherence, "
        "weld quality verification, and zero scrap wastage.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    prod_daily = [
        ["Shift Hour", "Operational Task", "System Procedure & Quality Standard"],
        ["09:00 AM", "Morning JWO Lineup", "Open Production → Job Work Orders; verify drawing approval status before assigning work to fitters."],
        ["10:30 AM", "BOM Material Allocation", "Verify Material Issue Requests (MIR) with warehouse; confirm plate heat numbers match specs."],
        ["01:30 PM", "In-Process Inspection (Fit-Up)", "Quality Control → In-Process: Check root gaps, bevels (30°/45°), diagonal squareness (±1.5mm)."],
        ["03:30 PM", "NDT & Weld Verification", "Execute Dye Penetrant Test (DPT) on critical joints; upload test report to JWO record."],
        ["04:45 PM", "Daily Workstation Log Update", "Record fabricated tonnage, machine run-hours, and log offcuts to Scrap Reclamation bay."]
    ]
    story.append(make_grid_table(prod_daily[0], prod_daily[1:], col_widths=[80, 165, 270], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "STRICT QUALITY GUARDRAIL: Never proceed with structural welding if the fit-up inspection fails tolerance. "
        "If defects occur, create an immediate Rework Ticket in QC → Rework to document corrective grinding and re-welding.",
        title="ZERO DEFECT MANDATE",
        callout_type="danger",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 3: STOREKEEPER & WAREHOUSE MANAGER
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Role SOP 3: Storekeeper & Warehouse Manager", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "<b>Role Objective:</b> Accurate inward receiving (GRN), rigorous physical stock audits, barcode/QR labeling, "
        "prompt shopfloor issue against approved BOMs, and scrap yard control.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    store_sop = [
        ["Process Area", "Mandatory Action", "ERP Step & Verification Standard"],
        ["Inward Receiving (GRN)", "Unload steel trailer; match physical delivery against vendor PO.", "Inventory → GRN: Enter gross/tare weighbridge weight; attach Mill Test Cert; mark accepted/rejected."],
        ["QR Barcode Labeling", "Generate and affix serialized QR labels to steel bundles & tool bins.", "Inventory → Barcodes: Click 'Print QR Tag'; attach weather-proof label to steel plates/channels."],
        ["Material Issue (BOM)", "Issue steel plates, electrodes, and bolts to active JWOs.", "Production → Material Issue: Scan JWO barcode; scan item QR; system auto-deducts inventory balance."],
        ["Safety Stock Alerts", "Review items falling below minimum reorder thresholds daily.", "Inventory → Alerts: Export low-stock report; generate Purchase Requisition for approval."],
        ["Scrap Weighbridge Entry", "Weigh offcuts and turning scrap; record return from shopfloor.", "Inventory → Scrap: Log classified scrap class (HMS 1 / Offcut / Turnings) and exact weighment."]
    ]
    story.append(make_grid_table(store_sop[0], store_sop[1:], col_widths=[110, 165, 240], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "Physical issues without an authorized Material Issue Request (MIR) in the ERP are strictly prohibited. "
        "Any stock variance identified during monthly cycle counts is charged to warehouse accountability.",
        title="INVENTORY INTEGRITY RULE",
        callout_type="alert",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 4: COMMERCIAL & ACCOUNTS OFFICER
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Role SOP 4: Commercial & Accounts Officer", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "<b>Role Objective:</b> Quotation estimation, prompt GST tax invoicing, debtor collection tracking, "
        "supplier payment scheduling, and ledger reconciliations.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    accounts_sop = [
        ["Task Category", "Execution Timeline", "System Procedure & Accounting Standard"],
        ["Quotation Preparation", "Within 24 hours of inquiry", "Quotations → New Quote: Input tonnage, labor rates, craneage, margin; export official PDF."],
        ["Tax Invoicing", "Upon dispatch note / Delivery Challan", "Finance → Invoices: Select Project & Delivery Challan; apply 18% GST (CGST/SGST or IGST); issue PDF."],
        ["Inward Payment Receipt", "Same day of bank receipt", "Finance → Expense/Income: Log 'client_payment', enter bank UTR / NEFT reference; reconcile invoice."],
        ["Vendor Bill Booking", "Upon three-way GRN match", "Procurement → Vendor Bills: Match PO, GRN, and vendor invoice; schedule payment within credit days."],
        ["GST Returns Audit", "Monthly by 10th", "Finance → Tax Reports: Export GSTR-1 sales ledger and GSTR-3B input tax credit (ITC) reconciliation."]
    ]
    story.append(make_grid_table(accounts_sop[0], accounts_sop[1:], col_widths=[110, 130, 275], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Commercial Safeguard Rules:", styles['Heading2_Custom']))
    story.append(Paragraph("• Never issue dispatch clearance for finished structures if the client payment milestone is pending, unless approved in writing by Admin.", styles['Bullet_Custom']))
    story.append(Paragraph("• Verify all vendor GSTIN numbers before booking input tax credit (ITC) to prevent GST portal rejections.", styles['Bullet_Custom']))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 5: HR & SHIFT ATTENDANCE SUPERVISOR
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Role SOP 5: HR & Shift Attendance Supervisor", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "<b>Role Objective:</b> Punctuality enforcement, biometric/shift management, leave approvals, "
        "overtime validation, and automated monthly payroll.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    hr_sop = [
        ["Routine", "Daily Operational Schedule", "System Action & Enforcement Guideline"],
        ["Morning Shift Punch (09:00 AM)", "08:45 AM - 09:15 AM", "Monitor staff check-in. Grace period ends at 09:10 AM. Punches at 09:11+ flagged as LATE."],
        ["Late Arrival Monitoring", "09:30 AM", "Staff Attendance: Review late arrivals; issue late advisory if employee exceeds 3 monthly instances."],
        ["Evening Checkout (05:00 PM)", "04:50 PM - 05:30 PM", "Monitor departures. Allowance begins at 04:50 PM. Checkouts prior to 04:50 PM flagged as EARLY."],
        ["Status Audit & Recalculation", "06:00 PM", "Audit daily records: Records with IN & OUT must show COMPLETED; records with missing OUT show IN PROGRESS."],
        ["Overtime Verification", "Daily end-of-shift", "Review extra hours worked beyond 05:00 PM; verify against shopfloor supervisor overtime requisition."],
        ["Monthly Payroll Run", "Last working day of month", "HR → Payroll: Compute net pay, deduct advances/unpaid days, submit to Managing Director for sign-off."]
    ]
    story.append(make_grid_table(hr_sop[0], hr_sop[1:], col_widths=[115, 120, 280], styles=styles))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 6: CLIENT STAKEHOLDER & LODGE RESIDENT
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Role SOP 6: Client Stakeholder & Lodge Resident Guides", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph("6.1 Client Portal Quick Guide", styles['Heading2_Custom']))
    client_sop = [
        ["Feature / Goal", "How to Access", "Client Action Required"],
        ["Review Fabrication Drawings", "Customer Portal → Drawings", "Inspect uploaded PDF/CAD revision. Click 'Approve' to authorize fabrication or enter revision notes."],
        ["Track Project Milestones", "Customer Portal → Milestones", "View real-time progress bar (Cutting → Fit-up → Welding → Erection)."],
        ["Download Tax Invoices", "Customer Portal → Invoices", "Download GST-compliant Tax Invoices and payment receipts for accounts."],
        ["Project Handover (KEC-CERT)", "Customer Portal → Handover", "Complete final joint site inspection; sign the digital completion certificate on tablet."],
        ["Log Support / Warranty Ticket", "Customer Portal → Support", "Submit service requests with photo attachments for quick engineer response."]
    ]
    story.append(make_grid_table(client_sop[0], client_sop[1:], col_widths=[110, 130, 275], styles=styles))
    story.append(Spacer(1, 14))

    story.append(Paragraph("6.2 Lodge Resident Quick Guide", styles['Heading2_Custom']))
    lodge_guide = [
        ["Topic", "Resident SOP & Rules", "Billing & Payment Procedure"],
        ["Room & Bed Allocation", "Report to Lodge Office with Aadhaar KYC card; receive room keys and bed inventory checklist.", "Deposit ₹2,000 security advance upon check-in."],
        ["Monthly Rent Billing", "Rent generated on 1st of each calendar month based on allocated room category.", "Company staff: auto-deducted from payroll. Guests: pay via UPI."],
        ["Electricity / Utility Units", "Individual sub-meter read on 25th of each month; split equally among room occupants.", "Billed in monthly invoice at actual KSEB commercial rates."],
        ["Check-Out Protocol", "Provide 7 days prior notice; vacate room; return keys for room inventory inspection.", "Deposit refund processed within 48 hours post-clearance."]
    ]
    story.append(make_grid_table(lodge_guide[0], lodge_guide[1:], col_widths=[100, 235, 180], styles=styles))

    # Build PDF
    canvas_maker = lambda *args, **kwargs: NumberedCanvas(*args, **kwargs)
    doc.build(story, canvasmaker=canvas_maker)
    print(f"Successfully generated: {pdf_path}")


if __name__ == "__main__":
    build_quick_guides()
