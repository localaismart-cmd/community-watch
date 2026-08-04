// ===== COMMUNITY WATCH BACKEND API =====
// This provides a permanent, scalable backend for 150+ users
// Uses Supabase (free tier - no credit card needed)

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR-ANON-KEY';

// API endpoints for the app to call
const API = {
  // Submit an alert
  submitAlert: async (alert) => {
    const res = await fetch(SUPABASE_URL + '/rest/v1/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify(alert)
    });
    return res.json();
  },

  // Get alerts since last check
  getAlerts: async (sinceId) => {
    const res = await fetch(SUPABASE_URL + '/rest/v1/alerts?id=gt.' + sinceId + '&order=id.desc&limit=50', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    return res.json();
  },

  // Subscribe to push notifications
  subscribe: async (subscription) => {
    const res = await fetch(SUPABASE_URL + '/rest/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify(subscription)
    });
    return res.json();
  }
};
