const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendWelcomeEmail = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Krishna Engineering Works',
            text: `Hello ${name || 'User'},

Welcome to Krishna Engineering Works.
Your account has been successfully created.

We are happy to have you with us!
– Team Krishna Engineering Works`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
};

const sendPasswordResetOTP = async (email, otp) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}

Valid for 5 minutes. Do not share this OTP.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reset OTP email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending reset OTP email:', error);
        return false;
    }
};

const sendLoginNotification = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Login Alert: Krishna Engineering Portal',
            text: `Hello ${name},

Your account was just logged into on the Krishna Engineering Works Portal.

If this was you, you can safely ignore this message.
If you do not recognize this activity, please contact support immediately.`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending login notification:', error);
        return false;
    }
};

const sendSignoutNotification = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Sign-out Notification',
            text: `Hello ${name},

You have been successfully signed out of your session at Krishna Engineering Works.

Thank you for using our digital portal!`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending signout notification:', error);
        return false;
    }
};

const sendPasswordChangeConfirmation = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Security Alert: Password Changed',
            text: `Hello ${name},

This is an automated confirmation that your password for the Krishna Engineering Works portal has been successfully changed.

If you did not perform this action, please reset your password immediately or contact our administrators.`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending password change confirmation:', error);
        return false;
    }
};

const sendStatusUpdateEmail = async (email, name, itemType, status) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Update: Your ${itemType} has been ${status}`,
            text: `Hello ${name},

Your ${itemType} request has been reviewed.

Current Status: ${status.toUpperCase()}

You can log in to your dashboard to view more details.`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending status update email:', error);
        return false;
    }
};

const sendLoginOTP = async (email, otp) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Login Verification OTP - Krishna Engineering Portal',
            text: `Your login OTP code is: ${otp}

Valid for 5 minutes. Please enter this code on the login portal to verify your access. Do not share this OTP with anyone.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Login OTP email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending login OTP email:', error);
        return false;
    }
};

const sendMasterResetOTP = async (email, otp, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🚨 CRITICAL: Master Reset Authorization OTP - Krishna ERP',
            text: `Hello ${name || 'System Administrator'},

A request has been initiated to perform a MASTER RESET / FRESH START on Krishna ERP.
This action will permanently purge all test and operational business data.

Your Master Reset Authorization OTP is: ${otp}

Security Directives:
• This code is valid for 5 minutes only.
• It is strictly single-use and bound to this pending reset request.
• If you DID NOT initiate this request, take immediate action to secure your account.

– Krishna ERP Security & Governance Desk`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Master reset authorization email successfully dispatched: ' + (info.messageId || 'Delivered'));
        return true;
    } catch (error) {
        console.error('Error dispatching master reset OTP email:', error.message);
        return false;
    }
};

const sendEmailVerificationOTP = async (email, otp, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Email Verification Code - Krishna Engineering Portal',
            text: `Hello ${name || 'User'},

Your email verification code is: ${otp}

This code is valid for 15 minutes. Please enter this code to verify your email address.
If you did not request this verification, please disregard this email.

– Krishna Engineering Works Security Desk`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email verification OTP dispatched: ' + (info.messageId || 'Delivered'));
        return true;
    } catch (error) {
        console.error('Error sending email verification OTP:', error.message);
        return false;
    }
};

const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * 1. Project Assignment Email to Client
 */
