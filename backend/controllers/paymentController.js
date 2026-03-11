const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'usd', description } = req.body;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amounts in cents
            currency,
            description,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            message: 'Payment intent created successfully (Mock mode if no real key provided)'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
