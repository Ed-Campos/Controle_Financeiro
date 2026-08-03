// Camada de armazenamento do app.
//
// - Dados PESSOAIS (shared = false): sempre no localStorage do navegador. Fazem sentido
//   por dispositivo (ex: "em qual ambiente familiar eu estou logado"), então não
//   precisam sincronizar entre aparelhos.
//
// - Dados COMPARTILHADOS (shared = true): é aqui que fica a vida financeira do casal.
//   Se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estiverem configuradas (veja o
//   README), os dados vão para uma tabela Postgres real no Supabase e sincronizam
//   entre os dois parceiros, em qualquer dispositivo.
//   Sem essas variáveis configuradas, o app cai automaticamente para localStorage —
//   funciona para testar sozinho, mas os dados ficam presos a este navegador e não
//   sincronizam com o parceiro(a). Um aviso aparece na tela de login nesse caso.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasRealBackend = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabasePromise = null;
async function getSupabase() {
  if (!hasRealBackend) return null;
  if (!supabasePromise) {
    supabasePromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    );
  }
  return supabasePromise;
}

const LS_PREFIX = "financas-a-dois:";

function lsGet(key) {
  const raw = window.localStorage.getItem(LS_PREFIX + key);
  return raw === null ? null : raw;
}
function lsSet(key, value) {
  window.localStorage.setItem(LS_PREFIX + key, value);
}
function lsDelete(key) {
  window.localStorage.removeItem(LS_PREFIX + key);
}
function lsList(prefix) {
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX + prefix)) keys.push(k.slice(LS_PREFIX.length));
  }
  return keys;
}

export const storage = {
  async get(key, shared = false) {
    if (!shared) {
      const value = lsGet(key);
      return value === null ? null : { key, value, shared };
    }
    const sb = await getSupabase();
    if (!sb) {
      const value = lsGet("shared:" + key);
      return value === null ? null : { key, value, shared };
    }
    const { data, error } = await sb.from("kv_store").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return data ? { key, value: data.value, shared } : null;
  },

  async set(key, value, shared = false) {
    if (!shared) {
      lsSet(key, value);
      return { key, value, shared };
    }
    const sb = await getSupabase();
    if (!sb) {
      lsSet("shared:" + key, value);
      return { key, value, shared };
    }
    const { error } = await sb.from("kv_store").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    if (!shared) {
      const existed = lsGet(key) !== null;
      lsDelete(key);
      return { key, deleted: existed, shared };
    }
    const sb = await getSupabase();
    if (!sb) {
      const existed = lsGet("shared:" + key) !== null;
      lsDelete("shared:" + key);
      return { key, deleted: existed, shared };
    }
    const { error } = await sb.from("kv_store").delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    if (!shared) return { keys: lsList(prefix) };
    const sb = await getSupabase();
    if (!sb) return { keys: lsList("shared:" + prefix).map((k) => k.replace(/^shared:/, "")) };
    const { data, error } = await sb.from("kv_store").select("key").like("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key) };
  },
};
