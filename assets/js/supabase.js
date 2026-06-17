// Startup Business Summit 2026 - Supabase Client SDK integration
// Dependencies: Supabase JS client must be loaded via CDN script before this script.

const SUPABASE_URL = "https://yzuwgivkezpggtnmgurm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_f99LOF4hqpUU9PBX4U6H3Q_Qh_5u6Ik";

let supabaseClient = null;

// Initialize Supabase Client
function getSupabaseClient() {
    if (!supabaseClient) {
        if (typeof window.supabase === 'undefined') {
            console.error("Supabase SDK is not loaded. Please verify the CDN script tag exists.");
            return null;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }
    return supabaseClient;
}

// Global reference
window.supabaseClient = getSupabaseClient();

/**
 * Check if a lead with this email already exists in a given table
 * @param {string} tableName 
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
async function checkDuplicateEmail(tableName, email) {
    const client = getSupabaseClient();
    if (!client || !email) return false;
    
    try {
        const { data, error } = await client
            .from(tableName)
            .select('id')
            .eq('email', email.trim().toLowerCase())
            .eq('is_deleted', false)
            .limit(1);
            
        if (error) {
            console.error(`Error checking duplicate email in ${tableName}:`, error);
            return false;
        }
        return data && data.length > 0;
    } catch (err) {
        console.error("Error in checkDuplicateEmail:", err);
        return false;
    }
}

/**
 * Submit form payload to Supabase database
 * @param {string} tableName 
 * @param {object} payload 
 * @returns {Promise<{data: any, error: any}>}
 */
async function submitFormToSupabase(tableName, payload) {
    const client = getSupabaseClient();
    if (!client) {
        return { data: null, error: new Error("Supabase Client is not initialized") };
    }
    
    // Auto-normalize emails to lowercase
    if (payload.email) {
        payload.email = payload.email.trim().toLowerCase();
    }
    
    try {
        const { data, error } = await client
            .from(tableName)
            .insert([payload])
            .select();
            
        return { data, error };
    } catch (err) {
        console.error(`Exception submitting form to ${tableName}:`, err);
        return { data: null, error: err };
    }
}

/**
 * Upload file to Supabase Storage bucket and return its public URL
 * @param {string} bucketName 
 * @param {File} file 
 * @returns {Promise<string>}
 */
async function uploadFileToStorage(bucketName, file) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase Client is not initialized");
    
    // Sanitize and generate unique filename
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `${Date.now()}_${sanitizedName}.${fileExt}`;
    const filePath = `${fileName}`;
    
    try {
        const { data, error } = await client.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
            
        if (error) {
            throw error;
        }
        
        // Get Public URL
        const { data: { publicUrl } } = client.storage
            .from(bucketName)
            .getPublicUrl(filePath);
            
        return publicUrl;
    } catch (err) {
        console.error(`Exception uploading file to ${bucketName}:`, err);
        throw err;
    }
}

/**
 * Log communication event to communication_logs
 * @param {string} recipient 
 * @param {string} channel 
 * @param {string} subject 
 * @param {string} message 
 * @param {string} status 
 */
async function logCommunication(recipient, channel, subject, message, status = 'sent') {
    const client = getSupabaseClient();
    if (!client) return;
    try {
        await client
            .from('communication_logs')
            .insert([{
                recipient,
                channel,
                subject,
                message: message.substring(0, 1000), // truncate long payloads
                status
            }]);
    } catch (err) {
        console.error("Failed to write to communication_logs:", err);
    }
}

/**
 * Fetch dynamic pricing configuration from event_settings
 * @returns {Promise<object>}
 */
async function fetchPricingSettings() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
        const { data, error } = await client
            .from('event_settings')
            .select('value')
            .eq('key', 'pricing')
            .single();
            
        if (error) {
            console.error("Error reading pricing settings:", error);
            return null;
        }
        return data.value;
    } catch (err) {
        console.error("Exception fetching pricing settings:", err);
        return null;
    }
}

// Export functions to window scope
window.supabaseAPI = {
    checkDuplicateEmail,
    submitFormToSupabase,
    uploadFileToStorage,
    logCommunication,
    fetchPricingSettings
};
