/**
 * Environment & Secret Configuration Validator for Secure Deployment
 */

const validateEnv = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const errors = [];
    const warnings = [];

    // 1. JWT_SECRET Validation
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        if (isProduction) {
            errors.push('CRITICAL: JWT_SECRET environment variable is missing.');
        } else {
            warnings.push('JWT_SECRET is not set; using development fallback.');
        }
    } else if (['secret', 'secret123', 'admin', 'password', '123456'].includes(jwtSecret.toLowerCase())) {
        if (isProduction) {
            errors.push('CRITICAL: Insecure default JWT_SECRET detected in production.');
        } else {
            warnings.push('JWT_SECRET uses an easily guessable default string.');
        }
    } else if (jwtSecret.length < 32 && isProduction) {
        warnings.push('JWT_SECRET should ideally be at least 32 characters (256-bit) long for high cryptographic strength.');
    }

    // 2. MONGODB_URI Validation
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        if (isProduction) {
            errors.push('CRITICAL: MONGODB_URI is not set in production. Database connections will fail.');
        } else {
            warnings.push('MONGODB_URI is not set; defaulting to local MongoDB instance.');
        }
    } else if (isProduction && (mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost'))) {
        warnings.push('MONGODB_URI in production is pointing to localhost/127.0.0.1 instead of a managed cluster.');
    }

    // 3. Email & Payment Gateway Warnings
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        warnings.push('EMAIL_USER or EMAIL_PASS not set; password resets and OTP notifications will run in mock/log mode.');
    }

    // Print Warnings
    if (warnings.length > 0) {
        console.warn('\n─── [SECURITY ENVIRONMENT AUDIT WARNINGS] ───');
        warnings.forEach(w => console.warn(`⚠️  ${w}`));
        console.warn('──────────────────────────────────────────────\n');
    }

    // Halt startup if fatal errors exist in production
    if (errors.length > 0) {
        console.error('\n🚨 ─── [FATAL DEPLOYMENT CONFIGURATION ERRORS] ───');
        errors.forEach(e => console.error(`❌ ${e}`));
        console.error('───────────────────────────────────────────────────\n');
        if (isProduction) {
            throw new Error(`Server startup aborted due to ${errors.length} fatal security configuration error(s).`);
        }
    }

    return { valid: errors.length === 0, warnings, errors };
};

module.exports = validateEnv;
