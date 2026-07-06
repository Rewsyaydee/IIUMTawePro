function value(name) {
  const raw = process.env[name];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
}

export function getSupabaseServerConfig() {
  const url = value("SUPABASE_URL") || value("VITE_SUPABASE_URL");
  const key = value("SUPABASE_SERVICE_ROLE_KEY") || value("SUPABASE_SECRET_KEY");
  if (!url || !key) return null;
  return {
    url: url.replace(/\/$/, ""),
    key
  };
}

export function hasSupabaseServerConfig() {
  return Boolean(getSupabaseServerConfig());
}

export class SupabaseRequestError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "SupabaseRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function authorizationHeaders(key) {
  const headers = { apikey: key };
  if (!key.startsWith("sb_secret_") && !key.startsWith("sb_publishable_")) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export async function supabaseRequest(path, { method = "GET", body, headers = {} } = {}) {
  const config = getSupabaseServerConfig();
  if (!config) {
    throw new SupabaseRequestError("Supabase server configuration is missing.");
  }

  const response = await fetch(`${config.url}/rest/v1${path}`, {
    method,
    headers: {
      ...authorizationHeaders(config.key),
      "Content-Type": "application/json",
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = text;
    }
    throw new SupabaseRequestError("Supabase request failed.", {
      status: response.status,
      payload
    });
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function supabaseStorageRequest(path, { method = "GET", body, headers = {} } = {}) {
  const config = getSupabaseServerConfig();
  if (!config) {
    throw new SupabaseRequestError("Supabase server configuration is missing.");
  }

  const response = await fetch(`${config.url}/storage/v1${path}`, {
    method,
    headers: {
      ...authorizationHeaders(config.key),
      ...headers
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = text;
    }
    throw new SupabaseRequestError("Supabase storage request failed.", {
      status: response.status,
      payload
    });
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function encodeStoragePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function uploadStorageObject({ bucket, path, body, contentType }) {
  return supabaseStorageRequest(`/object/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "3600",
      "x-upsert": "true"
    },
    body
  });
}

export async function createSignedStorageUrl({ bucket, path, expiresIn = 60 * 15 }) {
  const config = getSupabaseServerConfig();
  const payload = await supabaseStorageRequest(`/object/sign/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn })
  });
  const signedPath = payload?.signedURL || payload?.signedUrl;
  if (!signedPath) return "";
  if (signedPath.startsWith("http")) return signedPath;
  if (signedPath.startsWith("/storage/v1")) return `${config.url}${signedPath}`;
  if (signedPath.startsWith("/object/")) return `${config.url}/storage/v1${signedPath}`;
  return `${config.url}/storage/v1/${signedPath.replace(/^\//, "")}`;
}

export function mapSupabaseUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    telegramId: row.telegram_id,
    name: row.name,
    role: row.role,
    bureau: row.bureau || undefined
  };
}

export async function getUserRecordByTelegramId(telegramId) {
  const rows = await supabaseRequest(
    `/users?telegram_id=eq.${encodeURIComponent(telegramId)}&select=id,telegram_id,name,role,bureau,status&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : undefined;
}

export async function getUserById(id) {
  const rows = await supabaseRequest(`/users?id=eq.${encodeURIComponent(id)}&status=eq.active&select=id,telegram_id,name,role,bureau&limit=1`);
  return mapSupabaseUser(Array.isArray(rows) ? rows[0] : undefined);
}

export async function getUserByTelegramId(telegramId) {
  const row = await getUserRecordByTelegramId(telegramId);
  if (!row || row.status !== "active") return null;
  return mapSupabaseUser(row);
}

export async function upsertUserProfile({ telegramId, name, role, bureau }) {
  const normalizedRole = role || "student";
  const normalizedBureau = normalizedRole === "student" || normalizedRole === "mainboard" ? null : bureau || null;
  const rows = await supabaseRequest("/users?on_conflict=telegram_id&select=id,telegram_id,name,role,bureau", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: [
      {
        telegram_id: telegramId,
        name,
        role: normalizedRole,
        bureau: normalizedBureau,
        status: "active",
        updated_at: new Date().toISOString()
      }
    ]
  });
  const user = mapSupabaseUser(Array.isArray(rows) ? rows[0] : undefined);
  if (!user) {
    throw new SupabaseRequestError("Supabase user upsert returned no rows.");
  }
  return user;
}

export async function createAuditLog({ actor, action, tableName, recordId, details }) {
  if (!actor) return;
  await supabaseRequest("/audit_log", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: [
      {
        actor_id: actor.id,
        actor_name: actor.name,
        action,
        table_name: tableName,
        record_id: recordId,
        details
      }
    ]
  });
}
