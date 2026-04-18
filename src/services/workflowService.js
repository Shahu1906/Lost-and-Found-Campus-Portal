const axios = require('axios');
require('dotenv').config();

exports.triggerN8N = async (workflowEvent, data) => {
    try {
        const response = await axios.post(process.env.N8N_WEBHOOK_URL, {
            event: workflowEvent,
            payload: data,
            timestamp: new Date()
        });
        return response.data;
    } catch (err) {
        console.error('n8n Workflow Trigger Failed:', err.message);
        // We don't crash the app if n8n is down, just log it.
    }
};