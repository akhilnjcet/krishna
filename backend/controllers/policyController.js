const Policy = require('../models/Policy');
const PolicyAcceptance = require('../models/PolicyAcceptance');
const PrivacyRequest = require('../models/PrivacyRequest');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');

// Default initial policies
const DEFAULT_PRIVACY_CONTENT = `1. INTRODUCTION
Krishna Engineering Works ("the Company", "we", "us", or "our") operates the Krishna ERP Platform and mobile application. This Privacy Policy informs users of our policies regarding the collection, use, disclosure, and protection of personal data.

2. INFORMATION WE COLLECT
To provide efficient industrial fabrication, project tracking, billing, and workforce management, we collect:
• Account & Identity Information: Legal full name, email address, phone/WhatsApp number, job role, and company name.
• Biometric Descriptors (Staff Only): Face descriptors (mathematical vectors) used strictly for automated on-site attendance. We do not store raw facial images for verification.
• Operational & Location Data: Timestamped geolocations captured during field site reports and punch-ins.
• Financial Information: GSTIN numbers, bank details for salary disbursement, and transaction UTR/reference numbers.
• Telemetry & Device Diagnostics: Device architecture, browser types, and application performance data to optimize ERP accessibility.

3. PURPOSE & LEGAL BASIS FOR PROCESSING
We use collected personal data to:
• Administer client and staff ERP accounts.
• Calculate labor wages, generate invoices, estimates, and tax compliance records.
• Maintain security, prevent unauthorized access, and ensure verifiable audit logging.
• Dispatch project status milestones, invoice notifications, and WhatsApp security relays.

4. DATA SHARING & THIRD PARTIES
We do not sell, rent, or trade your personal information. Data is shared exclusively with:
• Authorized payment gateways and UPI rails for verified payments.
• Cloud database infrastructure (MongoDB Atlas) protected by TLS encryption.
• Government regulatory authorities when strictly required by applicable Indian laws.

5. DATA RETENTION & SECURITY SAFEGUARDS
• Active user accounts are retained throughout the business relationship.
• Inactive accounts or deletion requests are processed in compliance with statutory financial retention laws (financial bills and tax invoices are retained for mandatory audit cycles).
• Data is protected with bcrypt hashing, JWT token authentication, and role-based privilege isolation.

6. DATA SUBJECT RIGHTS
Under applicable privacy laws, you possess the right to:
• Request a complete copy of your personal data held in Krishna ERP.
• Request correction of inaccurate or outdated information.
• Request deletion or anonymization of your account (subject to legal retention obligations).
• Submit privacy inquiries directly via our Account Privacy portal or by contacting akhilnadiluveettil@gmail.com.

7. CONTACT INFORMATION
Data Controller: Krishna Engineering Works
Address: Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514
Contact Phone: +91 9447940835
Official Email: akhilnadiluveettil@gmail.com`;

const DEFAULT_TERMS_CONTENT = `1. ACCEPTANCE OF TERMS
By accessing, registering for, or utilizing the Krishna Engineering Works ERP Platform ("Krishna ERP", "the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the Platform.

2. ELIGIBILITY & ACCOUNT SECURITY
• Users must provide accurate, current, and complete registration details.
• You are responsible for safeguarding your credentials, OTP secrets, and access tokens.
• Any unauthorized account activity must be reported to the System Administrator immediately.

3. PERMITTED ENTERPRISE USE
Krishna ERP is provided for industrial operations, fabrication project management, attendance logging, quotation generation, and client collaboration. You agree not to:
• Interfere with, tamper with, or compromise the system architecture or API signals.
• Reverse-engineer, decompile, or extract proprietary ERP algorithms or UI workflows.
• Transmit malicious payloads, viruses, or spam through the messaging relays.

4. INTELLECTUAL PROPERTY RIGHTS
All software architecture, databases, UI components, documentation, trademarks, and logos associated with Krishna ERP remain the exclusive intellectual property of Krishna Engineering Works and Zingronix IT Solutions.

5. FINANCIAL TRANSACTIONS & QUOTATIONS
• Estimates and quotations generated through Krishna ERP are valid for the timeframe specified on the official quotation sheet.
• Invoices issued reflect delivered steel works, raw material costs, and labor charges agreed upon in formal contracts.
• Statutory taxes (GST) are levied in compliance with Central and State GST legislation.

6. TERMINATION & SUSPENSION
Krishna Engineering Works reserves the right to suspend or terminate accounts that violate operational protocols, commit fraud, or fail to adhere to security directives.

7. LIMITATION OF LIABILITY
In no event shall Krishna Engineering Works, its directors, or engineers be held liable for indirect, incidental, or consequential damages resulting from hardware downtime, network provider disruptions, or third-party cloud failures.

8. GOVERNING LAW & JURISDICTION
These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in Palakkad District, Kerala.

9. MODIFICATIONS TO TERMS
We reserve the right to revise these Terms of Service. Registered users will be notified of material changes, and continued usage signifies acceptance of the updated terms.`;

