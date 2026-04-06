const axios = require('axios');

/**
 * Send a WhatsApp Message using Meta's Official Cloud API
 * This DOES NOT require a sender phone to be linked/powered-on
 */
const sendMetaWhatsApp = async (to, message) => {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const apiVersion = process.env.META_API_VERSION || 'v18.0';

    if (!accessToken || !phoneNumberId) {
        console.error('Meta WhatsApp API credentials missing from environment.');
        return false;
    }

    try {
        let cleanNumber = to.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

        const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
        
        const response = await axios.post(url, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanNumber,
            type: "text",
            text: {
                preview_url: false,
                body: message
            }
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Meta WhatsApp Message Sent:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Meta WhatsApp Dispatch Failure:', error.response?.data || error.message);
        return false;
    }
};

/**
 * Send a Template-based WhatsApp Message
 * Required by Meta for initiating conversations
 */
const sendMetaTemplate = async (to, templateName, components = []) => {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const apiVersion = process.env.META_API_VERSION || 'v18.0';

    try {
        let cleanNumber = to.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

        const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
        
        const response = await axios.post(url, {
            messaging_product: "whatsapp",
            to: cleanNumber,
            type: "template",
            template: {
                name: templateName,
                language: { code: "en_US" },
                components: components
            }
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Meta Template Sent:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Meta Template Dispatch Failure:', error.response?.data || error.message);
        return false;
    }
};

module.exports = {
    sendMetaWhatsApp,
    sendMetaTemplate
};
