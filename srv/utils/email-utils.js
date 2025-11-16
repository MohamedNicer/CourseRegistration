/**
 * Email utility functions for normalizing and comparing email addresses
 */

/**
 * Normalize an email address for consistent comparison
 * Converts to lowercase and trims whitespace
 * 
 * @param {string|null|undefined} email - The email address to normalize
 * @returns {string|null} - The normalized email or null if input is invalid
 */
function normalizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return null;
    }
    
    return email.trim().toLowerCase();
}

module.exports = {
    normalizeEmail
};
