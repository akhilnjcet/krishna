const mongoose = require('mongoose');

/**
 * Strict Input Validation Helpers for Krishna ERP
 */

/**
 * Check if a string is a valid 24-character hex MongoDB ObjectId
 */
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate MongoDB ObjectId route param; returns 400 if invalid.
 * Compatible as both standalone middleware and router.param() callback.
 */
const validateObjectIdParam = (paramName = 'id') => {
    return (req, res, next, val) => {
        const id = (val !== undefined ? val : req.params?.[paramName]);
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: `Invalid ${paramName} format. Expected a 24-character hexadecimal ObjectId.`
            });
        }
        next();
    };
};


/**
 * Validate that an amount, price, or numeric field is a finite positive number
 */
const parsePositiveNumber = (val, fieldName, { min = 0, max = 100000000 } = {}) => {
    const num = Number(val);
    if (typeof val === 'undefined' || val === null || val === '') {
        throw new Error(`${fieldName} is required.`);
    }
    if (Number.isNaN(num) || !Number.isFinite(num)) {
        throw new Error(`${fieldName} must be a valid numeric value.`);
    }
    if (num < min) {
        throw new Error(`${fieldName} cannot be less than ${min}.`);
    }
    if (num > max) {
        throw new Error(`${fieldName} cannot exceed ${max}.`);
    }
    return num;
};

/**
 * Parse and constrain pagination query parameters
 */
const parsePagination = (query, defaultLimit = 20, maxLimit = 100) => {
    let page = parseInt(query?.page, 10);
    let limit = parseInt(query?.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * Validate date format and ensure it parses to a valid timestamp
 */
const parseValidDate = (dateVal, fieldName = 'Date') => {
    if (!dateVal) throw new Error(`${fieldName} is required.`);
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
        throw new Error(`${fieldName} is not a valid date.`);
    }
    return d;
};

module.exports = {
    isValidObjectId,
    validateObjectIdParam,
    parsePositiveNumber,
    parsePagination,
    parseValidDate
};
