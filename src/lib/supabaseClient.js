import { createClient } from "@supabase/supabase-js";

const supabaseUrl ="https://tzofkmjdoahmhifrblwl.supabase.co"
const supabaseAnonKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b2ZrbWpkb2FobWhpZnJibHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTYwNzMsImV4cCI6MjA4NTI5MjA3M30.55UtDofCo6P9XmfDPDmLstoJv9d0cvE0Zme6GFGNcdk"


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
