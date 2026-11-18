"""
Generator for Krishna_Engineering_Works_ERP_Complete_User_Manual.pdf
Master comprehensive user manual covering all modules, workflows, architecture,
roles, security, troubleshooting, and enterprise references.
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.lib import colors
from reportlab.lib.units import inch, mm

from common import (
    NumberedCanvas, get_custom_styles, make_callout, make_kv_table, make_grid_table,
    COLOR_PRIMARY_DARK, COLOR_PRIMARY_BLUE, COLOR_ACCENT_BLUE, COLOR_ACCENT_GOLD,
    COLOR_SUCCESS, COLOR_DANGER, COLOR_BG_LIGHT, COLOR_BG_ALT, COLOR_BORDER,
    COLOR_TEXT_MAIN, COLOR_TEXT_MUTED, COMPANY_INFO
)


def build_manual():
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Krishna_Engineering_Works_ERP_Complete_User_Manual.pdf"))
    
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
    story.append(Spacer(1, 25))
    
    # Logo
    logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "logo.png"))
    if os.path.exists(logo_path):
        try:
            story.append(Image(logo_path, width=2.4*inch, height=1.0*inch))
        except Exception:
            pass
    story.append(Spacer(1, 20))

    story.append(Paragraph("KRISHNA ENGINEERING WORKS", styles['CoverTitle']))
    story.append(Paragraph("ENTERPRISE ERP 6.4 SYSTEM USER MANUAL", styles['CoverSubtitle']))
    
    story.append(HRFlowable(width="100%", thickness=3, color=COLOR_ACCENT_BLUE, spaceBefore=10, spaceAfter=25))
    
    overview_text = (
        "<b>Comprehensive Operational & Technical Reference Guide</b><br/><br/>"
        "Covering Full Industrial Workflows: Job Work Orders, Production Scheduling, BOM Engine, "
        "Engineering Drawing Revision Control, Multi-Warehouse Inventory, Barcode/QR Logistics, "
        "Procurement & GRN, Quality Control & Rework, Scrap Reclamation, Project Handover Certification, "
        "Quotation & GST Invoicing, Financial Ledgers, Fleet Logistics, Machinery Maintenance, "
        "Biometric Shift & Late/Early Attendance, Automated Payroll, CRM Pipeline, Digital Document Vault, "
        "Lodge Residency Management, and Client Self-Service Portal."
    )
    story.append(Paragraph(overview_text, styles['Body_Custom']))
    story.append(Spacer(1, 25))

    # Meta Table
    meta_rows = [
        ["Document Code", "KEW-ERP-DOC-2026-V6.4"],
        ["System Version", COMPANY_INFO['version']],
        ["Applicable Roles", "Super Admin, General Manager, Production Engineer, Shopfloor Supervisor, Storekeeper, QC Inspector, Accountant, Client, Resident"],
        ["Operating Facility", f"{COMPANY_INFO['name']}, {COMPANY_INFO['address']}"],
        ["Contact & Support", f"Phone: {COMPANY_INFO['phone']} | Email: {COMPANY_INFO['email']}"],
        ["Classification", "OFFICIAL USER MANUAL — STRICTLY CONFIDENTIAL & PROPRIETARY"],
        ["Publication Date", "November 2026 (Enterprise Edition)"]
    ]
    story.append(make_kv_table(meta_rows, col_widths=[140, 375], styles=styles))
    story.append(Spacer(1, 30))

    story.append(make_callout(
        "This user manual represents the authoritative operational standard for all staff, engineers, and administrative "
        "officers at Krishna Engineering Works. All business transactions, production tracking, material issues, and financial entries "
        "must strictly comply with the procedures specified herein. Any unauthorized data modification, bypass of quality inspections, "
        "or manual tampering with attendance/financial records is strictly audited.",
        title="ENTERPRISE COMPLIANCE MANDATE",
        callout_type="alert",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # DOCUMENT CONTROL & REVISION HISTORY
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Document Information & Revision History", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "This enterprise document is maintained under configuration management protocols. Each release undergoes "
        "rigorous validation against the operational database schema, backend API routes, and frontend interface.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    rev_headers = ["Version", "Release Date", "Primary Changes & Module Enhancements", "Approved By"]
    rev_rows = [
        ["v1.0 - v3.2", "2024 - 2025", "Initial Core ERP: Quotations, Invoices, Staff Directory & Basic Inventory.", "Managing Director"],
        ["v4.0 - v5.0", "Jan - Jun 2026", "Integration of Job Work Orders, Multi-stage GRN, Fleet Management & Customer Portal.", "Technical Director"],
        ["v6.0", "Aug 2026", "Added Machine Maintenance Logs, Petty Cash & Scrap Reclamation module.", "Operations Head"],
        ["v6.2", "Oct 2026", "Material Consumption & BOM Engine with real-time stock allocation.", "Plant Head"],
        ["v6.3", "Nov 2026", "Fabrication Drawing Multi-Revision Control & Digital Project Handover (KEC-CERT).", "Quality & Design Head"],
        ["v6.4", "Nov 2026", "Late Arrival & Early Checkout Shift Rules, Descending Attendance Sort & Lodge Billing.", "Super Admin"]
    ]
    story.append(make_grid_table(rev_headers, rev_rows, col_widths=[55, 75, 290, 95], styles=styles))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # TABLE OF CONTENTS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Manual Structure & Chapter Overview", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    toc_headers = ["Chapter", "Module / Functional Area", "Target Role", "Operational Focus"]
    toc_data = [
        ["Ch. 1", "System Architecture & Security Guardrails", "All Roles", "Tech stack, JWT auth, RBAC, financial redaction"],
        ["Ch. 2", "Executive & Operational Dashboards", "Admin, Manager", "Real-time KPIs, production metrics, cash position"],
        ["Ch. 3", "Production Management & Job Work Orders", "Engineers, Supervisors", "JWO creation, batch tracking, operations, stages"],
        ["Ch. 4", "Fabrication Drawings & Revision Control", "Design, QC, Admin", "Drawing uploads, multi-revisions, approval gating"],
        ["Ch. 5", "Bill of Materials (BOM) & Cost Estimation", "Design, Production", "Itemized components, unit pricing, scrap allowance"],
        ["Ch. 6", "Multi-Warehouse & Site Stock Inventory", "Storekeeper, Supervisors", "Stock tracking, raw materials, tools, reorder thresholds"],
        ["Ch. 7", "Barcode & QR Code Inventory Logistics", "Storekeeper, Field Staff", "QR label generation, mobile scanning, quick dispatch"],
        ["Ch. 8", "Procurement, Vendor Management & Purchase Orders", "Procurement, Admin", "Vendor catalog, PO creation, multi-level approvals"],
        ["Ch. 9", "Goods Receipt Note (GRN) & Inward Inspection", "Storekeeper, QC", "PO matching, physical verification, defective returns"],
        ["Ch. 10", "Quality Control (QC) & Inspection Records", "QC Inspectors, Engineers", "Pre-production, in-process, final QC checklists"],
        ["Ch. 11", "Rework & Defect Remediation Tracking", "QC, Shopfloor Sup.", "Defect logging, root cause analysis, rework costs"],
        ["Ch. 12", "Scrap Management & Material Reclamation", "Store, Fabrication", "Offcut salvage, scrap weighing, scrap sales revenue"],
        ["Ch. 13", "Project Management, Timelines & Gantt", "Project Managers", "Milestones, progress bars, task assignments, deliverables"],
        ["Ch. 14", "Project Handover & Completion Certification", "Project Head, Admin", "Pre-handover audit, punch list, KEC-CERT issuance"],
        ["Ch. 15", "Quotation & Commercial Estimation Engine", "Sales, Commercial", "Estimation, margin markup, GST calculation, PDF print"],
        ["Ch. 16", "Invoicing, Billing & GST Compliance", "Accounts, Admin", "Tax Invoices, Proforma, CGST/SGST/IGST breakdown"],
        ["Ch. 17", "Unified Financial Ledger & Expense Tracking", "Accounts, Management", "Cash flow, project expense tagging, client receipts"],
        ["Ch. 18", "Cash Flow Forecasting & Financial Health", "Executive Management", "30-60-90 day runway, receivable aging, cash alerts"],
        ["Ch. 19", "Fleet Logistics & Vehicle Maintenance", "Transport Sup., Drivers", "Fleet registry, trip sheets, odometer, fuel audit"],
        ["Ch. 20", "Heavy Machinery & Equipment Maintenance", "Maintenance Engineers", "Run-hour logging, breakdown tickets, preventive PM"],
        ["Ch. 21", "HRMS: Staff Management & Directory", "HR, Admin", "Employee master, KYC, designations, salary brackets"],
        ["Ch. 22", "Attendance Tracking & Shift Rule Engine", "HR, All Staff", "Morning shift 09:00, grace period, late/early calculation"],
        ["Ch. 23", "Payroll, Overtime & Salary Slips", "Accounts, HR", "Salary generation, OT multipliers, deductions, payslips"],
        ["Ch. 24", "CRM, Leads & Sales Pipeline", "Marketing, Sales", "Inquiry logging, pipeline stages, proposal follow-ups"],
        ["Ch. 25", "Warranty, Service Tickets & After-Sales", "Service Engineers", "Warranty registry, complaint logging, technician visits"],
        ["Ch. 26", "Digital Document Vault & Enterprise Assets", "Admin, Document Ctrl", "CAD repository, legal docs, compliance certs"],
        ["Ch. 27", "Lodge & Staff Residency Management", "Lodge Manager, Admin", "Room inventory, bed allocation, rent billing, utilities"],
        ["Ch. 28", "Customer Self-Service Portal", "Client Stakeholders", "Live project status, drawing reviews, invoice payment"],
        ["Ch. 29", "System Administration, Backups & Audit Trail", "Super Admin, IT", "Database backups, user logs, API configuration"],
        ["Ch. 30", "Troubleshooting Guide & Industrial Glossary", "All Users", "Error resolutions, recovery steps, technical dictionary"]
    ]
    story.append(make_grid_table(toc_headers, toc_data, col_widths=[40, 195, 110, 170], styles=styles))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 1: SYSTEM ARCHITECTURE & SECURITY GUARDRAILS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 1: System Architecture & Security Guardrails", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Krishna Engineering Works ERP is an enterprise-grade industrial manufacturing and management platform. "
        "It integrates heavy engineering fabrication, warehouse logistics, project lifecycle tracking, financial accounting, "
        "and human resource management into a unified, secure system.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("1.1 Technical Stack Specifications", styles['Heading2_Custom']))
    stack_data = [
        ["Layer", "Technology Component", "Architecture Role & Security Implementation"],
        ["Frontend UI", "React 18.2 + Vite + TailwindCSS", "High-performance Single Page Application (SPA), role-based view routing, Lucide iconography, responsive mobile layout."],
        ["Backend API", "Node.js 20.x + Express REST Framework", "Modular MVC controllers, asynchronous route handlers, centralized error handling, request rate-limiting."],
        ["Database", "MongoDB Atlas / Enterprise 7.0 (Mongoose)", "Document-oriented persistence, 71 strict schemas, indexed queries, relational population, transaction guarantees."],
        ["Authentication", "JWT (JSON Web Tokens) + Bcrypt", "Stateless bearer token authentication, bcrypt password hashing (10 salt rounds), secure HTTP cookies."],
        ["Document Engine", "PDFKit + ExcelJS", "Dynamic server-side PDF document generation (Quotations, Tax Invoices, Payslips, Handover Certificates, QC reports)."],
        ["File Storage", "Local Multi-Directory Multer Storage", "Physical disk partition storage in /uploads/ with MIME-type validation and UUID file renaming."],
        ["Real-time Sync", "Socket.io Engine", "Push notifications for late attendance alerts, drawing approval changes, and stock depletion warnings."]
    ]
    story.append(make_grid_table(stack_data[0], stack_data[1:], col_widths=[90, 155, 270], styles=styles))
    story.append(Spacer(1, 12))

    story.append(Paragraph("1.2 User Roles & Financial Redaction Controls", styles['Heading2_Custom']))
    story.append(Paragraph(
        "Access control is governed by strict Role-Based Access Control (RBAC). A primary architectural safeguard "
        "is <b>Zero Financial Leakage to Shopfloor Personnel</b>. Engineers, supervisors, and operators can view job work specifications, "
        "drawings, and quantities, but commercial prices, profit margins, invoice sums, and company revenue are strictly redacted at both "
        "backend API endpoints and frontend UI components.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    roles_table = [
        ["Role Key", "User Type", "Permitted Modules", "Restricted & Gated Functions"],
        ["admin", "Super Admin / Managing Director", "Unrestricted access across all 36 modules, system settings, financials, approvals.", "No restrictions. Sole authority for drawing approvals & user deletion."],
        ["staff", "Engineers, Supervisors, Technicians", "Production, Job Work Orders, BOM, Drawings, Inventory, Machines, Attendance.", "CANNOT view invoice amounts, commercial prices, profit margins, or payroll totals."],
        ["customer", "Enterprise Clients & Project Buyers", "Client Portal: Project status, drawing preview, Quotation accept, Invoices.", "Strictly limited to their own organization's projects and billing records."],
        ["resident", "Lodge & Hostel Inmates", "Resident Portal: Room information, monthly rent dues, utility bills, notices.", "Isolated strictly to residency and room maintenance services."]
    ]
    story.append(make_grid_table(roles_table[0], roles_table[1:], col_widths=[60, 125, 180, 150], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "Attempting to bypass role controls via API tampering triggers an automated security alert. Staff attempting to access "
        "/api/invoices or /api/finance endpoints receive HTTP 403 Forbidden, and the unauthorized attempt is recorded in the system audit log.",
        title="SECURITY AUDIT COMPLIANCE",
        callout_type="danger",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 2: EXECUTIVE & OPERATIONAL DASHBOARDS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 2: Executive & Operational Dashboards", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Executive Dashboard serves as the central control console for the Managing Director and General Managers. "
        "It aggregates critical business health metrics into real-time KPI cards, operational trends, and high-priority action alerts.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("2.1 Executive KPI Cards", styles['Heading2_Custom']))
    dash_kpi = [
        ["Metric Name", "Data Source Model", "Calculation Logic & Business Meaning"],
        ["Active Projects", "Project.js (status: 'active')", "Count of all ongoing fabrication and structural engineering contracts."],
        ["Active Job Work Orders", "JobWorkOrder.js (status: 'in_progress')", "Live manufacturing orders currently undergoing cutting, welding, or assembly."],
        ["Monthly Revenue", "Expense.js (type: 'income')", "Gross realization from client payments, scrap sales, and fabrication contracts."],
        ["Monthly Operating Expense", "Expense.js (type: 'expense')", "Total operational spend: raw materials, wages, machine repairs, fuel, utilities."],
        ["Stock Alert Items", "InventoryItem.js (quantity <= minStock)", "Critical items below safety stock thresholds requiring immediate purchase orders."],
        ["Equipment In Breakdown", "MachineLog.js (status: 'Breakdown')", "Heavy tools or machinery currently offline, impacting production throughput."],
        ["Staff On-Duty Today", "Attendance.js (date: today, IN != null)", "Shopfloor personnel and administrative staff currently checked into the facility."]
    ]
    story.append(make_grid_table(dash_kpi[0], dash_kpi[1:], col_widths=[125, 140, 250], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("2.2 Dashboard Action Center & Urgent Notifications", styles['Heading2_Custom']))
    story.append(Paragraph(
        "Below the KPI summary cards, the Action Center surfaces items requiring immediate managerial decision-making:",
        styles['Body_Custom']
    ))
    story.append(Paragraph("• <b>Pending Drawing Approvals:</b> Unapproved engineering revisions blocking production cutting.", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Purchase Approvals:</b> POs awaiting General Manager commercial sign-off.", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Overdue Invoices:</b> Client accounts receivable exceeding agreed credit terms (>30 days).", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Critical Reorder Warnings:</b> Inventory items with zero available quantity in warehouse.", styles['Bullet_Custom']))

    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 3: PRODUCTION MANAGEMENT & JOB WORK ORDERS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 3: Production Management & Job Work Orders", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Job Work Order (JWO) module is the heartbeat of shopfloor manufacturing at Krishna Engineering Works. "
        "Every industrial contract, custom structural fabrication, or machining run is translated into an official JWO.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("3.1 JWO Lifecycle & Stage Progress", styles['Heading2_Custom']))
    jwo_stages = [
        ["Lifecycle Stage", "Authorized Actor", "Mandatory Prerequisites & System State Transitions"],
        ["Draft / Scheduled", "Production Engineer", "JWO generated, client & project linked, initial drawing attached, BOM assigned."],
        ["Material Allocated", "Storekeeper", "Required steel plates, channels, and consumables allocated from Inventory."],
        ["In Progress (Fabrication)", "Shopfloor Supervisor", "Raw materials issued; operations active: Cutting, CNC Machining, Fit-up, Welding."],
        ["Surface Treatment / QC", "QC Inspector", "Blasting, primer coating, galvanizing, or painting; final dimensional inspection."],
        ["Completed & Delivered", "Production Head", "QC sign-off complete; Dispatch Note / Delivery Challan issued to client."]
    ]
    story.append(make_grid_table(jwo_stages[0], jwo_stages[1:], col_widths=[110, 115, 290], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("3.2 Step-by-Step Guide: Creating a New Job Work Order", styles['Heading2_Custom']))
    story.append(Paragraph("1. Navigate to <b>Production → Job Work Orders</b> in the sidebar navigation.", styles['StepNumber']))
    story.append(Paragraph("2. Click the <b>'+ New Job Work Order'</b> button at top right.", styles['StepNumber']))
    story.append(Paragraph("3. Select the <b>Client</b> and <b>Project</b> from the searchable dropdown lists.", styles['StepNumber']))
    story.append(Paragraph("4. Enter <b>Work Order Title</b>, <b>Item Code</b>, and <b>Target Delivery Date</b>.", styles['StepNumber']))
    story.append(Paragraph("5. Define the <b>Workstation Stages</b> required (e.g., Flame Cutting → Bending → SAW Welding).", styles['StepNumber']))
    story.append(Paragraph("6. Attach the approved engineering drawing reference (DWG/PDF).", styles['StepNumber']))
    story.append(Paragraph("7. Click <b>'Save & Issue to Shopfloor'</b>. The system assigns a unique sequential code: JWO-YYYY-XXXX.", styles['StepNumber']))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 4: FABRICATION DRAWINGS & REVISION CONTROL
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 4: Fabrication Drawings & Revision Control", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Engineering errors in heavy fabrication lead to catastrophic material waste. The Drawing Revision Control "
        "system provides a centralized, audited repository for all CAD and architectural drawings, ensuring that the shopfloor "
        "<b>never fabricates from an outdated or unapproved revision</b>.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("4.1 Multi-Revision Data Structure", styles['Heading2_Custom']))
    story.append(Paragraph(
        "Each drawing is tracked in the <b>FabricationDrawing.js</b> model. When an engineer uploads a revision, the previous version "
        "is archived automatically in the revision history array with timestamp, author, and engineering change notes (ECN).",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    draw_meta = [
        ["Field", "Type", "Operational Purpose"],
        ["drawingNumber", "String (Unique)", "Official drawing identifier (e.g., KEW-DWG-STRUCT-042)."],
        ["title", "String", "Descriptive title (e.g., Heavy Overhead Crane Girder Assembly - 25T)."],
        ["currentRevision", "String", "Latest revision code (e.g., 'Rev 0', 'Rev 1', 'Rev 2A')."],
        ["approvalStatus", "Enum", "['pending', 'approved', 'rejected']. Only 'approved' is unlocked for shopfloor release."],
        ["approvedBy", "ObjectId (User)", "System user ID of the Admin/Manager who reviewed and authorized fabrication."],
        ["fileUrl", "String (Path)", "Secure server path to the vector PDF / DWG rendering."],
        ["revisionHistory", "Array of Objects", "Full historical audit trail: fileUrl, revision, notes, uploadedBy, createdAt."]
    ]
    story.append(make_grid_table(draw_meta[0], draw_meta[1:], col_widths=[110, 105, 300], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "CRITICAL ENFORCEMENT: A Job Work Order cannot transition into 'In Progress' if its attached drawing is in 'pending' "
        "or 'rejected' status. The cutting supervisor will receive an on-screen lock: 'Fabrication blocked — Drawing Rev X pending Admin sign-off'.",
        title="DRAWING APPROVAL GATING RULE",
        callout_type="danger",
        styles=styles
    ))
    story.append(Spacer(1, 12))

    story.append(Paragraph("4.2 Step-by-Step: Uploading & Approving Revision", styles['Heading2_Custom']))
    story.append(Paragraph("1. Open <b>Drawings & Designs</b> from the navigation menu.", styles['StepNumber']))
    story.append(Paragraph("2. Select the existing drawing from the table or click <b>'New Drawing'</b>.", styles['StepNumber']))
    story.append(Paragraph("3. To upload an engineering revision, click <b>'Upload Revision'</b> on the drawing modal.", styles['StepNumber']))
    story.append(Paragraph("4. Select the updated PDF/DWG file, enter the new revision tag (e.g., 'Rev 3'), and document the change description.", styles['StepNumber']))
    story.append(Paragraph("5. The status resets to <b>'Pending Approval'</b> immediately, alerting the Admin.", styles['StepNumber']))
    story.append(Paragraph("6. The Managing Director or General Manager inspects the drawing preview and clicks <b>'Approve Revision'</b>.", styles['StepNumber']))
    story.append(Paragraph("7. The drawing is stamped with a green <b>APPROVED</b> badge and released to the shopfloor tablets.", styles['StepNumber']))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 5: BILL OF MATERIALS (BOM) & COST ESTIMATION
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 5: Bill of Materials (BOM) & Cost Estimation", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Bill of Materials (BOM) module links engineering design with material procurement and real-time project costing. "
        "It breaks down complex assemblies into itemized raw materials, hardware components, bought-out items, and consumables.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("5.1 BOM Structure & Scrap Factor Allowance", styles['Heading2_Custom']))
    story.append(Paragraph(
        "In heavy industrial fabrication, cutting steel plates and profiles inevitably yields offcuts and burning losses. "
        "The Krishna Engineering BOM engine incorporates an automated <b>Scrap Factor Percentage (3% - 8%)</b> to ensure accurate "
        "material purchasing without stock shortages.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    bom_columns = [
        ["Component Category", "Typical Items", "Unit of Measure", "Costing & Allocation Behavior"],
        ["Structural Steel", "ISMB Beams, ISMC Channels, Angles, Plates (MS/SS)", "KG / Metric Ton", "Direct allocation from raw material yard; tracked by heat number."],
        ["Hardware & Fasteners", "High-tensile Grade 8.8/10.9 Bolts, Nuts, Washers", "Pieces / Sets", "Reserved in batches; auto-deducted from warehouse upon assembly."],
        ["Welding Consumables", "7018 Electrodes, MIG Wire Spools, CO2/Argon Gas", "KG / Cylinders", "Estimated based on joint run length; allocated to workstation."],
        ["Paints & Coatings", "Zinc Chromate Primer, Epoxy Finish, Thinner", "Liters", "Calculated on total surface area square meters (DFT specs)."]
    ]
    story.append(make_grid_table(bom_columns[0], bom_columns[1:], col_widths=[105, 150, 80, 180], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("5.2 Linking BOM to Real-Time Inventory Consumption", styles['Heading2_Custom']))
    story.append(Paragraph(
        "When a JWO with an approved BOM is launched, the system generates a <b>Material Issue Request (MIR)</b>. "
        "The storekeeper verifies the physical stock against the BOM reservation and clicks <b>'Confirm Issue'</b>. "
        "This simultaneously updates warehouse stock levels and logs the actual material cost against the project's financial ledger.",
        styles['Body_Custom']
    ))

    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 6: MULTI-WAREHOUSE & SITE STOCK MANAGEMENT
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 6: Multi-Warehouse & Site Stock Inventory", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Krishna Engineering Works operates multiple physical inventory locations: Main Factory Yard, Enclosed Consumables Store, "
        "Machinery Spares Warehouse, and on-site client erection locations (e.g., KINFRA Site, Palakkad Industrial Belt).",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    wh_table = [
        ["Location Code", "Warehouse / Yard Name", "Primary Stock Managed", "Access Permissions"],
        ["WH-MAIN", "Central Fabrication Yard", "Heavy steel plates, beams, pipes, structural sections.", "Head Storekeeper, Crane Operators"],
        ["WH-STORE", "Tool & Consumables Room", "Electrodes, grinding wheels, drills, safety PPE, paints.", "Tool Room Attendant, Supervisors"],
        ["WH-SPARES", "Machinery Maintenance Store", "Hydraulic seals, CNC spare motors, drive belts, bearings.", "Maintenance Engineers, Technicians"],
        ["SITE-01..N", "Active Project Erection Sites", "Fabricated trusses, anchor bolts, site erection gear.", "Site In-Charge, Project Managers"]
    ]
    story.append(make_grid_table(wh_table[0], wh_table[1:], col_widths=[75, 130, 180, 130], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("6.1 Stock Transfer Protocol (Inter-Warehouse & Site Dispatch)", styles['Heading2_Custom']))
    story.append(Paragraph("1. Open <b>Inventory → Stock Transfers</b>.", styles['StepNumber']))
    story.append(Paragraph("2. Select <b>Source Location</b> (e.g., WH-MAIN) and <b>Destination Location</b> (e.g., SITE-01).", styles['StepNumber']))
    story.append(Paragraph("3. Add line items with quantities, serial/heat numbers, and purpose.", styles['StepNumber']))
    story.append(Paragraph("4. Click <b>'Generate Transfer Delivery Challan'</b>. The system generates a printable Delivery Challan.", styles['StepNumber']))
    story.append(Paragraph("5. Stock status moves to <b>'In-Transit'</b> until the Site In-Charge scans the QR code or clicks <b>'Confirm Receipt'</b>.", styles['StepNumber']))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 7: BARCODE & QR CODE INVENTORY LOGISTICS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 7: Barcode & QR Code Inventory Logistics", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "To eliminate manual entry errors and speed up stocktaking, every raw material bundle, fabricated assembly, "
        "and tool item in Krishna Engineering Works is tracked using standard 2D QR codes.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("7.1 QR Code Format & Data Payload", styles['Heading2_Custom']))
    story.append(Paragraph(
        "The system generates serialized QR labels encoding JSON data: Item SKU, Batch/Heat Number, Purchase Date, "
        "and Current Warehouse Bay location. Scanning the QR code via mobile camera or barcode scanner opens the instant item modal.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    qr_actions = [
        ["Operation", "Scanning Trigger", "Automated System Update"],
        ["Inward Receiving (GRN)", "Scan vendor pallet / bundle label", "Populates item details in GRN form, verifies against PO quantity."],
        ["Shopfloor Issue", "Scan item QR + Scan JWO barcode", "Transfers stock from warehouse to active JWO, recalculating remaining balance."],
        ["Stock Count Audit", "Rapid-scan warehouse bin racks", "Compares physical scan count against database ledger, flagging variances."],
        ["Dispatch Verification", "Scan outbound finished structural member", "Validates item against Delivery Challan, preventing dispatch errors."]
    ]
    story.append(make_grid_table(qr_actions[0], qr_actions[1:], col_widths=[110, 140, 265], styles=styles))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 8: PROCUREMENT, VENDOR MANAGEMENT & PURCHASE ORDERS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 8: Procurement, Vendor Management & Purchase Orders", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Procurement handles the requisition, supplier quotation comparison, and authorized purchase order issuance "
        "for raw steel, hardware, machine spares, and subcontracted treatments (e.g., hot-dip galvanizing).",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("8.1 Purchase Order (PO) Multi-Level Approval", styles['Heading2_Custom']))
    story.append(Paragraph(
        "To maintain fiscal discipline, purchase orders are subjected to approval tiers based on total PO value:",
        styles['Body_Custom']
    ))
    story.append(Paragraph("• <b>Tier 1 (Up to ₹50,000):</b> Storekeeper / Purchase Officer generates; General Manager approves.", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Tier 2 (Above ₹50,000):</b> Requires mandatory digital sign-off from the Managing Director (Super Admin).", styles['Bullet_Custom']))
    story.append(Spacer(1, 6))

    po_steps = [
        ["Step", "Action", "Key Data Captured & Validation Checks"],
        ["1. Requisition", "Create Purchase Requisition", "Triggered automatically when inventory falls below minStock or manually by Project Engineer."],
        ["2. Supplier RFQ", "Request for Quotation", "Select approved vendors from Vendor Master; enter required delivery date and specifications."],
        ["3. PO Generation", "Generate Draft PO", "Input agreed rates, payment terms (e.g., 30 days net), GST rate (18% for steel), freight terms."],
        ["4. Management Approval", "Admin Sign-Off", "Review margin impact; click 'Authorize PO'. PDF generated with official digital seal."],
        ["5. Vendor Dispatch", "Email / WhatsApp PO", "System exports PO PDF (PO-YYYY-XXXX) and sends copy to vendor's registered contact."]
    ]
    story.append(make_grid_table(po_steps[0], po_steps[1:], col_widths=[75, 120, 320], styles=styles))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 9: GOODS RECEIPT NOTE (GRN) & INWARD INSPECTION
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 9: Goods Receipt Note (GRN) & Inward Inspection", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Goods Receipt Note (GRN) is the legal and accounting record confirming that materials ordered via a Purchase Order "
        "have physically arrived at the factory and passed dimensional and physical verification.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("9.1 GRN Three-Way Matching Protocol", styles['Heading2_Custom']))
    story.append(Paragraph(
        "The system enforces strict <b>Three-Way Matching</b> between: (1) The approved Purchase Order, (2) The Vendor Delivery Challan / Invoice, "
        "and (3) The physical count recorded on the GRN. Invoices cannot be processed for payment without an authorized GRN.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    grn_fields = [
        ["GRN Field", "Database Key", "System Logic & Validation"],
        ["GRN Number", "grnNumber", "Autogenerated sequence: GRN-YYYY-XXXX."],
        ["Purchase Order Ref", "purchaseOrder", "Links to PurchaseOrder.js; pulls expected items and accepted unit prices."],
        ["Received Quantity", "receivedQuantity", "Physical quantity counted or weighbridge gross minus tare weight."],
        ["Accepted Quantity", "acceptedQuantity", "Material passing inward QC inspection, immediately credited to Inventory."],
        ["Rejected Quantity", "rejectedQuantity", "Damaged, bent, or off-spec material flagged for vendor return / debit note."],
        ["Mill Test Certificate (MTC)", "mtcDocument", "Uploaded PDF/Image of steel manufacturer chemical & tensile test cert."],
        ["Inspection Remarks", "qcRemarks", "Mandatory notes by Storekeeper/QC regarding visual defects, rust, or tolerances."]
    ]
    story.append(make_grid_table(grn_fields[0], grn_fields[1:], col_widths=[110, 105, 300], styles=styles))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 10: QUALITY CONTROL (QC) & INSPECTION RECORDS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 10: Quality Control (QC) & Inspection Records", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Krishna Engineering Works adheres to stringent industrial fabrication standards (IS 2062 for structural steel, "
        "IS 816 for metal arc welding, and ASME Section IX for weld procedures). The QC module provides digital inspection checklists.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    qc_types = [
        ["Inspection Stage", "Testing Focus", "Key Acceptance Criteria"],
        ["Inward Raw Material QC", "Steel plates, angles, bolts, welding rods", "Mill test certificate verification, plate thickness ultrasonic test, visual rust grade."],
        ["In-Process Fabrication QC", "Fit-up, tack welding, bevel angles, root gap", "Tolerances within ±1.5 mm, correct bevel angle (30°/45°), joint alignment."],
        ["Weld Inspection (NDT)", "Full penetration butt welds, fillet joints", "Dye Penetrant Test (DPT), Magnetic Particle (MPT), or Radiographic Test (RT)."],
        ["Surface Treatment QC", "Blasting cleanliness, paint coat thickness", "Surface profile Sa 2.5, Dry Film Thickness (DFT) measured via Elcometer gauge."],
        ["Final Dimensional Inspection", "Overall length, diagonal squareness, camber", "Complete assembly meets client fabrication drawing within ±2.0 mm tolerance."]
    ]
    story.append(make_grid_table(qc_types[0], qc_types[1:], col_widths=[110, 140, 265], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "Upon successful final inspection, the QC Inspector generates an official <b>Inspection Release Note (IRN)</b>. "
        "If any parameter fails, the JWO is immediately routed to the Rework Management Module.",
        title="QC RELEASE ENFORCEMENT",
        callout_type="success",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 11: REWORK & DEFECT REMEDIATION TRACKING
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 11: Rework & Defect Remediation Tracking", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "When an in-process fabrication or final assembly fails inspection, creating a formal Rework Order ensures that "
        "defects are systematically rectified and the extra labor and material costs are tracked separately.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("11.1 Defect Classification & Root Cause Analysis", styles['Heading2_Custom']))
    defect_table = [
        ["Defect Category", "Typical Examples", "Remediation Workflow & Corrective Action"],
        ["Welding Defects", "Porosity, undercut, lack of penetration, slag inclusions", "Carbon arc gouging / grinding to base metal, re-welding by certified welder, repeat DPT."],
        ["Dimensional Errors", "Diagonal out-of-square, incorrect hole pitch, warpage", "Hydraulic press straightening, thermal flame heating, hole reaming or plugging."],
        ["Machining Deviations", "Oversized bore, undersized shaft, thread pitch error", "Sleeving, metal spray deposition, or remachining on lathe/milling center."],
        ["Coating Failures", "Blistering, pinholes, peeling paint, insufficient DFT", "Spot blasting or power wire brushing, re-application of primer and epoxy coats."]
    ]
    story.append(make_grid_table(defect_table[0], defect_table[1:], col_widths=[105, 150, 260], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("11.2 Tracking Rework Costs against Project Margins", styles['Heading2_Custom']))
    story.append(Paragraph(
        "Every hour spent on rework and every kilogram of additional welding consumable is tagged to the JWO rework ledger. "
        "The project profitability report displays both <b>Budgeted Fabrication Cost</b> and <b>Cost of Quality / Rework Loss</b>, "
        "enabling plant management to identify training gaps and equipment calibration needs.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 12: SCRAP MANAGEMENT & MATERIAL RECLAMATION
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 12: Scrap Management & Material Reclamation", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Structural steel fabrication generates substantial steel plate offcuts, beam cut-pieces, turning chips, and punch slugs. "
        "The Scrap Management module prevents scrap pilferage and maximizes recovery value.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    scrap_matrix = [
        ["Scrap Class", "Physical Description", "Handling & Reclamation Protocol"],
        ["Usable Offcuts (Reusable Stock)", "Plate drops > 300x300mm, beam pieces > 1 meter", "Returned to warehouse (WH-MAIN) with yellow paint mark; credited back to project budget."],
        ["Melting Heavy Scrap (HMS 1)", "Clean steel plate trimmings, structural cut pieces > 6mm", "Weighed on gross weighbridge, stored in Scrap Bay A; sold to regional induction furnaces."],
        ["Light Scrap / Turnings", "Lathe turnings, CNC punch scrap, sheet offcuts < 3mm", "Compacted into drums; weighed and sold bi-monthly to recycling aggregators."],
        ["Non-Ferrous Scrap", "Copper welding cables, brass bushings, aluminum trimmings", "Stored in locked security cage; sold at specialized premium non-ferrous spot rates."]
    ]
    story.append(make_grid_table(scrap_matrix[0], scrap_matrix[1:], col_widths=[110, 140, 265], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "When scrap is sold to a recycling merchant, the generated revenue is logged directly in Expense.js with "
        "type: 'income' and category: 'scrap_sale'. The system generates a Gate Pass cum Scrap Sale Invoice.",
        title="FINANCIAL LEDGER SCRAP INTEGRATION",
        callout_type="info",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 13: PROJECT MANAGEMENT, TIMELINES & GANTT
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 13: Project Management, Timelines & Gantt", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Large-scale structural works (e.g., Factory Sheds, Overhead Cranes, Multi-Tier Mezzanine Floors) involve hundreds "
        "of interrelated tasks. The Project Management module provides Gantt timeline tracking, milestone progress, and budget control.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("13.1 Milestone Tracking & Financial Linkage", styles['Heading2_Custom']))
    proj_stages = [
        ["Project Milestone", "Key Deliverables", "Billing Trigger / Payment Milestone"],
        ["1. Engineering & Approvals", "Approved structural CAD drawings, GA drawings, BOM.", "Advance payment (typically 20% - 30% on order confirmation)."],
        ["2. Raw Material Inward", "All steel sections, plates, and anchor bolts at site/yard.", "Material mobilization billing milestone (30%)."],
        ["3. Shopfloor Fabrication", "All primary columns, trusses, purlins fabricated & QC approved.", "Progress billing milestone upon factory inspection (20%)."],
        ["4. Site Erection & Assembly", "Erection at client location, alignment, bolt torquing.", "Erection completion milestone (15%)."],
        ["5. Handover & Commissioning", "Final inspection, touch-up painting, KEC-CERT handover.", "Final retention payment release (5% - 10%)."]
    ]
    story.append(make_grid_table(proj_stages[0], proj_stages[1:], col_widths=[110, 215, 190], styles=styles))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 14: PROJECT HANDOVER & COMPLETION CERTIFICATION
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 14: Project Handover & Completion Certification", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Formal contract closure requires a structured handover protocol. The Project Handover module enforces a strict digital "
        "checklist before issuing the official <b>Krishna Engineering Works Completion Certificate (KEC-CERT)</b>.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("14.1 Mandatory Pre-Handover Checklist", styles['Heading2_Custom']))
    story.append(Paragraph("• <b>Structural Alignment Verification:</b> Plumbness and torque tightness confirmed by Site In-Charge.", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>QC Dossier Compilation:</b> As-built drawings, NDT reports, and paint DFT test certificates attached.", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Punch List Liquidation:</b> All pending touch-up paint items or missing trim plates completed and verified.", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Site De-mobilization:</b> Cranes, scaffolding, and scrap cleared from client premises.", styles['Bullet_Custom']))
    story.append(Spacer(1, 6))

    handover_fields = [
        ["Field Name", "Schema Identifier", "Operational Description"],
        ["Certificate Number", "certificateNumber", "Unique sequential certificate: KEC-CERT-YYYY-XXXX."],
        ["Client Representative", "clientSignatoryName", "Authorized client engineer or project manager accepting the site."],
        ["Sign-off Timestamp", "handoverDate", "Exact date and time of joint final site walkthrough."],
        ["Warranty Term", "warrantyMonths", "Default 12 to 24 months structural warranty coverage period."],
        ["Digital Sign-Off", "clientSignatureData", "Base64 canvas signature captured from client tablet/portal."]
    ]
    story.append(make_grid_table(handover_fields[0], handover_fields[1:], col_widths=[120, 125, 270], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "Once KEC-CERT is finalized and digitally countersigned by the Managing Director, the system locks the project "
        "against further cost accruals and automatically moves the financial status to 'Ready for Final Invoicing'.",
        title="AUTOMATED PROJECT LOCKOUT",
        callout_type="success",
        styles=styles
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 15: QUOTATION & COMMERCIAL ESTIMATION ENGINE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 15: Quotation & Commercial Estimation Engine", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Quotation Engine enables commercial engineers to produce accurate, professional client estimates based on "
        "tonnage, machining hours, galvanizing rates, freight distances, and company margin guidelines.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("15.1 Quotation Cost Build-up Components", styles['Heading2_Custom']))
    quote_costing = [
        ["Cost Component", "Estimation Basis", "Standard Industrial Formula / Guideline"],
        ["Base Steel Cost", "Current market spot price per MT", "Total Tonnage (MT) x Steel Market Rate (₹/MT) + 5% scrap factor."],
        ["Fabrication Labor", "Shopfloor man-hours per ton", "Tonnage x Standard Fabrication Rate per MT (e.g., ₹14,000 - ₹22,000/MT)."],
        ["Consumables & Gas", "Electrode run length & gas volume", "Calculated at 4% - 6% of total fabrication base labor cost."],
        ["Surface Preparation & Paint", "Square meters surface area", "Area (sq.m) x (Primer Cost + Epoxy Cost + Blast Labor Rate)."],
        ["Transportation & Craneage", "Distance in KM + Trailer loads", "Fixed trailer hire + Mobile hydra crane hire for loading/unloading."],
        ["Commercial Markup", "Target gross margin percentage", "Applied to total manufacturing cost (standard 15% - 25% gross margin)."]
    ]
    story.append(make_grid_table(quote_costing[0], quote_costing[1:], col_widths=[120, 135, 260], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("15.2 Converting Approved Quotation to Active Contract", styles['Heading2_Custom']))
    story.append(Paragraph(
        "When the client issues a formal Purchase Order or accepts the quotation via the Customer Portal, clicking "
        "<b>'Convert to Project & JWO'</b> automatically creates the Project master record, copies all line items into the initial BOM, "
        "and sets up the billing schedule without re-typing data.",
        styles['Body_Custom']
    ))

    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 16: INVOICING, BILLING & GST COMPLIANCE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 16: Invoicing, Billing & GST Compliance", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Billing module handles all tax invoicing in full compliance with the Indian Goods and Services Tax (GST) framework. "
        "It supports Tax Invoices, Proforma Invoices, Credit Notes, and Delivery Challans.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("16.1 GST Calculation & Tax Splits", styles['Heading2_Custom']))
    gst_rules = [
        ["Transaction Type", "Client Location", "Applicable GST Tax Components"],
        ["Intra-State Supply", "Kerala (State Code 32)", "CGST (9%) + SGST (9%) = Total 18% (HSN Code 7308 - Structural Steel Fabrication)"],
        ["Inter-State Supply", "Outside Kerala (e.g., Tamil Nadu 33, Karnataka 29)", "IGST (18%) Integrated Goods and Services Tax"],
        ["Lodge Accommodation", "On-premise Staff / Visiting Engineers", "Exempt or 12% depending on room tariff bracket (< ₹1,000 / day exempt)"],
        ["Scrap Steel Sales", "Registered Scrap Merchant", "RCM / 18% GST + 1% Tax Collected at Source (TCS) under Income Tax Section 206C"]
    ]
    story.append(make_grid_table(gst_rules[0], gst_rules[1:], col_widths=[110, 140, 265], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("16.2 Step-by-Step: Generating a Tax Invoice", styles['Heading2_Custom']))
    story.append(Paragraph("1. Open <b>Finance → Invoices</b> in the navigation menu.", styles['StepNumber']))
    story.append(Paragraph("2. Click <b>'+ Generate Tax Invoice'</b>.", styles['StepNumber']))
    story.append(Paragraph("3. Select the <b>Client Name</b> and choose the associated <b>Project / Delivery Challan</b>.", styles['StepNumber']))
    story.append(Paragraph("4. Verify line item descriptions, HSN codes (7308 for structures), quantities, and contracted unit rates.", styles['StepNumber']))
    story.append(Paragraph("5. The system computes Subtotal, CGST/SGST or IGST, Round-off, and Grand Total.", styles['StepNumber']))
    story.append(Paragraph("6. Click <b>'Authorize & Issue Invoice'</b>. The system generates a numbered PDF: INV-YYYY-XXXX with QR payment code.", styles['StepNumber']))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 17: UNIFIED FINANCIAL LEDGER & EXPENSE TRACKING
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 17: Unified Financial Ledger & Expense Tracking", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "All company financial movements are unified inside the <b>Expense.js</b> model, which handles both operational cash outflows "
        "(raw materials, fuel, petty cash, payroll) and cash inflows (client invoice settlements, scrap sales, machinery rental).",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("17.1 Expense & Income Category Classifications", styles['Heading2_Custom']))
    fin_cats = [
        ["Classification", "Category Key", "Operational Examples & Accounting Treatment"],
        ["Expense (Direct)", "raw_material", "Purchase of steel plates, channels, bolts, and electrodes tagged to specific projects."],
        ["Expense (Direct)", "machinery_repair", "Hydraulic press repairs, lathe motor rewinding, CNC tooling replacements."],
        ["Expense (Direct)", "fuel", "Diesel purchases for transport trailers, factory generator, and hydra cranes."],
        ["Expense (Indirect)", "salary_payroll", "Monthly employee salaries, overtime wages, and casual labor payouts."],
        ["Expense (Indirect)", "office_utilities", "Factory electricity bill (KSEB high-tension), internet, office supplies."],
        ["Income", "client_payment", "Inward bank NEFT/RTGS payments received against issued Tax Invoices."],
        ["Income", "scrap_sale", "Cash or bank receipt from sale of melting scrap, offcuts, and copper turnings."],
        ["Income", "lodge_rent", "Monthly room rent and electricity bill recovery from lodge tenants."]
    ]
    story.append(make_grid_table(fin_cats[0], fin_cats[1:], col_widths=[95, 115, 305], styles=styles))
    story.append(Spacer(1, 10))

    story.append(make_callout(
        "Project-Tagged Expenses: Every raw material, subcontractor bill, and diesel voucher MUST be linked to its specific Project ID. "
        "This allows the system to compute exact project gross margin = (Invoice Revenue - Direct Tagged Costs).",
        title="PROJECT COST ACCRUAL RULE",
        callout_type="alert",
        styles=styles
    ))

    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 18: CASH FLOW FORECASTING & FINANCIAL HEALTH
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 18: Cash Flow Forecasting & Financial Health", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Industrial manufacturing requires intense working capital. The Cash Flow Forecasting module projects liquid bank "
        "balances across 30, 60, and 90-day horizons by synthesizing accounts receivable schedules against committed purchase orders and payroll.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    cf_metrics = [
        ["Forecasting Pillar", "Input Data Stream", "Financial Impact & Risk Indicators"],
        ["Committed Inflows", "Unpaid Tax Invoices + Project milestones due", "Filtered by client credit history; flags delayed payments."],
        ["Committed Outflows", "Approved Purchase Orders + Vendor credit due dates", "Determines exact vendor payout commitments for upcoming weeks."],
        ["Statutory & Fixed Costs", "Payroll schedule + Monthly GST/TDS dues + KSEB bill", "Non-negotiable cash requirements; reserves required on 1st & 10th."],
        ["Net Working Runway", "Projected Net Bank Balance at end of each week", "Alerts management if projected cash balance drops below safety reserve."]
    ]
    story.append(make_grid_table(cf_metrics[0], cf_metrics[1:], col_widths=[110, 150, 255], styles=styles))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 19: FLEET LOGISTICS & VEHICLE MAINTENANCE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 19: Fleet Logistics & Vehicle Maintenance", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Krishna Engineering Works operates heavy trailers, flatbed trucks, pickup vans, and mobile Hydra cranes. "
        "The Fleet module tracks vehicle documentation, driver trip sheets, odometer logs, and fuel efficiency audits.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("19.1 Fleet Vehicle Master & Document Compliance", styles['Heading2_Custom']))
    fleet_docs = [
        ["Document / Compliance Item", "Renewal Frequency", "System Warning Threshold"],
        ["Vehicle Insurance (Commercial Comprehensive)", "Annual", "System alert 30 days and 7 days prior to expiry."],
        ["Fitness Certificate (FC - RTO Kerala)", "Annual / Bi-annual", "Prevents vehicle trip assignment if FC is expired."],
        ["Pollution Under Control (PUC)", "Every 6 Months", "Dashboard alert when vehicle PUC is within 14 days of expiry."],
        ["Road Tax & National Permit", "Quarterly / Annual", "Tracks state permit validity for inter-state deliveries to Tamil Nadu/Karnataka."]
    ]
    story.append(make_grid_table(fleet_docs[0], fleet_docs[1:], col_widths=[140, 115, 260], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("19.2 Trip Logging & Fuel Consumption Audit", styles['Heading2_Custom']))
    story.append(Paragraph(
        "Drivers or transport supervisors must log every trip in <b>Fleet → Trip Logs</b>: Start Odometer, End Odometer, "
        "Delivery Challan Number, Destination, Diesel Liters Filled, and Fuel Bill Amount. The system computes "
        "<b>KM per Liter (KMPL)</b>. If fuel economy drops below vehicle benchmark (e.g., < 3.5 KMPL for heavy trailers), an alert "
        "is flagged for engine maintenance or fuel pilferage investigation.",
        styles['Body_Custom']
    ))

    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 20: HEAVY MACHINERY & EQUIPMENT MAINTENANCE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 20: Heavy Machinery & Equipment Maintenance", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Plant capacity depends on critical machine uptime: 100T Hydraulic Press Brakes, Plate Rolling Machines, "
        "Overhead EOT Cranes (10T/25T), Submerged Arc Welding (SAW) Stations, and CNC Plasma Cutters.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("20.1 Maintenance Schedules & Run-Hour Tracking", styles['Heading2_Custom']))
    mach_table = [
        ["Machinery Type", "Tracking Metric", "Preventive Maintenance (PM) Checklist Tasks"],
        ["Hydraulic Press Brake & Shearing", "Operating Run-Hours", "Check hydraulic oil level, oil filter replacement, check blade clearance, inspect ram seals."],
        ["Overhead EOT Cranes (10T/25T)", "Monthly Calendar", "Wire rope visual inspection, limit switch test, brake shoe clearance, hoist gearbox grease."],
        ["CNC Plasma Cutting Machine", "Run-Hours & Arc Starts", "Clean linear guide rails, inspect torch nozzle/electrode wear, check air compressor moisture."],
        ["SAW & MIG Welding Units", "Weekly Calendar", "Wire feeder roller tension, torch cable insulation, gas solenoid valve leak check."]
    ]
    story.append(make_grid_table(mach_table[0], mach_table[1:], col_widths=[120, 110, 285], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("20.2 Breakdown Ticket Lifecycle", styles['Heading2_Custom']))
    story.append(Paragraph("1. Operator logs breakdown via mobile/terminal: selects Machine, symptom (e.g., 'Hydraulic pressure drop'), and severity.", styles['StepNumber']))
    story.append(Paragraph("2. Machine status automatically flips to <b>'Breakdown'</b> in JWO workstation scheduling.", styles['StepNumber']))
    story.append(Paragraph("3. Maintenance Engineer is dispatched, troubleshoots issue, replaces spares from WH-SPARES, and records repair notes.", styles['StepNumber']))
    story.append(Paragraph("4. Maintenance Lead tests machine, records downtime hours, and clicks <b>'Close Ticket & Restore Operation'</b>.", styles['StepNumber']))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 21: HRMS: STAFF MANAGEMENT & DIRECTORY
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 21: HRMS: Staff Management & Directory", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Human Resources module maintains complete records for all company personnel: permanent fabricators, "
        "certified welders, machine operators, crane drivers, site engineers, and administrative officers.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("21.1 Employee Master Record Attributes", styles['Heading2_Custom']))
    emp_fields = [
        ["Record Attribute", "Database Key", "Purpose & System Behavior"],
        ["Employee Code", "employeeCode", "Unique enterprise identifier: KEW-EMP-XXXX."],
        ["Designation / Trade", "designation", "Trade skill (e.g., 6G Welder, CNC Operator, Fitter, Helper, Accountant)."],
        ["Department", "department", "Allocated section: Fabrication Yard, Machine Shop, Quality, Accounts, Transport."],
        ["Shift Allocation", "assignedShift", "Morning Shift (09:00 AM) or Custom Maintenance Shift."],
        ["Base Monthly Salary", "baseSalary", "Contracted monthly wage (Strictly confidential — Admin only)."],
        ["Overtime Rate (Hourly)", "overtimeRate", "Calculated overtime multiplier applied to hours worked beyond shift end."],
        ["Identity / KYC Documents", "aadhaarNumber, kycFiles", "Aadhaar number, bank account details for salary NEFT, welder qualification certs."]
    ]
    story.append(make_grid_table(emp_fields[0], emp_fields[1:], col_widths=[110, 115, 290], styles=styles))

    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 22: ATTENDANCE TRACKING & SHIFT RULE ENGINE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 22: Attendance Tracking & Shift Rule Engine", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Attendance module enforces exact shopfloor discipline through dynamic shift timing, automated late arrival detection, "
        "and early departure tracking. All attendance records are displayed with the latest date first.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("22.1 Shift Rules & Late Arrival Computation", styles['Heading2_Custom']))
    story.append(Paragraph(
        "The enterprise operates a standardized <b>Morning Shift</b> starting at <b>09:00 AM</b> with a configurable <b>10-minute Grace Period</b>:",
        styles['Body_Custom']
    ))
    shift_rules = [
        ["Check-In Timestamp", "System Status Classification", "Calculated Late Minutes", "Payroll Impact"],
        ["08:45 AM - 09:00 AM", "PRESENT (On Time)", "0 Minutes", "Full day attendance credited."],
        ["09:01 AM - 09:10 AM", "PRESENT (Within Grace Period)", "0 Minutes", "Full day attendance credited."],
        ["09:11 AM", "PRESENT (Late Arrival)", "11 Minutes Late", "Late counter incremented; logged on monthly report."],
        ["09:25 AM", "PRESENT (Late Arrival)", "25 Minutes Late", "Exceeds grace; requires supervisor explanation."],
        ["After 11:00 AM", "HALF DAY / Late Arrival", "Exceeds threshold", "Marked as Half Day absent unless approved by Admin."]
    ]
    story.append(make_grid_table(shift_rules[0], shift_rules[1:], col_widths=[95, 130, 110, 180], styles=styles))
    story.append(Spacer(1, 10))

    story.append(Paragraph("22.2 Early Checkout Tracking & Sorting Rules", styles['Heading2_Custom']))
    story.append(Paragraph(
        "• <b>Shift End Time:</b> Configured at <b>05:00 PM</b> with a <b>10-minute allowance</b>.<br/>"
        "• <b>OUT between 04:50 PM and 05:00 PM:</b> Classed as 'Within Allowance' (Normal).<br/>"
        "• <b>OUT prior to 04:50 PM:</b> Classed as 'Early Checkout' with exact early minutes recorded.<br/>"
        "• <b>Status Recalculation:</b> Records with both IN and OUT timestamps automatically display <b>COMPLETED</b> with total duration. "
        "Records with IN but missing OUT display <b>IN PROGRESS</b>.<br/>"
        "• <b>Sorting Standard:</b> All staff attendance records, timesheets, and admin reports are strictly sorted with the <b>latest date first (descending)</b>.",
        styles['Body_Custom']
    ))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 23: PAYROLL, OVERTIME & SALARY SLIPS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 23: Payroll, Overtime & Salary Slips", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Payroll module computes monthly net salaries by aggregating base pay, calculated overtime hours, "
        "and deducting salary advances, unpaid leave, and statutory deductions.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("23.1 Salary Computation Formula", styles['Heading2_Custom']))
    story.append(Paragraph(
        "<b>Gross Earnings</b> = Base Salary + (Approved Overtime Hours x Overtime Hourly Rate) + Special Site Allowances.<br/>"
        "<b>Deductions</b> = Salary Advances Taken + Unpaid Absence Deductions + PF/ESI (if applicable).<br/>"
        "<b>Net Payable</b> = Gross Earnings - Total Deductions.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    pay_steps = [
        ["Step", "Action", "Description & Security Constraints"],
        ["1. Month Closure", "Lock Attendance Month", "HR verifies that all missing punch entries are rectified and overtime hours approved."],
        ["2. Salary Generation", "Run Monthly Payroll Batch", "System computes earnings, advances, and deductions for all active staff."],
        ["3. Management Audit", "Admin Approval", "Managing Director reviews total payroll payout; approves bank disbursement batch."],
        ["4. Payslip Generation", "Export PDF Payslips", "System generates confidential payslips (PAYSLIP-YYYY-MM-XXXX) with official company stamp."]
    ]
    story.append(make_grid_table(pay_steps[0], pay_steps[1:], col_widths=[75, 130, 310], styles=styles))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 24: CRM, LEADS & SALES PIPELINE
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 24: CRM, Leads & Sales Pipeline", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The CRM module manages prospective industrial inquiries, tender notices, and architectural consultancies "
        "from initial inquiry through technical bid submission to contract win.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    crm_stages = [
        ["Pipeline Stage", "Required Action & System Milestone", "Probability Weight"],
        ["New Inquiry", "Log lead source (Website, Walk-in, Tender, Client Referral), structural specifications.", "10%"],
        ["Site Survey / Drawing Review", "Conduct site survey or review client preliminary drawings; estimate tonnage.", "30%"],
        ["Quotation Submitted", "Issue formal quotation with technical specifications and payment terms.", "60%"],
        ["Commercial Negotiation", "Revise rates based on steel market fluctuations; finalize credit terms.", "80%"],
        ["Won / Contract Signed", "Click 'Convert to Project'; triggers initial advance invoice and engineering BOM.", "100% (Won)"],
        ["Lost / Archived", "Document reason for loss (Price, Delivery Timeline, Capacity) for executive analytics.", "0% (Lost)"]
    ]
    story.append(make_grid_table(crm_stages[0], crm_stages[1:], col_widths=[120, 310, 85], styles=styles))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 25: WARRANTY, SERVICE TICKETS & AFTER-SALES
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 25: Warranty, Service Tickets & After-Sales", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Krishna Engineering Works stands behind its fabricated structures and machinery. The After-Sales module tracks "
        "active structural warranties, customer complaint tickets, and scheduled maintenance visits.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    ticket_table = [
        ["Ticket Status", "Responsible Party", "Workflow Action & Response SLA"],
        ["Logged (Open)", "Customer / Service Helpdesk", "Customer reports issue (e.g., roof sheet gutter leak, crane alignment noise); SLA: 4 hrs."],
        ["Technician Assigned", "Service Head", "Field service engineer assigned; tools and spares requisitioned from WH-SPARES."],
        ["On-Site Inspection", "Service Engineer", "Technician conducts site inspection; logs findings and photographs in mobile app."],
        ["Rectified & Tested", "Service Engineer", "Defect repaired under warranty or billed if caused by client unauthorized alteration."],
        ["Closed & Signed-Off", "Customer Signatory", "Customer confirms satisfaction via digital signature on service sheet."]
    ]
    story.append(make_grid_table(ticket_table[0], ticket_table[1:], col_widths=[95, 125, 295], styles=styles))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 26: DIGITAL DOCUMENT VAULT & ENTERPRISE ASSETS
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 26: Digital Document Vault & Enterprise Assets", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Digital Document Vault is an enterprise cloud document repository governed by <b>DocumentHistory.js</b>. "
        "It provides tamper-proof, version-controlled storage for all engineering drawings, contracts, tax documents, and compliance certs.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    vault_categories = [
        ["Document Category", "Sub-Types Stored", "Retention Period & Access Controls"],
        ["Engineering Drawings", "CAD (.dwg), Vector PDF, Structural Calculation Sheets", "Permanent; accessible by Engineering, QC, and Client (approved only)."],
        ["Statutory & Tax Records", "GST Returns, Tax Invoices, Annual Financial Audits", "8 Years (Mandatory under Companies Act & GST Law); Admin only."],
        ["Vendor & Procurement Docs", "Vendor Invoices, Delivery Challans, Mill Test Certs (MTC)", "5 Years; accessible by Purchase, Accounts, and Storekeeper."],
        ["Quality & Handover Dossiers", "NDT Reports, Paint DFT Logs, KEC-CERT Completion Certificates", "Permanent; accessible by Quality Head, Management, and Client."]
    ]
    story.append(make_grid_table(vault_categories[0], vault_categories[1:], col_widths=[110, 175, 230], styles=styles))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 27: LODGE & STAFF RESIDENCY MANAGEMENT
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 27: Lodge & Staff Residency Management", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "To house company engineers, fabricators, and visiting client inspectors, Krishna Engineering Works operates "
        "on-premise residential lodges. The Lodge Management module automates room inventory, bed allocation, and monthly billing.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("27.1 Room Inventory & Tenancy Lifecycle", styles['Heading2_Custom']))
    lodge_steps = [
        ["Stage", "Operational Task", "System Record & Financial Treatment"],
        ["1. Room Setup", "Define Rooms & Beds", "Enter Room Number, Floor, Bed Capacity (Single, Double, Dormitory), Base Monthly Rent."],
        ["2. Check-In", "Allocate Resident", "Select Employee or External Guest, enter Check-In Date, security deposit, and KYC ID."],
        ["3. Monthly Billing", "Generate Rent & Utility Bill", "System bills room rent + split electricity meter units on 1st of each month."],
        ["4. Payment / Deduction", "Collect Rent / Salary Deduction", "Company staff rent is deducted from payroll; external residents pay via cash/UPI."],
        ["5. Check-Out", "Vacate & Settle Deposit", "Inspect room condition, record departure, compute refund of security deposit minus damage."]
    ]
    story.append(make_grid_table(lodge_steps[0], lodge_steps[1:], col_widths=[75, 140, 300], styles=styles))
    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 28: CUSTOMER SELF-SERVICE PORTAL
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 28: Customer Self-Service Portal", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "The Customer Portal empowers enterprise clients with 24/7 transparent visibility into their fabrication contracts, "
        "enabling faster drawing approvals, live milestone tracking, and seamless document downloads.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    client_features = [
        ["Portal Capability", "Client Action Allowed", "Security Isolation Boundary"],
        ["Live Project Timeline", "View current fabrication progress % and milestone completion.", "Client can ONLY view contracts tagged to their Customer ID."],
        ["Drawing Review & Sign-Off", "Review submitted PDF drawings; click 'Accept' or request revisions.", "Cannot view internal shopfloor notes or production cost sheets."],
        ["Invoices & Statements", "Download official Tax Invoices, credit receipts, and ledger statements.", "Strictly isolated to client's financial transactions."],
        ["Handover Certificate (KEC-CERT)", "Inspect final handover checklist; countersign completion certificate.", "Locked until all punch list items are liquidated by QC."],
        ["Support & Service Tickets", "Log after-sales service tickets or warranty inspection requests.", "Tickets are assigned directly to Krishna Engineering service queue."]
    ]
    story.append(make_grid_table(client_features[0], client_features[1:], col_widths=[120, 205, 190], styles=styles))

    story.append(PageBreak())

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 29: SYSTEM ADMINISTRATION, BACKUPS & AUDIT TRAIL
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 29: System Administration, Backups & Audit Trail", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "Maintaining system integrity, data durability, and regulatory audit readiness is governed by Super Admin protocols. "
        "This section documents routine maintenance, shift configuration, and disaster recovery procedures.",
        styles['Body_Custom']
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("29.1 Admin Shift Configuration Controls", styles['Heading2_Custom']))
    story.append(Paragraph(
        "Under <b>Admin Panel → Shift Management</b>, the Super Admin can configure operational attendance parameters:",
        styles['Body_Custom']
    ))
    story.append(Paragraph("• <b>Morning Shift Start Time:</b> Default 09:00 AM (24h format: 09:00).", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Grace Period:</b> Default 10 minutes. Check-ins up to 09:10 AM marked on-time.", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Shift End Time:</b> Default 05:00 PM (17:00).", styles['Bullet_Custom']))
    story.append(Paragraph("• <b>Early Checkout Allowance:</b> Default 10 minutes. Checkouts after 04:50 PM marked normal.", styles['Bullet_Custom']))
    story.append(Spacer(1, 6))

    story.append(Paragraph("29.2 Automated Database Backup Protocols", styles['Heading2_Custom']))
    story.append(Paragraph(
        "Database backups must be executed daily and archived offsite to prevent data loss in the event of hardware failure.",
        styles['Body_Custom']
    ))
    backup_cmds = [
        ["Backup Type", "Execution Command / Procedure", "Storage Destination & Retention"],
        ["Daily Hot Dump", "mongodump --uri=\"<MONGO_URI>\" --out=/backups/$(date +%F)", "Local backup partition (/backups/); retained 14 days."],
        ["Weekly Compressed Archive", "tar -czf /backups/kew_backup_$(date +%F).tar.gz /backups/$(date +%F)", "Encrypted and mirrored to secure AWS S3 bucket; retained 12 weeks."],
        ["Emergency Restore", "mongorestore --uri=\"<MONGO_URI>\" --drop /backups/<SNAPSHOT_DIR>", "Restores full database snapshot; requires server downtime window."]
    ]
    story.append(make_grid_table(backup_cmds[0], backup_cmds[1:], col_widths=[110, 215, 190], styles=styles))

    story.append(Spacer(1, 16))

    # ─────────────────────────────────────────────────────────────────────────
    # CHAPTER 30: TROUBLESHOOTING GUIDE & INDUSTRIAL GLOSSARY
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("Chapter 30: Troubleshooting Guide & Industrial Glossary", styles['Heading1_Custom']))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph("30.1 Operational Troubleshooting Matrix", styles['Heading2_Custom']))
    trouble_rows = [
        ["Observed Symptom", "Root Cause Analysis", "Step-by-Step Resolution"],
        ["'Access Forbidden (403)' when viewing financial tab", "User logged in with 'staff' role attempting to access commercial data.", "Financial views are restricted to 'admin'. If managerial access is required, Admin must update role."],
        ["Attendance displays 'IN PROGRESS' despite employee leaving", "Employee forgot to punch OUT or device connectivity dropped during checkout.", "Admin opens Shift Management → Correct Attendance, enters actual OUT time; status recalculates to COMPLETED."],
        ["Cannot issue Job Work Order ('Drawing Approval Blocked')", "Attached engineering drawing is in 'pending' or 'rejected' status.", "Open Drawings module; Admin/Manager must inspect revision and click 'Approve Revision'."],
        ["PDF generation fails with 'Corrupted Font / Buffer Error'", "Missing company logo image or invalid special character in client address.", "Ensure frontend/public/logo.png exists; check client name for illegal non-ASCII symbols."],
        ["Inventory shows negative balance after shopfloor issue", "Material was issued physically before inward GRN was entered into system.", "Storekeeper must enter pending GRN immediately to re-align theoretical and physical stock."]
    ]
    story.append(make_grid_table(trouble_rows[0], trouble_rows[1:], col_widths=[120, 150, 245], styles=styles))
    story.append(Spacer(1, 14))

    story.append(Paragraph("30.2 Industrial Engineering & ERP Glossary", styles['Heading2_Custom']))
    glossary = [
        ["Term", "Full Industrial Title", "Standard Operational Definition"],
        ["BOM", "Bill of Materials", "A comprehensive list of raw materials, assemblies, and quantities required to manufacture a finished item."],
        ["CNC", "Computer Numerical Control", "Automated cutting or milling equipment governed by pre-programmed computer software sequences."],
        ["DFT", "Dry Film Thickness", "The measured depth of a cured paint or protective coating layer on steel surfaces, expressed in microns (µm)."],
        ["DPT", "Dye Penetrant Testing", "A non-destructive testing method applied to inspect surface-breaking flaws in structural welds."],
        ["ECN", "Engineering Change Notice", "An official document detailing authorized modifications to an engineering drawing or fabrication plan."],
        ["GRN", "Goods Receipt Note", "A verified document acknowledging receipt of goods at the warehouse, confirming quantity and quality."],
        ["HSN", "Harmonized System of Nomenclature", "An internationally standardized 8-digit system of names and numbers to classify traded products for GST."],
        ["IRN", "Inspection Release Note", "Official quality assurance certificate permitting structural components to be packed and dispatched."],
        ["JWO", "Job Work Order", "Internal shopfloor production order specifying operations, workstations, and output member requirements."],
        ["KEC-CERT", "Krishna Engineering Certificate", "Official completion and warranty certificate issued upon joint client sign-off of project handover."],
        ["MTC", "Mill Test Certificate", "Manufacturer-issued quality cert verifying the chemical composition and mechanical strength of steel."],
        ["NDT", "Non-Destructive Testing", "Inspection techniques (DPT, Ultrasonic, Radiographic) evaluating material integrity without damaging it."],
        ["PO", "Purchase Order", "A legally binding commercial document issued by a buyer committing to purchase goods from a seller."],
        ["RBAC", "Role-Based Access Control", "Security mechanism restricting system access based on an employee's authorized organizational role."],
        ["SAW", "Submerged Arc Welding", "A high-efficiency welding method where the electric arc is submerged under a blanket of granular flux."]
    ]
    story.append(make_grid_table(glossary[0], glossary[1:], col_widths=[60, 135, 320], styles=styles))

    # Build PDF
    canvas_maker = lambda *args, **kwargs: NumberedCanvas(*args, **kwargs)
    doc.build(story, canvasmaker=canvas_maker)
    print(f"Successfully generated: {pdf_path}")


if __name__ == "__main__":
    build_manual()
