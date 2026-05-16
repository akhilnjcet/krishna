const { sendEmail } = require('./emailService');
const { sendWhatsAppMessage } = require('./whatsappService');

const EVENTS = {
    // Lodge System
    BOOKING_CREATED: 'BOOKING_CREATED',
    BOOKING_FAILED: 'BOOKING_FAILED',
    CHECKIN_SUCCESS: 'CHECKIN_SUCCESS',
    CHECKOUT_COMPLETED: 'CHECKOUT_COMPLETED',
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    PAYMENT_FAILED: 'PAYMENT_FAILED',

    // Account System
    USER_REGISTERED: 'USER_REGISTERED',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',
    PASSWORD_RESET: 'PASSWORD_RESET',

    // Complaint System
    COMPLAINT_SUBMITTED: 'COMPLAINT_SUBMITTED',
    COMPLAINT_IN_PROGRESS: 'COMPLAINT_IN_PROGRESS',
    COMPLAINT_RESOLVED: 'COMPLAINT_RESOLVED',
    COMPLAINT_REJECTED: 'COMPLAINT_REJECTED',

    // Industrial System
    QUOTE_REQUESTED: 'QUOTE_REQUESTED',
    QUOTE_ACCEPTED: 'QUOTE_ACCEPTED',
    QUOTE_REJECTED: 'QUOTE_REJECTED',
    WORK_STARTED: 'WORK_STARTED',
    WORK_PROGRESS: 'WORK_PROGRESS',
    WORK_COMPLETED: 'WORK_COMPLETED',
    INVOICE_GENERATED: 'INVOICE_GENERATED',
};

const TEMPLATES = {
    // Lodge Messages
    [EVENTS.BOOKING_CREATED]: 'Krisha Buildings: Hello [NAME], your reservation for Room [ROOM] on [CHECKIN] has been successfully confirmed. Amount: ₹[AMOUNT]. We look forward to your arrival.',
    [EVENTS.BOOKING_FAILED]: 'Krisha Buildings: Hello [NAME], we regret to inform you that your booking request for Room [ROOM] could not be processed. Please try again or contact support.',
    [EVENTS.CHECKIN_SUCCESS]: 'Krisha Buildings: Welcome [NAME]! You have been successfully checked into Room [ROOM]. Enjoy your stay.',
    [EVENTS.CHECKOUT_COMPLETED]: 'Krisha Buildings: Hello [NAME], your checkout from Room [ROOM] is complete. Thank you for staying with us!',
    [EVENTS.PAYMENT_SUCCESS]: 'Krisha Buildings: Transaction Successful. We have received your payment of ₹[AMOUNT] for Room [ROOM].',
    [EVENTS.PAYMENT_FAILED]: 'Krisha Buildings: Transaction Failed. Your payment of ₹[AMOUNT] for Room [ROOM] was not processed. Please contact your bank.',

    // Account Messages
    [EVENTS.USER_REGISTERED]: 'Krisha Buildings: Hello [NAME], your account registration was successful. Welcome to our community!',
    [EVENTS.LOGIN_SUCCESS]: 'Krisha Buildings: Hello [NAME], a successful login was detected on your account at [TIME].',
    [EVENTS.LOGIN_FAILED]: 'Krisha Buildings: Security Alert. A failed login attempt was detected on your account.',
    [EVENTS.LOGOUT_SUCCESS]: 'Krisha Buildings: You have been successfully signed out.',
    [EVENTS.PASSWORD_RESET]: 'Krisha Buildings: Your password has been successfully updated.',

    // Complaint Messages
    [EVENTS.COMPLAINT_SUBMITTED]: 'Krisha Buildings: Hello [NAME], we have received your maintenance request regarding "[TITLE]". Reference ID: [ID].',
    [EVENTS.COMPLAINT_IN_PROGRESS]: 'Krisha Buildings: Hello [NAME], we are now working on your request "[TITLE]".',
    [EVENTS.COMPLAINT_RESOLVED]: 'Krisha Buildings: Good news [NAME]! Your maintenance request "[TITLE]" has been resolved. Thank you for your patience.',
    [EVENTS.COMPLAINT_REJECTED]: 'Krisha Buildings: Hello [NAME], we could not process your maintenance request "[TITLE]" at this time.',

    // Industrial Messages
    [EVENTS.QUOTE_REQUESTED]: 'Krisha Engineering received your quote request.',
    [EVENTS.QUOTE_ACCEPTED]: 'Krisha Engineering accepted your quote.',
    [EVENTS.QUOTE_REJECTED]: 'Krisha Engineering rejected your quote.',
    [EVENTS.WORK_STARTED]: 'Krisha Engineering started your project work.',
    [EVENTS.WORK_PROGRESS]: 'Krisha Engineering updated your project progress: [PROGRESS]%.',
    [EVENTS.WORK_COMPLETED]: 'Krisha Engineering completed your project successfully.',
    [EVENTS.INVOICE_GENERATED]: 'Krisha Engineering generated your invoice.',
};

/**
 * Replace placeholders in a template with actual data
 * @param {string} template 
 * @param {object} data 
 * @returns {string}
 */
const formatMessage = (template, data = {}) => {
    let message = template;
    for (const key in data) {
        const placeholder = `[${key.toUpperCase()}]`;
        message = message.replace(placeholder, data[key]);
    }
    return message;
};

/**
 * Send automated notifications via WhatsApp and Email
 * @param {string} event - The event identifier from EVENTS
 * @param {object} user - User object containing email and phone number
 * @param {object} data - Dynamic data for template placeholders
 * @param {object} options - Configuration for sending (channels, etc.)
 */
const sendNotification = async (event, user, data = {}, options = { whatsapp: true, email: true }) => {
    try {
        const template = TEMPLATES[event];
        if (!template) {
            console.error(`No template found for event: ${event}`);
            return false;
        }

        const message = formatMessage(template, data);
        const subject = event.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

        const results = {
            whatsapp: false,
            email: false
        };

        // Send via WhatsApp
        if (options.whatsapp && (user.phoneNumber || user.phone)) {
            const phone = user.phoneNumber || user.phone;
            results.whatsapp = await sendWhatsAppMessage(phone, message);
        }

        // Send via Email
        if (options.email && user.email) {
            results.email = await sendEmail(user.email, subject, message);
        }

        console.log(`Notification sent for event ${event}:`, results);
        return results;
    } catch (error) {
        console.error(`Error in sendNotification for event ${event}:`, error);
        return false;
    }
};

module.exports = {
    EVENTS,
    sendNotification
};