const DEFAULT_REFUND_CONTENT = `CANCELLATION & REFUND POLICY

1. ORDER CANCELLATION
At Krishna Engineering Works, we understand that project requirements may occasionally change. Because our heavy engineering, structural fabrication, industrial roofing, and truss assemblies are custom manufactured to client architectural specifications, the following cancellation guidelines apply:
• Standard/Catalog Quotations: Cancellation requests received within 24 hours of advance remittance and prior to raw material procurement or fabrication kickoff will receive a 100% refund of the deposit.
• Custom Structural Fabrication & Job Work: Once raw steel materials (ISMB beams, plates, purlins, sheets) have been procured, profiled, or cut to custom project dimensions, cancellation will incur a deduction reflecting direct material and labor expenses incurred up to the timestamp of written cancellation notice.
• Service & Site Erection Works: On-site labor and crane/erection services may be cancelled or rescheduled with a minimum 48-hour prior notice without penalty.

2. REFUND PROCESSING & TIMELINE
• Mode of Refund: All approved refunds are credited back to the customer's original payment method (Credit/Debit Card, Netbanking, UPI, or Bank Transfer) or via direct NEFT/RTGS to the client's verified commercial bank account.
• Turnaround Time: Once an official refund or cancellation request is verified and authorized by our management, the refund is initiated within 2 business days and typically reflects in the customer's bank account within 5 to 7 working days, subject to the issuing bank's clearing cycle.

3. DISPUTES & GRIEVANCE REDRESSAL
If you observe an unexpected charge or have an inquiry regarding a billing transaction:
• Email: akhilnadiluveettil@gmail.com / contact@krishnaengg.com
• Phone: +91 9447940835
• Address: Krishna Engineering Works, Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514
All refund inquiries are formally acknowledged within 24 hours.`;

const DEFAULT_SHIPPING_CONTENT = `SHIPPING & SERVICE DELIVERY POLICY

1. SCOPE OF DELIVERY
Krishna Engineering Works provides heavy structural steel fabrication, metal roofing sheets, custom engineered trusses, industrial gates, railings, and on-site erection services across Kerala and neighboring regions.

2. DELIVERY MODES & TIMELINES
• Fabricated Structural Steel & Roofing Materials: Dispatched directly to the client's designated construction site or commercial facility using heavy commercial vehicles (trailers/trucks).
• Standard Timeline: Custom engineering and fabrication deliverables are dispatched within 7 to 21 business days from order confirmation, structural drawing approval, and advance payment, unless a staggered project milestone delivery schedule is agreed in the contract.
• On-Site Assembly & Erection: Structural erection teams mobilize to the client location according to the site readiness and approved milestone schedule.

3. INSPECTION & SIGN-OFF
• Upon material arrival at the delivery site, the customer or authorized site engineer will inspect the goods against the official Delivery Challan / GST Tax Invoice.
• Immediate discrepancies or transit damage must be endorsed on the physical delivery challan and notified within 24 hours via phone (+91 9447940835) or email (contact@krishnaengg.com).

4. SHIPPING CHARGES
Shipping, transit freight, and crane loading/unloading charges are transparently itemized in the formal Quotation and Invoice sheets generated through Krishna ERP.`;

