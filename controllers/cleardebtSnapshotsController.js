const supabase = require('../databases/config');

const TABLE = 'cleardebt_snapshots';

// GET /cleardebt-snapshots
module.exports.getAll = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from(TABLE)
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
module.exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from(TABLE)
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
module.exports.create = async (req, res) => {
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
            .from(TABLE)
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
module.exports.update = async (req, res) => {
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
            .from(TABLE)
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
module.exports.upsert = async (req, res) => {
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
            .from(TABLE)
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
module.exports.remove = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from(TABLE)
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
