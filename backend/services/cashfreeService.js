const { Cashfree, CFEnvironment } = require('cashfree-pg');
const axios = require('axios');
const Setting = require('../models/SystemSetting');

/**
 * Cashfree Payment Gateway Service
 * Powered by official cashfree-pg SDK (API version 2026-01-01)
 * Supports dynamic credentials from MongoDB Settings or Environment Variables
 */
class CashfreeService {
    async getCredentials() {
        let appId = process.env.CASHFREE_APP_ID || '';
        let secretKey = process.env.CASHFREE_SECRET_KEY || '';
        let env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase();
        let enabled = true;

        try {
            const settings = await Setting.find({ 
                key: { $in: ['cashfree_app_id', 'cashfree_secret_key', 'cashfree_mode', 'cashfree_enabled'] } 
            });

            settings.forEach(s => {
                if (s.key === 'cashfree_app_id' && s.value) appId = s.value;
                if (s.key === 'cashfree_secret_key' && s.value) secretKey = s.value;
                if (s.key === 'cashfree_mode' && s.value) env = s.value.toLowerCase();
                if (s.key === 'cashfree_enabled') enabled = s.value === 'true' || s.value === true;
            });
        } catch (err) {
            console.warn('[Cashfree] Could not query settings table:', err.message);
        }

        appId = (appId || '').toString().trim();
        secretKey = (secretKey || '').toString().trim();

        // If secret was accidentally double-pasted into input box (e.g. 108 chars instead of 54)
        const keyMatch = secretKey.match(/cfsk_ma_[a-z0-9]+_[a-f0-9]+_[a-f0-9]+/);
        if (keyMatch) {
            const cleanSecret = keyMatch[0];
            if (cleanSecret !== secretKey) {
                secretKey = cleanSecret;
                Setting.findOneAndUpdate({ key: 'cashfree_secret_key' }, { value: cleanSecret }).catch(() => {});
            }
        }

        // Automatically enforce Production mode when live production keys are detected
        // Cashfree Sandbox requires TEST_ keys. Production keys (cfsk_ma_prod_ or numeric App ID) fail on Sandbox with 'authentication Failed'.
        let isProduction = env === 'production' || env === 'prod';
        const hasProdSecret = secretKey && secretKey.includes('_prod_');
        const hasProdAppId = appId && !appId.toUpperCase().startsWith('TEST');
        if (hasProdSecret || hasProdAppId) {
            isProduction = true;
            env = 'production';
        }

        const baseUrl = isProduction 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        return {
            appId,
            secretKey,
            env: isProduction ? 'production' : 'sandbox',
            isProduction,
            baseUrl,
            enabled: enabled && Boolean(appId && secretKey)
        };
    }

    /**
     * Get initialized Cashfree SDK client
     */
    async getClient() {
        const creds = await this.getCredentials();
        if (!creds.appId || !creds.secretKey) {
            throw new Error('Cashfree credentials not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Admin Settings or .env.');
        }

        const cfEnv = creds.isProduction ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
        const cashfree = new Cashfree(cfEnv, creds.appId, creds.secretKey);
        cashfree.XApiVersion = '2026-01-01';
        return { cashfree, creds };
    }

    /**
     * Create Cashfree PG Order
     */
    async createOrder({ 
        orderId, 
        orderAmount, 
        customerId, 
        customerName, 
        customerEmail, 
        customerPhone, 
        orderNote = 'Payment for Krishna Engineering Works',
        returnUrl
    }) {
        const { cashfree, creds } = await this.getClient();

        // Clean & format customer parameters to satisfy Cashfree validation
        const sanitizedPhone = (customerPhone || '9999999999').toString().replace(/\D/g, '').slice(-10) || '9999999999';
        const sanitizedCustId = (customerId || `cust_${Date.now()}`).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedName = (customerName || 'Valued Customer').slice(0, 50);
        const sanitizedEmail = (customerEmail && customerEmail.includes('@')) ? customerEmail : 'customer@krishnaengg.com';

        const request = {
            order_id: orderId,
            order_amount: parseFloat(parseFloat(orderAmount).toFixed(2)),
            order_currency: 'INR',
            customer_details: {
                customer_id: sanitizedCustId,
                customer_name: sanitizedName,
                customer_email: sanitizedEmail,
                customer_phone: sanitizedPhone
            },
            order_meta: {
                return_url: returnUrl || `https://krishnaengineering.vercel.app/#/customer/payments?cf_order_id=${orderId}`
            },
            order_note: orderNote.slice(0, 200)
        };

        const response = await cashfree.PGCreateOrder(request);

        return {
            orderId: response.data.order_id,
            paymentSessionId: response.data.payment_session_id,
            orderStatus: response.data.order_status,
            orderAmount: response.data.order_amount,
            environment: creds.env
        };
    }

    /**
     * Fetch Cashfree PG Order details & verify status
     */
    async getOrder(orderId) {
        const { cashfree } = await this.getClient();
        const response = await cashfree.PGFetchOrder(orderId);
        return response.data;
    }

    /**
     * Verify Webhook Signature (HMAC-SHA256)
     */
    async verifyWebhookSignature(signature, rawBody, timestamp) {
        const { cashfree } = await this.getClient();
        return cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    }

    /**
     * Get Eligible Payment Methods for an amount
     */
    async getEligiblePaymentMethods(amount = 100) {
        const creds = await this.getCredentials();
        if (!creds.appId || !creds.secretKey) {
            throw new Error('Cashfree credentials not configured.');
        }

        const response = await axios.post(
            `${creds.baseUrl}/eligibility/payment_methods`,
            { queries: { amount: parseFloat(amount) } },
            {
                headers: {
                    'x-client-id': creds.appId,
                    'x-client-secret': creds.secretKey,
                    'x-api-version': '2026-01-01',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    }
}

module.exports = new CashfreeService();