const sendProjectAssignmentEmail = async ({
    clientEmail,
    clientName,
    project,
    assignedStaffNames = [],
    portalUrl
}) => {
    try {
        if (!clientEmail) {
            console.warn('sendProjectAssignmentEmail: No client email provided.');
            return { success: false, error: 'Client email is required' };
        }

        const transporter = createTransporter();
        const appUrl = portalUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
        const projectPortalLink = `${appUrl.replace(/\/$/, '')}/customer/projects`;

        const projectIdShort = project._id ? project._id.toString().slice(-8).toUpperCase() : 'N/A';
        const formattedDeadline = project.deadline 
            ? new Date(project.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Scheduled via Operations';
        const formattedBudget = project.budget && Number(project.budget) > 0
            ? `₹ ${Number(project.budget).toLocaleString('en-IN')}`
            : 'As per approved quotation / TBD';
        const staffListText = assignedStaffNames.length > 0 
            ? assignedStaffNames.join(', ')
            : 'Lead Engineering Desk';
        const statusText = (project.status || 'In Progress').toUpperCase();

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Project Has Been Assigned</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <!-- Brand Header -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 32px 28px; text-align: left; border-bottom: 4px solid #f59e0b;">
                            <div style="color: #f59e0b; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;">
                                Krishna Engineering Works
                            </div>
                            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; line-height: 1.2; letter-spacing: -0.5px;">
                                Project Assignment Notice
                            </h1>
                            <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">
                                Industrial Structural Engineering & Fabrication Operations
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 28px;">
                            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                                Dear <strong>${escapeHtml(clientName || 'Valued Client')}</strong>,
                            </p>
                            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                                We are pleased to inform you that your engineering project has been officially commissioned in our operational registry and assigned to our dedicated project engineering team.
                            </p>

                            <!-- Key Project Summary Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 18px 20px; border-bottom: 1px solid #e2e8f0;">
                                        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Project Title</div>
                                        <div style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 2px;">${escapeHtml(project.title)}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 14px 20px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="50%" style="vertical-align: top; padding-bottom: 12px;">
                                                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Project Reference ID</div>
                                                    <div style="font-size: 13px; font-weight: 700; color: #4f46e5; margin-top: 2px;">#${projectIdShort}</div>
                                                </td>
                                                <td width="50%" style="vertical-align: top; padding-bottom: 12px;">
                                                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Current Status</div>
                                                    <div style="font-size: 12px; font-weight: 800; color: #065f46; background-color: #d1fae5; display: inline-block; padding: 2px 8px; border-radius: 4px; margin-top: 2px;">${statusText}</div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td width="50%" style="vertical-align: top; padding-bottom: 12px;">
                                                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Service Category</div>
                                                    <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px;">${escapeHtml(project.serviceType || 'Fabrication')}</div>
                                                </td>
                                                <td width="50%" style="vertical-align: top; padding-bottom: 12px;">
                                                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Assigned Staff / Engineer</div>
                                                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(staffListText)}</div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td width="50%" style="vertical-align: top;">
                                                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Target Completion Deadline</div>
                                                    <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px;">${formattedDeadline}</div>
                                                </td>
                                                <td width="50%" style="vertical-align: top;">
                                                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Project Value / Budget</div>
                                                    <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${formattedBudget}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                ${project.description ? `
                                <tr>
                                    <td style="padding: 14px 20px; border-top: 1px dashed #cbd5e1; background-color: #f1f5f9;">
                                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Scope & Specifications</div>
                                        <div style="font-size: 12px; font-weight: 500; color: #334155; margin-top: 3px; line-height: 1.5;">${escapeHtml(project.description)}</div>
                                    </td>
                                </tr>
                                ` : ''}
                            </table>

                            <!-- Call to Action Button -->
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${projectPortalLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; display: inline-block; padding: 14px 32px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);">
                                    Access Project in Client Portal &rarr;
                                </a>
                            </div>

                            <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 0; background-color: #f8fafc; padding: 14px; border-left: 3px solid #f59e0b;">
                                <strong>Next Operational Steps:</strong> Your designated engineering officer will coordinate on-site measurement verification, fabrication scheduling, and material logistics. You can track progress, view photo updates, and review milestones at any time in your client portal.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">
                                Krishna Engineering Works
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5;">
                                Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514<br>
                                Phone: +91 94479 40835 &bull; Email: contact@krishnaengg.com
                            </div>
                            <div style="font-size: 10px; color: #94a3b8; margin-top: 10px;">
                                This is an automated operations message sent to ${escapeHtml(clientEmail)}.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const plainText = `KRISHNA ENGINEERING WORKS - PROJECT ASSIGNMENT NOTICE
=========================================================

Dear ${clientName || 'Valued Client'},

Your engineering project has been officially commissioned and assigned to our operational engineering team.

PROJECT DETAILS:
----------------
Project Title: ${project.title}
Reference ID: #${projectIdShort}
Service Type: ${project.serviceType || 'Fabrication'}
Assigned Staff: ${staffListText}
Deadline: ${formattedDeadline}
Budget: ${formattedBudget}
Current Status: ${statusText}
${project.description ? `Description: ${project.description}\n` : ''}
VIEW YOUR PROJECT IN CLIENT PORTAL:
${projectPortalLink}

Our assigned engineering staff will coordinate with you regarding on-site requirements and milestone progression.

Warm regards,
Team Krishna Engineering Works
Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514
Phone: +91 94479 40835
Email: contact@krishnaengg.com
`;

        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: 'Your Project Has Been Assigned – Krishna Engineering Works',
            text: plainText,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Project assignment email dispatched to ${clientEmail} (ID: ${info.messageId || 'Sent'})`);
        return { success: true, messageId: info.messageId, recipient: clientEmail };
    } catch (error) {
        console.error('❌ Error sending project assignment email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * 2. Project Timeline Update Email to Client
 */
const sendProjectTimelineUpdateEmail = async ({
    clientEmail,
    clientName,
    project,
    timelineDiff = {},
    fullTimeline = [],
    latestCompletionDate,
    additionalMessage,
    portalUrl
}) => {
    try {
        if (!clientEmail) {
            console.warn('sendProjectTimelineUpdateEmail: No client email provided.');
            return { success: false, error: 'Client email is required' };
        }

        const transporter = createTransporter();
        const appUrl = portalUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
        const timelinePortalLink = `${appUrl.replace(/\/$/, '')}/customer/projects`;
        const projectIdShort = project._id ? project._id.toString().slice(-8).toUpperCase() : 'N/A';

        const {
            newMilestones = [],
            completedMilestones = [],
            delayedMilestones = [],
            deadlineRevised = false
        } = timelineDiff;

        // Render Milestones Table Rows
        const milestoneRowsHtml = (fullTimeline || []).map((m, idx) => {
            const formattedDate = m.date 
                ? new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'TBD';
            const isCompleted = m.status === 'Completed';
            const statusBadge = isCompleted
                ? '<span style="background-color: #d1fae5; color: #065f46; font-weight: 800; font-size: 10px; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">Completed</span>'
                : '<span style="background-color: #fef3c7; color: #92400e; font-weight: 800; font-size: 10px; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">Pending</span>';

            return `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #64748b;">${idx + 1}</td>
                    <td style="padding: 12px 14px;">
                        <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(m.title)}</div>
                        ${m.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(m.description)}</div>` : ''}
                    </td>
                    <td style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #1e293b; white-space: nowrap;">
                        ${formattedDate}
                    </td>
                    <td style="padding: 12px 14px; text-align: right; white-space: nowrap;">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');

        // Build Highlights Card
        let highlightsHtml = '';
        if (completedMilestones.length > 0 || newMilestones.length > 0 || delayedMilestones.length > 0 || deadlineRevised) {
            highlightsHtml = `
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 18px; margin-bottom: 24px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 1px; margin-bottom: 10px;">
                        Recent Schedule Updates & Status Changes
                    </div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #14532d; line-height: 1.6;">
                        ${completedMilestones.map(m => `
                            <li><strong>Completed:</strong> ${escapeHtml(m.title)}</li>
                        `).join('')}
                        ${newMilestones.map(m => `
                            <li><strong>New Milestone Added:</strong> ${escapeHtml(m.title)} (Target: ${m.date ? new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'})</li>
                        `).join('')}
                        ${delayedMilestones.map(m => `
                            <li style="color: #991b1b;"><strong>Rescheduled / Delayed:</strong> ${escapeHtml(m.title)} &mdash; Previous: ${escapeHtml(m.previousDate)} &rarr; Revised: ${escapeHtml(m.revisedDate)}</li>
                        `).join('')}
                        ${deadlineRevised && latestCompletionDate ? `
                            <li style="color: #1e40af;"><strong>Revised Overall Project Completion:</strong> ${escapeHtml(latestCompletionDate)}</li>
                        ` : ''}
                    </ul>
                </div>
            `;
        }

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Timeline Updated</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <!-- Brand Header -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 28px 28px; text-align: left; border-bottom: 4px solid #4f46e5;">
                            <div style="color: #818cf8; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">
                                Krishna Engineering Works
                            </div>
                            <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; line-height: 1.2;">
                                Project Timeline Updated
                            </h1>
                            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0; font-weight: 500;">
                                Milestone Roadmap & Target Schedule Notice
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 28px;">
                            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                                Dear <strong>${escapeHtml(clientName || 'Valued Client')}</strong>,
                            </p>
                            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                                The operational milestone timeline for your project <strong>${escapeHtml(project.title)}</strong> (Reference: #${projectIdShort}) has been updated by our engineering management team.
                            </p>

                            <!-- Optional Custom Admin Message -->
                            ${additionalMessage ? `
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 1px; margin-bottom: 4px;">
                                    Message from Project Administration
                                </div>
                                <div style="font-size: 13px; font-style: italic; color: #1e3a8a; line-height: 1.5;">
                                    "${escapeHtml(additionalMessage)}"
                                </div>
                            </div>
                            ` : ''}

                            <!-- Highlights section -->
                            ${highlightsHtml}

                            <!-- Overall Completion Target Banner -->
                            <div style="background-color: #0f172a; color: #ffffff; padding: 14px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td>
                                            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">
                                                Latest Expected Completion Target
                                            </div>
                                            <div style="font-size: 16px; font-weight: 800; color: #38bdf8; margin-top: 2px;">
                                                ${escapeHtml(latestCompletionDate || 'Active Operations')}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Full Milestone Roadmap Table -->
                            <div style="margin-bottom: 24px;">
                                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">
                                    Full Project Milestone Schedule
                                </div>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                            <th style="padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569;">#</th>
                                            <th style="padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569;">Milestone Phase</th>
                                            <th style="padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569;">Target Date</th>
                                            <th style="padding: 10px 14px; text-align: right; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${milestoneRowsHtml || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">No milestones defined.</td></tr>'}
                                    </tbody>
                                </table>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 28px 0 20px 0;">
                                <a href="${timelinePortalLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; display: inline-block; padding: 14px 32px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);">
                                    View Project Timeline in Portal &rarr;
                                </a>
                            </div>

                            <p style="font-size: 12px; color: #64748b; margin: 0; text-align: center;">
                                Live updates, photographs, and milestone verification are accessible anytime via your client portal.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">
                                Krishna Engineering Works
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5;">
                                Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514<br>
                                Phone: +91 94479 40835 &bull; Email: contact@krishnaengg.com
                            </div>
                            <div style="font-size: 10px; color: #94a3b8; margin-top: 10px;">
                                You are receiving this update as the registered client for Project #${projectIdShort}.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const plainText = `KRISHNA ENGINEERING WORKS - PROJECT TIMELINE UPDATED
=========================================================

Dear ${clientName || 'Valued Client'},

The milestone schedule for your project "${project.title}" (Ref: #${projectIdShort}) has been updated.

${additionalMessage ? `MESSAGE FROM ADMINISTRATION:\n"${additionalMessage}"\n\n` : ''}
LATEST EXPECTED COMPLETION: ${latestCompletionDate || 'Active Operations'}

FULL MILESTONE SCHEDULE:
------------------------
${(fullTimeline || []).map((m, idx) => {
    const d = m.date ? new Date(m.date).toLocaleDateString('en-IN') : 'TBD';
    return `${idx + 1}. ${m.title} [${m.status}] - Target: ${d} ${m.description ? `(${m.description})` : ''}`;
}).join('\n')}

VIEW LIVE TIMELINE IN YOUR CLIENT PORTAL:
${timelinePortalLink}

Warm regards,
Team Krishna Engineering Works
Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514
Phone: +91 94479 40835
Email: contact@krishnaengg.com
`;

        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: `Project Timeline Updated – ${project.title}`,
            text: plainText,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Project timeline update email dispatched to ${clientEmail} (ID: ${info.messageId || 'Sent'})`);
        return { success: true, messageId: info.messageId, recipient: clientEmail };
    } catch (error) {
        console.error('❌ Error sending project timeline update email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * 3. Technical Support Request Notification to Admin
 */
const sendAdminSupportRequestEmail = async ({
    adminEmail,
    projectTitle,
    projectId,
    clientName,
    clientEmail,
    clientRole = 'customer',
    reason,
    description,
    submittedAt
}) => {
    try {
        const recipient = adminEmail || process.env.EMAIL_USER;
        if (!recipient) {
            console.warn('sendAdminSupportRequestEmail: No admin email configured.');
            return { success: false, error: 'Admin recipient email is required' };
        }

        const transporter = createTransporter();
        const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const adminSupportUrl = `${appUrl.replace(/\/$/, '')}/admin/support`;

        const shortId = projectId ? projectId.toString().slice(-8).toUpperCase() : 'N/A';
        const timeFormatted = submittedAt 
            ? new Date(submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
            : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

        const safeProjectTitle = escapeHtml(projectTitle || 'Untitled Project');
        const safeClientName = escapeHtml(clientName || 'Valued Client');
        const safeClientEmail = escapeHtml(clientEmail || 'N/A');
        const safeReason = escapeHtml(reason || 'General Technical Consultation');
        const safeDescription = description ? escapeHtml(description) : 'No additional details provided.';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Technical Support Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 28px 32px; border-bottom: 2px solid #4f46e5;">
                            <div style="font-size: 11px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">
                                Krishna Engineering Works • Operations Desk
                            </div>
                            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                                🔔 New Technical Support Request
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px;">
                            <div style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px;">
                                Action Required • Authorization Pending
                            </div>

                            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                                A new technical support inquiry has been submitted by a client and is awaiting review in the ERP portal.
                            </p>

                            <!-- Details Card -->
                            <table role="presentation" width="100%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px; border-collapse: separate; border-spacing: 0;">
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b; width: 35%;">Project</td>
                                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #f8fafc; border-bottom: 1px solid #1e293b;">${safeProjectTitle} <span style="font-family: monospace; color: #818cf8;">#${shortId}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b;">Client Name</td>
                                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #f8fafc; border-bottom: 1px solid #1e293b;">${safeClientName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b;">Client Email</td>
                                    <td style="padding: 12px 16px; font-size: 13px; font-family: monospace; color: #cbd5e1; border-bottom: 1px solid #1e293b;">${safeClientEmail}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b;">Reason / Category</td>
                                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #fbbf24; border-bottom: 1px solid #1e293b;">${safeReason}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e293b;">Submission Time</td>
                                    <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #cbd5e1; border-bottom: 1px solid #1e293b;">${timeFormatted} IST</td>
                                </tr>
                                <tr>
                                    <td style="padding: 14px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; vertical-align: top;">Request Details</td>
                                    <td style="padding: 14px 16px; font-size: 13px; font-weight: 500; color: #e2e8f0; line-height: 1.5; font-style: italic;">"${safeDescription}"</td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0 10px 0;">
                                <a href="${adminSupportUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 15px 32px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);">
                                    Review & Authorize in Admin Portal &rarr;
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 20px 32px; border-top: 1px solid #334155; text-align: center; font-size: 11px; color: #64748b;">
                            Krishna Engineering Works ERP • Automated Operations Dispatch<br>
                            To configure these alerts, visit System Directives &rarr; Notification & Alert Settings.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        const plainText = `NEW TECHNICAL SUPPORT REQUEST - KRISHNA ENGINEERING WORKS
-------------------------------------------------------------------
A new technical support inquiry has been submitted by a client.

Project: ${projectTitle || 'N/A'} (#${shortId})
Client: ${clientName || 'N/A'} (${clientEmail || 'N/A'})
Reason: ${reason || 'N/A'}
Time: ${timeFormatted} IST
Details: ${description || 'No additional details provided.'}

To review and authorize this channel, visit:
${adminSupportUrl}
`;

        const mailOptions = {
            from: `"Krishna Engineering Works Alerts" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject: `New Technical Support Request – ${projectTitle || 'Project'} (#${shortId})`,
            text: plainText,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Admin support request email dispatched to ${recipient} (ID: ${info.messageId || 'Sent'})`);
        return { success: true, messageId: info.messageId, recipient };
    } catch (error) {
        console.error('❌ Error sending admin support request email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * 4. Technical Support Request Approved Email to Client
 */
const sendClientSupportApprovedEmail = async ({
    clientEmail,
    clientName,
    projectTitle,
    projectId,
    supportLink,
    instructions
}) => {
    try {
        if (!clientEmail) {
            console.warn('sendClientSupportApprovedEmail: No client email provided.');
            return { success: false, error: 'Client email is required' };
        }

        const transporter = createTransporter();
        const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const sessionUrl = supportLink || `${appUrl.replace(/\/$/, '')}/customer/support`;

        const shortId = projectId ? projectId.toString().slice(-8).toUpperCase() : 'N/A';
        const safeProjectTitle = escapeHtml(projectTitle || 'Your Project');
        const safeClientName = escapeHtml(clientName || 'Valued Client');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Technical Support Request Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                    <!-- Brand Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 32px;">
                            <div style="font-size: 11px; font-weight: 800; color: #a7f3d0; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">
                                Krishna Engineering Works • Client Services
                            </div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                                ✅ Support Request Approved
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
                                Dear ${safeClientName},
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                We are pleased to inform you that your Technical Support request regarding <strong style="color: #0f172a;">${safeProjectTitle}</strong> (<span style="font-family: monospace; color: #059669; font-weight: 700;">#${shortId}</span>) has been approved by our engineering operations command.
                            </p>

                            <!-- Status Badge -->
                            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
                                <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">
                                    Channel Status: Active & Authenticated
                                </div>
                                <div style="font-size: 13px; color: #065f46; font-weight: 600;">
                                    A direct, high-precision technical support tunnel is now open for your inquiry.
                                </div>
                            </div>

                            <!-- Instructions -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #334155;">
                                    📋 Instructions for Accessing Your Support Session:
                                </h3>
                                <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7; color: #475569;">
                                    <li>Click the secure <strong>Enter Support Session</strong> button below.</li>
                                    <li>Alternatively, log in to your <a href="${appUrl}/customer/support" style="color: #059669; font-weight: 700; text-decoration: none;">Client Portal</a> and navigate to <strong>Technical Support</strong>.</li>
                                    <li>Your dedicated consultation room for <strong>${safeProjectTitle}</strong> will be active in your Live Operations dashboard.</li>
                                    <li>Communicate real-time with our senior engineers and project leads directly.</li>
                                </ol>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 28px 0;">
                                <a href="${sessionUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 16px 36px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.35);">
                                    Enter Support Session &rarr;
                                </a>
                            </div>

                            <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                                🔒 <strong>Security Notice:</strong> This session link is cryptographically tied to your registered client credentials. Keep your login details confidential.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">KRISHNA ENGINEERING WORKS</div>
                            <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
                                Industrial Area Phase 1 • Contact: contact@krishnaengg.com • +91 9447940835<br>
                                Heavy PEB Structures, Industrial Roofing & High-Tensile Fabrication
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        const plainText = `TECHNICAL SUPPORT REQUEST APPROVED - KRISHNA ENGINEERING WORKS
-------------------------------------------------------------------
Dear ${clientName || 'Valued Client'},

Your technical support request regarding ${projectTitle || 'Your Project'} (#${shortId}) has been approved!

Status: Approved & Active
Access your secure support session using this link:
${sessionUrl}

Instructions:
1. Click the link above or log in to your Client Portal at ${appUrl}/customer/support.
2. Select the active support channel in your Live Operations dashboard.
3. Consult directly with our senior engineering team.

Krishna Engineering Works
contact@krishnaengg.com | +91 9447940835
`;

        const mailOptions = {
            from: `"Krishna Engineering Works Support" <${process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: `Technical Support Request Approved – ${projectTitle || 'Krishna Engineering Works'}`,
            text: plainText,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Client support approved email dispatched to ${clientEmail} (ID: ${info.messageId || 'Sent'})`);
        return { success: true, messageId: info.messageId, recipient: clientEmail };
    } catch (error) {
        console.error('❌ Error sending client support approved email:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * 5. Test Support Alert Email
 */
const sendTestSupportAlertEmail = async (targetEmail) => {
    try {
        const recipient = targetEmail || process.env.EMAIL_USER;
        if (!recipient) {
            return { success: false, error: 'Recipient email is required for test' };
        }

        const transporter = createTransporter();
        const timeFormatted = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

        const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, sans-serif; color: #f8fafc;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155;">
        <div style="font-size: 11px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Krishna Engineering Works</div>
        <h2 style="margin: 0 0 16px 0; color: #34d399;">✅ Alert System Diagnostic Test Passed</h2>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
            This is a verified test email from the Krishna Engineering Works ERP <strong>Notification & Alert Settings</strong> module.
        </p>
        <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; font-size: 12px; color: #94a3b8; margin: 20px 0;">
            <div><strong>Timestamp:</strong> ${timeFormatted} IST</div>
            <div><strong>Recipient:</strong> ${recipient}</div>
            <div><strong>Channel:</strong> Transactional SMTP Relay</div>
            <div><strong>Status:</strong> Operational</div>
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0;">
            If you received this message, your email alert dispatch pipeline is working correctly.
        </p>
    </div>
</body>
</html>`;

        const mailOptions = {
            from: `"Krishna Engineering Works System" <${process.env.EMAIL_USER}>`,
            to: recipient,
            subject: `[Test] Technical Support Alert Verification – Krishna Engineering Works`,
            text: `Alert System Diagnostic Test Passed. Timestamp: ${timeFormatted} IST. Recipient: ${recipient}.`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId, recipient };
    } catch (error) {
        console.error('❌ Error sending test alert email:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetOTP,
    sendLoginOTP,
    sendMasterResetOTP,
    sendLoginNotification,
    sendSignoutNotification,
    sendPasswordChangeConfirmation,
    sendStatusUpdateEmail,
    sendEmailVerificationOTP,
    sendProjectAssignmentEmail,
    sendProjectTimelineUpdateEmail,
    sendAdminSupportRequestEmail,
    sendClientSupportApprovedEmail,
    sendTestSupportAlertEmail
};