const DEFAULT_CONTACT_CONTENT = `CONTACT US & CORPORATE DETAILS

1. REGISTERED BUSINESS ENTITY
Legal Business Name: Krishna Engineering Works
Proprietorship / Registered Industrial Unit
Industry: Heavy Structural Engineering, Steel Fabrication & Industrial Roofing

2. OPERATIONAL & REGISTERED ADDRESS
Krishna Engineering Works
Thiruvazhiyode, Sreekrishnapuram,
Palakkad District, Kerala - 679514, India.

3. CONTACT TELEPHONE & HELPLINE
• Customer Support & Enquiries: +91 9447940835 / +91 98765 43210
• WhatsApp Helpline: +91 9447940835

4. ELECTRONIC MAIL ADDRESSES
• General & Corporate Communications: contact@krishnaengg.com
• Management & Grievance Officer: akhilnadiluveettil@gmail.com
• Billing & Remittance Queries: billing@krishnaengg.com

5. BUSINESS OPERATING HOURS
• Monday through Saturday: 08:30 AM to 06:30 PM (IST)
• Sunday: Closed (Emergency on-site breakdown support via phone)`;

// Seed initial default policies if none exist
const ensureInitialPolicies = async () => {
    try {
        const seedPolicy = async (type, title, content, summary) => {
            const count = await Policy.countDocuments({ policyType: type });
            if (count === 0) {
                await Policy.create({
                    policyType: type,
                    version: '1.0',
                    title,
                    content,
                    summary,
                    effectiveDate: new Date('2026-04-01'),
                    lastUpdated: new Date('2026-04-01'),
                    publishedByName: 'System Master Admin',
                    status: 'published',
                    isCurrent: true
                });
            }
        };

        await seedPolicy('privacy', 'Krishna ERP Privacy Policy', DEFAULT_PRIVACY_CONTENT, 'Initial baseline Privacy Policy establishing biometric safeguards, data usage, and user rights.');
        await seedPolicy('terms', 'Krishna ERP Terms of Service', DEFAULT_TERMS_CONTENT, 'Initial baseline Terms of Service establishing enterprise usage rules, liability, and governance.');
        await seedPolicy('refund', 'Krishna Engineering Works Cancellation & Refund Policy', DEFAULT_REFUND_CONTENT, 'Standard cancellation and refund guidelines with 5-7 business day turnaround for merchant compliance.');
        await seedPolicy('shipping', 'Krishna Engineering Works Shipping & Delivery Policy', DEFAULT_SHIPPING_CONTENT, 'Commercial delivery, transit guidelines, and on-site assembly milestones for fabrication.');
        await seedPolicy('contact', 'Krishna Engineering Works Corporate Contact & Grievance Directives', DEFAULT_CONTACT_CONTENT, 'Official contact channels, registered physical address, and grievance redressal officer details.');
    } catch (err) {
        console.error('Error ensuring initial policies:', err.message);
    }
};

ensureInitialPolicies();

// ─── Public Policy Endpoints ─────────────────────────────────────

