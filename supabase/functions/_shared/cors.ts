// Gemeinsame CORS-Header für alle Edge Functions. Ohne diese lehnt der
// Browser jeden Aufruf vom Netlify-Frontend aus schon beim OPTIONS-Preflight
// ab ("has been blocked by CORS policy"), da die Requests per Content-Type
// application/json bzw. Authorization-Header nie als "simple request" gelten.
// Dateien mit führendem Unterstrich werden von Supabase nicht als eigene
// Function deployt, sondern nur als gemeinsamer Code importiert.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
