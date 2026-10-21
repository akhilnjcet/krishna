const axios = require('axios');
const Setting = require('../models/SystemSetting');

/**
 * Cashfree Payment Gateway Service (API version 2023-08-01)
 * Supports dynamic credentials from MongoDB Settings or Environment Variables
 */
class CashfreeService {
    async getCredentials() {
        let appId = process.env.CASHFREE_APP_ID || '';
        let secretKey = process.env.CASHFREE_SECRET_KEY || '';
        let env = process.env.CASHFREE_ENV || 'sandbox';
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

        const isProduction = env === 'production';
        const baseUrl = isProduction 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        return {
            appId,
            secretKey,
            env,
            isProduction,
            baseUrl,
            enabled: enabled && Boolean(appId && secretKey)
        };
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
        const creds = await this.getCredentials();

        if (!creds.appId || !creds.secretKey) {
            throw new Error('Cashfree credentials not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Admin Settings or .env.');
        }

        // Clean & format customer parameters to satisfy Cashfree validation
        const sanitizedPhone = (customerPhone || '9999999999').toString().replace(/\D/g, '').slice(-10) || '9999999999';
        const sanitizedCustId = (customerId || `cust_${Date.now()}`).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedName = (customerName || 'Valued Customer').slice(0, 50);
        const sanitizedEmail = (customerEmail && customerEmail.includes('@')) ? customerEmail : 'customer@krishnaengg.com';

        const payload = {
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

        const response = await axios.post(`${creds.baseUrl}/orders`, payload, {
            headers: {
                'x-client-id': creds.appId,
                'x-client-secret': creds.secretKey,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

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
        const creds = await this.getCredentials();

        if (!creds.appId || !creds.secretKey) {
            throw new Error('Cashfree credentials not configured.');
        }

        const response = await axios.get(`${creds.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
            headers: {
                'x-client-id': creds.appId,
                'x-client-secret': creds.secretKey,
                'x-api-version': '2023-08-01'
            }
        });

        return response.data;
    }
}

module.exports = new CashfreeService();