// GET /api/policies/current/:type
exports.getCurrentPolicy = async (req, res) => {
    try {
        const { type } = req.params;
        if (!['privacy', 'terms', 'refund', 'shipping', 'contact'].includes(type)) {
            return res.status(400).json({ message: 'Invalid policy type. Must be privacy, terms, refund, shipping, or contact.' });
        }

        let policy = await Policy.findOne({ policyType: type, isCurrent: true, status: 'published' });
        
        // Fallback to latest published if isCurrent flag is missing
        if (!policy) {
            policy = await Policy.findOne({ policyType: type, status: 'published' }).sort({ publishedAt: -1 });
        }

        if (!policy) {
            // Generate in-memory fallback
            return res.json({
                policyType: type,
                version: '1.0',
                title: type === 'privacy' ? 'Krishna ERP Privacy Policy' : 'Krishna ERP Terms of Service',
                content: type === 'privacy' ? DEFAULT_PRIVACY_CONTENT : DEFAULT_TERMS_CONTENT,
                effectiveDate: new Date('2026-04-01'),
                lastUpdated: new Date('2026-04-01'),
                isCurrent: true
            });
        }

        res.json(policy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/policies/public-summary & /api/policies/summary
exports.getPublicPolicySummary = async (req, res) => {
    try {
        const [privacy, terms, refund, shipping, contact, settingsDocs] = await Promise.all([
            Policy.findOne({ policyType: 'privacy', isCurrent: true }).select('version title effectiveDate lastUpdated status publishedByName summary content'),
            Policy.findOne({ policyType: 'terms', isCurrent: true }).select('version title effectiveDate lastUpdated status publishedByName summary content'),
            Policy.findOne({ policyType: 'refund', isCurrent: true }).select('version title effectiveDate lastUpdated status publishedByName summary content'),
            Policy.findOne({ policyType: 'shipping', isCurrent: true }).select('version title effectiveDate lastUpdated status publishedByName summary content'),
            Policy.findOne({ policyType: 'contact', isCurrent: true }).select('version title effectiveDate lastUpdated status publishedByName summary content'),
            SystemSetting.find({ key: { $in: ['company_name', 'footer_phone', 'footer_email', 'footer_address', 'floating_whatsapp', 'ownerEmail', 'company_phone', 'company_email', 'company_address'] } })
        ]);

        const settingsMap = {};
        if (Array.isArray(settingsDocs)) {
            settingsDocs.forEach(s => { settingsMap[s.key] = s.value; });
        }

        const dpoContact = {
            name: 'AKHIL N',
            organization: settingsMap.company_name || 'Krishna Engineering Works',
            address: settingsMap.footer_address || settingsMap.company_address || 'Thiruvazhiyode, Sreekrishnapuram, Kerala 679514',
            phone: settingsMap.footer_phone || settingsMap.company_phone || '+91 9447940835',
            email: settingsMap.footer_email || settingsMap.company_email || 'akhilnadiluveettil@gmail.com',
            whatsapp: settingsMap.floating_whatsapp || '919447940835'
        };

        const resultData = {
            privacy: privacy || { version: '1.0', title: 'Privacy Policy', effectiveDate: '2026-04-01', lastUpdated: '2026-04-01' },
            terms: terms || { version: '1.0', title: 'Terms of Service', effectiveDate: '2026-04-01', lastUpdated: '2026-04-01' },
            refund: refund || { version: '1.0', title: 'Cancellation & Refund Policy', effectiveDate: '2026-04-01', lastUpdated: '2026-04-01' },
            shipping: shipping || { version: '1.0', title: 'Shipping & Delivery Policy', effectiveDate: '2026-04-01', lastUpdated: '2026-04-01' },
            contact: contact || { version: '1.0', title: 'Contact Us & Corporate Details', effectiveDate: '2026-04-01', lastUpdated: '2026-04-01' },
            dpoContact,
            contacts: dpoContact
        };

        res.json({
            success: true,
            data: resultData,
            ...resultData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/policies/version/:type/:version (View specific historical version)
exports.getPolicyByVersion = async (req, res) => {
    try {
        const { type, version } = req.params;
        const policy = await Policy.findOne({ policyType: type, version });
        if (!policy) {
            return res.status(404).json({ message: `Policy version ${version} not found.` });
        }
        res.json(policy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── User Consent Endpoints ──────────────────────────────────────

// POST /api/policies/accept
exports.recordAcceptance = async (req, res) => {
    try {
        const { policyType, policyVersion } = req.body;
        const userId = req.user.id || req.user._id;

        if (!policyType || !policyVersion) {
            return res.status(400).json({ message: 'policyType and policyVersion are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const now = new Date();
        const acceptance = await PolicyAcceptance.create({
            userId: user._id,
            userEmail: user.email,
            userName: user.name || user.username,
            policyType,
            policyVersion: policyVersion.trim(),
            acceptedAt: now,
            ipAddress: req.ip || '',
            userAgent: req.get('User-Agent') || ''
        });

        // Update user record
        user.policyAcceptedAt = now;
        user.policyVersionAccepted = policyVersion.trim();
        user.termsAccepted = true;
        user.privacyAcknowledged = true;
        await user.save();

        res.status(201).json({
            message: 'Policy acceptance recorded successfully.',
            acceptance
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/policies/my-acceptance
exports.getMyAcceptanceHistory = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const history = await PolicyAcceptance.find({ userId }).sort({ acceptedAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Admin Policy Management Endpoints ───────────────────────────

// GET /api/policies/admin/all
exports.adminGetAllPolicies = async (req, res) => {
    try {
        const policies = await Policy.find().sort({ policyType: 1, createdAt: -1 });
        res.json(policies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/policies/admin/publish
exports.adminPublishPolicy = async (req, res) => {
    try {
        const { policyType, version, title, content, summary, effectiveDate } = req.body;
        const adminId = req.user.id || req.user._id;

        if (!policyType || !version || !title || !content) {
            return res.status(400).json({ message: 'policyType, version, title, and content are required.' });
        }

        // Validate version uniqueness for this policy type
        const existingVersion = await Policy.findOne({ policyType, version: version.trim() });
        if (existingVersion) {
            return res.status(400).json({ 
                message: `Version ${version} for ${policyType} already exists. Please assign a new revision version (e.g. 1.1, 2.0).` 
            });
        }

        const adminUser = await User.findById(adminId);
        const publisherName = adminUser?.name || 'Administrator';

        // Archive previous current version
        await Policy.updateMany(
            { policyType, isCurrent: true },
            { $set: { isCurrent: false, status: 'archived' } }
        );

        const newPolicy = await Policy.create({
            policyType,
            version: version.trim(),
            title: title.trim(),
            content: content.trim(),
            summary: summary ? summary.trim() : `Published by ${publisherName}`,
            effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
            lastUpdated: new Date(),
            publishedBy: adminId,
            publishedByName: publisherName,
            publishedAt: new Date(),
            status: 'published',
            isCurrent: true
        });

        res.status(201).json({
            message: `New ${policyType} policy version ${version} published successfully.`,
            policy: newPolicy
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/policies/admin/acceptances
exports.adminGetAcceptanceRecords = async (req, res) => {
    try {
        const { policyType, version, page = 1, limit = 50 } = req.query;
        const query = {};
        if (policyType) query.policyType = policyType;
        if (version) query.policyVersion = version;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [records, total] = await Promise.all([
            PolicyAcceptance.find(query)
                .sort({ acceptedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            PolicyAcceptance.countDocuments(query)
        ]);

        // Get total users and count of users on the current version
        const currentPolicies = await Policy.find({ isCurrent: true });
        const currentTermsVer = currentPolicies.find(p => p.policyType === 'terms')?.version || '1.0';
        
        const totalUsers = await User.countDocuments();
        const usersOnCurrentVer = await User.countDocuments({
            policyVersionAccepted: currentTermsVer,
            termsAccepted: true
        });
        const usersPendingUpdate = Math.max(0, totalUsers - usersOnCurrentVer);

        res.json({
            records,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            statistics: {
                totalUsers,
                usersOnCurrentVer,
                usersPendingUpdate,
                currentTermsVersion: currentTermsVer
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Privacy & Data Requests Endpoints ───────────────────────────

// POST /api/policies/privacy-requests (User submits request)
exports.submitPrivacyRequest = async (req, res) => {
    try {
        const { requestType, description } = req.body;
        const userId = req.user.id || req.user._id;

        if (!['data_access', 'data_correction', 'account_deletion'].includes(requestType)) {
            return res.status(400).json({ message: 'Invalid request type. Must be data_access, data_correction, or account_deletion.' });
        }

        if (!description || description.trim().length < 5) {
            return res.status(400).json({ message: 'Please provide a clear description of your request (min 5 characters).' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent spamming multiple pending requests of the same type
        const existingPending = await PrivacyRequest.findOne({
            userId,
            requestType,
            status: { $in: ['Submitted', 'Under Review'] }
        });

        if (existingPending) {
            return res.status(400).json({ 
                message: `You already have an active ${requestType.replace('_', ' ')} request under review.` 
            });
        }

        const request = await PrivacyRequest.create({
            userId,
            userEmail: user.email,
            userName: user.name || user.username,
            requestType,
            description: description.trim(),
            status: 'Submitted',
            submittedAt: new Date()
        });

        if (requestType === 'account_deletion') {
            user.deletionStatus = 'pending';
            user.deletionRequestedAt = new Date();
            await user.save();
        }

        res.status(201).json({
            message: 'Privacy request submitted successfully. Our data compliance administrator will review it.',
            request
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/policies/privacy-requests/my (User views own requests)
exports.getMyPrivacyRequests = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const requests = await PrivacyRequest.find({ userId }).sort({ submittedAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/policies/privacy-requests/my-data (User exports personal data copy)
exports.exportMyPersonalData = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId).select('-password -resetOTP -otpExpiry');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const [acceptances, privacyRequests] = await Promise.all([
            PolicyAcceptance.find({ userId }).select('policyType policyVersion acceptedAt'),
            PrivacyRequest.find({ userId }).select('requestType status submittedAt resolutionNote completedAt')
        ]);

        const exportPayload = {
            exportMetadata: {
                system: 'Krishna Engineering Works ERP',
                exportTimestamp: new Date().toISOString(),
                formatVersion: '1.0',
                notice: 'This is an official data portability record for your personal account.'
            },
            profile: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                phone: user.phone || user.phoneNumber,
                role: user.role,
                department: user.department,
                designation: user.designation,
                joiningDate: user.joiningDate,
                accountCreated: user.createdAt,
                lastLogin: user.last_login
            },
            policyConsentHistory: acceptances,
            privacyRequestsHistory: privacyRequests
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="krishna_erp_personal_data_${user._id}.json"`);
        res.json(exportPayload);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/policies/admin/privacy-requests (Admin views all privacy requests)
exports.adminGetPrivacyRequests = async (req, res) => {
    try {
        const { status, requestType } = req.query;
        const query = {};
        if (status) query.status = status;
        if (requestType) query.requestType = requestType;

        const requests = await PrivacyRequest.find(query).sort({ submittedAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/policies/admin/privacy-requests/:id (Admin reviews, approves, rejects, completes request)
exports.adminProcessPrivacyRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolutionNote } = req.body;
        const adminId = req.user.id || req.user._id;

        if (!['Under Review', 'Approved', 'Rejected', 'Completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status update.' });
        }

        const request = await PrivacyRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Privacy request not found.' });
        }

        const adminUser = await User.findById(adminId);
        request.status = status;
        request.resolutionNote = resolutionNote || request.resolutionNote;
        request.reviewedBy = adminId;
        request.reviewedByName = adminUser?.name || 'Administrator';
        request.reviewedAt = new Date();

        if (status === 'Completed') {
            request.completedAt = new Date();

            // If account deletion request was approved and completed:
            if (request.requestType === 'account_deletion') {
                const targetUser = await User.findById(request.userId);
                if (targetUser && targetUser.role !== 'admin') {
                    // Safe Anonymization & Deletion Procedure:
                    // Preserve shared accounting / invoices / tax audit records intact.
                    // Anonymize personal identifying information on user model.
                    targetUser.name = `[Deleted Account ${targetUser._id.toString().slice(-4)}]`;
                    targetUser.phone = '';
                    targetUser.phoneNumber = '';
                    targetUser.address = '';
                    targetUser.emergencyContact = '';
                    targetUser.faceDescriptor = [];
                    targetUser.profilePhoto = '';
                    targetUser.status = 'inactive';
                    targetUser.deletionStatus = 'anonymized';
                    await targetUser.save();
                }
            }
        } else if (status === 'Rejected') {
            if (request.requestType === 'account_deletion') {
                const targetUser = await User.findById(request.userId);
                if (targetUser) {
                    targetUser.deletionStatus = 'none';
                    await targetUser.save();
                }
            }
        }

        await request.save();

        res.json({
            message: `Privacy request marked as ${status}.`,
            request
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
