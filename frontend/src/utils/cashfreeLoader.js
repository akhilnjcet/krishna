/**
 * Cashfree JavaScript SDK v3 Dynamic Loader & Initializer
 * Loads https://sdk.cashfree.com/js/v3/cashfree.js asynchronously
 */

let cashfreeSdkPromise = null;

export const loadCashfree = () => {
    if (window.Cashfree) {
        return Promise.resolve(window.Cashfree);
    }

    if (!cashfreeSdkPromise) {
        cashfreeSdkPromise = new Promise((resolve, reject) => {
            // Check if script tag already exists
            const existingScript = document.getElementById('cashfree-js-sdk');
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(window.Cashfree));
                existingScript.addEventListener('error', (err) => reject(new Error('Failed to load Cashfree SDK')));
                return;
            }

            const script = document.createElement('script');
            script.id = 'cashfree-js-sdk';
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.async = true;
            script.onload = () => {
                if (window.Cashfree) {
                    resolve(window.Cashfree);
                } else {
                    reject(new Error('Cashfree object not found on window.'));
                }
            };
            script.onerror = () => {
                cashfreeSdkPromise = null;
                reject(new Error('Failed to load Cashfree Payment SDK from CDN.'));
            };
            document.body.appendChild(script);
        });
    }

    return cashfreeSdkPromise;
};

/**
 * Initialize Cashfree instance with sandbox or production mode
 */
export const initializeCashfree = async (mode = 'sandbox') => {
    const Cashfree = await loadCashfree();
    return new Cashfree({
        mode: mode.toLowerCase() === 'production' ? 'production' : 'sandbox'
    });
};
