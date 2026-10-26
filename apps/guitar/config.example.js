// GuitarJemp – Verbindung zu Supabase
// Als config.js neben index.html ablegen (auf dem Server im Web-Verzeichnis)
// und den anon-Key aus Supabase Studio eintragen: Project Settings → API.
// Ohne config.js läuft die App nur lokal im Browser.
// Niemals den service_role-Key hier eintragen.
export default {
  supabaseUrl: 'https://supabase.jemphub.com',
  supabaseAnonKey: 'PASTE_ANON_KEY_HERE',
}
