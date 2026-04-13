import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';

const LegalPage = ({ type }) => {
    const [content, setContent] = useState('Loading intelligence directives...');
    const [title, setTitle] = useState('');

    useEffect(() => {
        const fetchLegal = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data) {
                    const key = type === 'terms' ? 'footer_tos' : 'footer_privacy';
                    const setting = res.data.find(s => s.key === key);
                    if (setting && setting.value) {
                        setContent(setting.value);
                    } else {
                        // High-quality default content for AdSense approval
                        if (type === 'privacy') {
                            setContent(`
                                PRIVACY POLICY
                                Last updated: April 2026

                                1. INTRODUCTION
                                Krishna Engineering Works ("the Company", "we", "us", or "our") operates the Krishna ERP Mobile Application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.

                                2. INFORMATION COLLECTION AND USE
                                To provide an enhanced industrial management experience, we collect several different types of information:
                                - Personal Identification: Name, Email, Phone Number, and Professional Role.
                                - Biometric Data: Our Staff Attendance module uses facial recognition technology. We collect and process facial descriptors (binary mathematical data) to verify identity. We do NOT store actual photographs for biometrics; only encrypted descriptors are used.
                                - Location Data: When using specific field-reporting or attendance features, we may collect precise location data to verify on-site operations.
                                - Financial Data: We collect payment reference IDs and UTR numbers for transaction verification.
                                - Storage Access: We require access to device storage to save and retrieve generated PDF receipts and project documentation.

                                3. DATA SECURITY
                                The security of your data is critical to us. We implement enterprise-grade encryption for all biometric descriptors and personal information.

                                4. THIRD-PARTY SERVICES
                                We may use third-party Service Providers to monitor and analyze the use of our Service, or to facilitate UPI payments (e.g., Amazon Pay, GPay, PhonePe).

                                5. DEVELOPER CONTACT INFORMATION
                                If you have any questions about this Privacy Policy, please contact us:
                                - Entity: Krishna Engineering Works
                                - Developer: AKHIL N
                                - Address: Thiruvazhiyode, Sreekrishnapuram, Kerala 679514
                                - Primary Contact: +91 9447940835
                                - Support Email: krishnaengineeringworks0715@gmail.com
                            `);
                        } else {
                            setContent(`
                                TERMS OF SERVICE
                                Last updated: April 2026

                                By accessing this Krishna ERP Application ("The App"), we assume you accept these terms and conditions. Do not continue to use Krishna ERP if you do not agree to take all of the terms and conditions stated on this page.

                                1. INTELLECTUAL PROPERTY
                                Unless otherwise stated, Krishna Engineering Works and/or its licensors own the intellectual property rights for all material on this Application. All intellectual property rights are reserved.

                                2. USER RESTRICTIONS
                                You are specifically restricted from all of the following:
                                - Publishing any App material in any other media.
                                - Selling, sublicensing and/or otherwise commercializing any App material.
                                - Using this Application in any way that is or may be damaging to this platform or its users.

                                3. LIMITATION OF LIABILITY
                                In no event shall Krishna Engineering Works, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this Application.
                            `);
                        }
                    }
                    setTitle(type === 'terms' ? 'TERMS OF SERVICE' : 'PRIVACY PROTOCOL');
                }
            } catch (err) {
                console.error("Legal sync failure:", err);
            }
        };
        fetchLegal();
        window.scrollTo(0, 0);
    }, [type]);

    return (
        <div className="bg-[#050505] min-h-screen text-white font-sans py-32 px-4">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16 border-l-8 border-brand-accent pl-8"
                >
                    <span className="text-brand-accent font-black uppercase tracking-[0.5em] text-[10px] mb-4 block">System Directive v1.0</span>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">{title}</h1>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/[0.02] border border-white/5 p-10 md:p-16 rounded-[3rem] backdrop-blur-3xl"
                >
                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 font-medium leading-relaxed whitespace-pre-line text-lg">
                            {content}
                        </p>
                    </div>
                </motion.div>

                <div className="mt-12 flex justify-center">
                    <div className="px-6 py-2 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">End of Intelligence Brief</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
