const crypto = require('crypto');
const supabase = require('../databases/config');

const SNAPSHOTS_TABLE = 'cleardebt_snapshots';
const EDIT_LOCKS_TABLE = 'cleardebt_edit_locks';
const DEFAULT_LOCK_TTL_SECONDS = 300;

// ===== Snapshots =====

// GET /cleardebt-snapshots
module.exports.getAllSnapshots = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from(SNAPSHOTS_TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET /cleardebt-snapshots/:id
module.exports.getSnapshotById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from(SNAPSHOTS_TABLE)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: `Snapshot '${id}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// POST /cleardebt-snapshots
module.exports.createSnapshot = async (req, res) => {
    try {
        const { id, data: payload, version } = req.body;

        if (!payload) {
            return res.status(400).json({
                success: false,
                message: `'data' is required`
            });
        }

        const insertRow = { data: payload };
        if (id) insertRow.id = id;
        if (version) insertRow.version = version;

        const { data, error } = await supabase
            .from(SNAPSHOTS_TABLE)
            .insert(insertRow)
            .select('*');

        if (error) throw error;

        res.status(201).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// PUT /cleardebt-snapshots/:id
module.exports.updateSnapshot = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: payload, version } = req.body;

        if (!payload) {
            return res.status(400).json({
                success: false,
                message: `'data' is required`
            });
        }

        const updateRow = {
            data: payload,
            updated_at: new Date().toISOString()
        };
        if (version) updateRow.version = version;

        const { data, error } = await supabase
            .from(SNAPSHOTS_TABLE)
            .update(updateRow)
            .eq('id', id)
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Snapshot '${id}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// PUT /cleardebt-snapshots/:id/upsert (create or update in one call)
module.exports.upsertSnapshot = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: payload, version } = req.body;

        if (!payload) {
            return res.status(400).json({
                success: false,
                message: `'data' is required`
            });
        }

        const row = {
            id,
            data: payload,
            updated_at: new Date().toISOString()
        };
        if (version) row.version = version;

        const { data, error } = await supabase
            .from(SNAPSHOTS_TABLE)
            .upsert(row, { onConflict: 'id' })
            .select('*');

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE /cleardebt-snapshots/:id
module.exports.removeSnapshot = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from(SNAPSHOTS_TABLE)
            .delete()
            .eq('id', id)
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Snapshot '${id}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== Edit locks =====

// GET /cleardebt-edit-locks
module.exports.getAllLocks = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from(EDIT_LOCKS_TABLE)
            .select('*')
            .order('locked_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET /cleardebt-edit-locks/:resourceKey
module.exports.getLockByKey = async (req, res) => {
    try {
        const { resourceKey } = req.params;

        const { data, error } = await supabase
            .from(EDIT_LOCKS_TABLE)
            .select('*')
            .eq('resource_key', resourceKey)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: `Lock for '${resourceKey}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: data,
            expired: new Date(data.expires_at) < new Date()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// POST /cleardebt-edit-locks/:resourceKey/acquire
// body: { locked_by?, ttl_seconds? }
module.exports.acquireLock = async (req, res) => {
    try {
        const { resourceKey } = req.params;
        const { locked_by, ttl_seconds } = req.body;

        const ttl = Number(ttl_seconds) > 0 ? Number(ttl_seconds) : DEFAULT_LOCK_TTL_SECONDS;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();
        const lockToken = crypto.randomUUID();

        const { data: existing, error: selectError } = await supabase
            .from(EDIT_LOCKS_TABLE)
            .select('*')
            .eq('resource_key', resourceKey)
            .maybeSingle();

        if (selectError) throw selectError;

        // Race window here is acceptable for this app: only a near-simultaneous
        // acquire on the same key could slip through between select and write.
        if (existing && new Date(existing.expires_at) > now) {
            return res.status(409).json({
                success: false,
                message: `'${resourceKey}' is already locked`,
                data: existing
            });
        }

        const row = {
            resource_key: resourceKey,
            lock_token: lockToken,
            locked_by: locked_by || null,
            locked_at: now.toISOString(),
            expires_at: expiresAt
        };

        const { data, error } = existing
            ? await supabase.from(EDIT_LOCKS_TABLE).update(row).eq('resource_key', resourceKey).select('*')
            : await supabase.from(EDIT_LOCKS_TABLE).insert(row).select('*');

        if (error) throw error;

        res.status(200).json({
            success: true,
            data: data[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// PUT /cleardebt-edit-locks/:resourceKey/renew
// body: { lock_token, ttl_seconds? }
module.exports.renewLock = async (req, res) => {
    try {
        const { resourceKey } = req.params;
        const { lock_token, ttl_seconds } = req.body;

        if (!lock_token) {
            return res.status(400).json({
                success: false,
                message: `'lock_token' is required`
            });
        }

        const ttl = Number(ttl_seconds) > 0 ? Number(ttl_seconds) : DEFAULT_LOCK_TTL_SECONDS;
        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

        const { data, error } = await supabase
            .from(EDIT_LOCKS_TABLE)
            .update({ expires_at: expiresAt })
            .eq('resource_key', resourceKey)
            .eq('lock_token', lock_token)
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(409).json({
                success: false,
                message: `Lock token mismatch or '${resourceKey}' not locked`
            });
        }

        res.status(200).json({
            success: true,
            data: data[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// POST /cleardebt-edit-locks/:resourceKey/release
// body: { lock_token }
module.exports.releaseLock = async (req, res) => {
    try {
        const { resourceKey } = req.params;
        const { lock_token } = req.body;

        if (!lock_token) {
            return res.status(400).json({
                success: false,
                message: `'lock_token' is required`
            });
        }

        const { data, error } = await supabase
            .from(EDIT_LOCKS_TABLE)
            .delete()
            .eq('resource_key', resourceKey)
            .eq('lock_token', lock_token)
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(409).json({
                success: false,
                message: `Lock token mismatch or '${resourceKey}' not locked`
            });
        }

        res.status(200).json({
            success: true,
            data: data[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE /cleardebt-edit-locks/:resourceKey
// Admin force-unlock, bypasses lock_token check.
module.exports.forceReleaseLock = async (req, res) => {
    try {
        const { resourceKey } = req.params;

        const { data, error } = await supabase
            .from(EDIT_LOCKS_TABLE)
            .delete()
            .eq('resource_key', resourceKey)
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Lock for '${resourceKey}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: data[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
