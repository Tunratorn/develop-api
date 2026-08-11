const supabase = require('../databases/config');

const TABLES = {
    users: 'lunacat_users',
    calendars: 'lunacat_calendars',
    events: 'lunacat_calendar_events',
    holidays: 'lunacat_holidays',
    moneyEntries: 'lunacat_money_entries',
    products: 'lunacat_products',
    stockMovements: 'lunacat_product_stock_movements',
    productOverview: 'lunacat_product_overview'
};

const DEFAULT_CALENDARS = [
    { key: 'work', name: 'Work', color: '#146c64', sort_order: 1 },
    { key: 'personal', name: 'Personal', color: '#f06a4d', sort_order: 2 },
    { key: 'focus', name: 'Focus', color: '#3aaf82', sort_order: 3 }
];

function ok(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}

function fail(res, error, status = 500) {
    return res.status(status).json({
        success: false,
        message: error.message || error
    });
}

function requireFields(body, fields) {
    const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
    if (missing.length) {
        throw new Error(`${missing.join(', ')} required`);
    }
}

function normalizeMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
}

function mapEvent(row) {
    return {
        id: row.id,
        date: row.event_date,
        start: String(row.start_time).slice(0, 5),
        end: String(row.end_time).slice(0, 5),
        title: row.title,
        note: row.note || '',
        category: row.lunacat_calendars?.key || row.calendar_key || row.category || 'work'
    };
}

function mapHoliday(row) {
    return {
        id: row.id,
        date: row.holiday_date,
        title: row.title
    };
}

function mapMoneyEntry(row) {
    return {
        id: row.id,
        date: row.entry_date,
        type: row.type,
        amount: Number(row.amount),
        category: row.category_name,
        note: row.note || ''
    };
}

function mapProduct(row) {
    return {
        id: row.id,
        name: row.name,
        costPrice: Number(row.cost_price),
        salePrice: Number(row.sale_price),
        stock: Number(row.stock_quantity),
        unitProfit: row.unit_profit === undefined ? undefined : Number(row.unit_profit),
        stockCostValue: row.stock_cost_value === undefined ? undefined : Number(row.stock_cost_value),
        stockRevenueValue: row.stock_revenue_value === undefined ? undefined : Number(row.stock_revenue_value),
        stockProfitValue: row.stock_profit_value === undefined ? undefined : Number(row.stock_profit_value),
        grossMarginPercent: row.gross_margin_percent === undefined ? undefined : Number(row.gross_margin_percent),
        markupPercent: row.markup_percent === undefined || row.markup_percent === null ? null : Number(row.markup_percent),
        isOutOfStock: row.is_out_of_stock
    };
}

async function getCurrentUser(req) {
    const requestedUserId = req.headers['x-lunacat-user-id'] || req.query.user_id;

    let query = supabase
        .from(TABLES.users)
        .select('*');

    if (requestedUserId) {
        query = query.eq('id', requestedUserId).maybeSingle();
    } else {
        query = query.order('created_at', { ascending: true }).limit(1).maybeSingle();
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) throw new Error('No lunacat user found');

    return data;
}

async function ensureCalendars(userId) {
    const rows = DEFAULT_CALENDARS.map((calendar) => ({
        ...calendar,
        user_id: userId
    }));

    const { error } = await supabase
        .from(TABLES.calendars)
        .upsert(rows, { onConflict: 'user_id,key', ignoreDuplicates: true });

    if (error) throw error;
}

async function getCalendarByKey(userId, key) {
    const calendarKey = key || 'work';
    await ensureCalendars(userId);

    const { data, error } = await supabase
        .from(TABLES.calendars)
        .select('*')
        .eq('user_id', userId)
        .eq('key', calendarKey)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(`Calendar '${calendarKey}' not found`);

    return data;
}

async function getOwnedRow(table, userId, id) {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

exports.getMe = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        return ok(res, user);
    } catch (error) {
        return fail(res, error);
    }
};

exports.getCalendars = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        await ensureCalendars(user.id);

        const { data, error } = await supabase
            .from(TABLES.calendars)
            .select('*')
            .eq('user_id', user.id)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return ok(res, data);
    } catch (error) {
        return fail(res, error);
    }
};

exports.getEvents = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        await ensureCalendars(user.id);

        let query = supabase
            .from(TABLES.events)
            .select('*, lunacat_calendars(key)')
            .eq('user_id', user.id)
            .order('event_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (req.query.start_date) query = query.gte('event_date', req.query.start_date);
        if (req.query.end_date) query = query.lte('event_date', req.query.end_date);

        const { data, error } = await query;
        if (error) throw error;

        return ok(res, data.map(mapEvent));
    } catch (error) {
        return fail(res, error);
    }
};

exports.createEvent = async (req, res) => {
    try {
        requireFields(req.body, ['date', 'start', 'end', 'title']);
        if (req.body.start >= req.body.end) return fail(res, 'End time must be later than start time', 400);

        const user = await getCurrentUser(req);
        const calendar = await getCalendarByKey(user.id, req.body.category);

        const row = {
            user_id: user.id,
            calendar_id: calendar.id,
            event_date: req.body.date,
            start_time: req.body.start,
            end_time: req.body.end,
            title: String(req.body.title).trim(),
            note: req.body.note || ''
        };

        const { data, error } = await supabase
            .from(TABLES.events)
            .insert(row)
            .select('*, lunacat_calendars(key)')
            .single();

        if (error) throw error;
        return ok(res, mapEvent(data), 201);
    } catch (error) {
        return fail(res, error);
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const existing = await getOwnedRow(TABLES.events, user.id, req.params.id);
        if (!existing) return fail(res, `Event '${req.params.id}' not found`, 404);

        const patch = { updated_at: new Date().toISOString() };
        if (req.body.date !== undefined) patch.event_date = req.body.date;
        if (req.body.start !== undefined) patch.start_time = req.body.start;
        if (req.body.end !== undefined) patch.end_time = req.body.end;
        if (req.body.title !== undefined) patch.title = String(req.body.title).trim();
        if (req.body.note !== undefined) patch.note = req.body.note || '';
        if (req.body.category !== undefined) {
            const calendar = await getCalendarByKey(user.id, req.body.category);
            patch.calendar_id = calendar.id;
        }

        const nextStart = patch.start_time || existing.start_time;
        const nextEnd = patch.end_time || existing.end_time;
        if (String(nextStart).slice(0, 5) >= String(nextEnd).slice(0, 5)) {
            return fail(res, 'End time must be later than start time', 400);
        }

        const { data, error } = await supabase
            .from(TABLES.events)
            .update(patch)
            .eq('user_id', user.id)
            .eq('id', req.params.id)
            .select('*, lunacat_calendars(key)')
            .single();

        if (error) throw error;
        return ok(res, mapEvent(data));
    } catch (error) {
        return fail(res, error);
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const { data, error } = await supabase
            .from(TABLES.events)
            .delete()
            .eq('user_id', user.id)
            .eq('id', req.params.id)
            .select('*');

        if (error) throw error;
        if (!data || !data.length) return fail(res, `Event '${req.params.id}' not found`, 404);
        return ok(res, data[0]);
    } catch (error) {
        return fail(res, error);
    }
};

exports.getHolidays = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        let query = supabase
            .from(TABLES.holidays)
            .select('*')
            .eq('user_id', user.id)
            .order('holiday_date', { ascending: true });

        if (req.query.start_date) query = query.gte('holiday_date', req.query.start_date);
        if (req.query.end_date) query = query.lte('holiday_date', req.query.end_date);

        const { data, error } = await query;
        if (error) throw error;
        return ok(res, data.map(mapHoliday));
    } catch (error) {
        return fail(res, error);
    }
};

exports.replaceHolidays = async (req, res) => {
    try {
        const { start_date, end_date, holidays } = req.body;
        requireFields(req.body, ['start_date', 'end_date', 'holidays']);
        if (!Array.isArray(holidays)) return fail(res, 'holidays must be an array', 400);

        const user = await getCurrentUser(req);

        const { error: deleteError } = await supabase
            .from(TABLES.holidays)
            .delete()
            .eq('user_id', user.id)
            .gte('holiday_date', start_date)
            .lte('holiday_date', end_date);

        if (deleteError) throw deleteError;

        if (!holidays.length) return ok(res, []);

        const rows = holidays.map((holiday) => ({
            user_id: user.id,
            holiday_date: holiday.date,
            title: holiday.title || 'Holiday'
        }));

        const { data, error } = await supabase
            .from(TABLES.holidays)
            .insert(rows)
            .select('*')
            .order('holiday_date', { ascending: true });

        if (error) throw error;
        return ok(res, data.map(mapHoliday));
    } catch (error) {
        return fail(res, error);
    }
};

exports.getMoneyEntries = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        let query = supabase
            .from(TABLES.moneyEntries)
            .select('*')
            .eq('user_id', user.id)
            .order('entry_date', { ascending: true })
            .order('created_at', { ascending: true });

        if (req.query.start_date) query = query.gte('entry_date', req.query.start_date);
        if (req.query.end_date) query = query.lte('entry_date', req.query.end_date);

        const { data, error } = await query;
        if (error) throw error;
        return ok(res, data.map(mapMoneyEntry));
    } catch (error) {
        return fail(res, error);
    }
};

exports.createMoneyEntry = async (req, res) => {
    try {
        requireFields(req.body, ['date', 'type', 'amount', 'category']);
        const amount = normalizeMoney(req.body.amount);
        if (!['income', 'expense'].includes(req.body.type)) return fail(res, 'type must be income or expense', 400);
        if (!Number.isFinite(amount) || amount <= 0) return fail(res, 'amount must be more than 0', 400);

        const user = await getCurrentUser(req);
        const row = {
            user_id: user.id,
            entry_date: req.body.date,
            type: req.body.type,
            amount,
            category_name: String(req.body.category).trim(),
            note: req.body.note || ''
        };

        const { data, error } = await supabase
            .from(TABLES.moneyEntries)
            .insert(row)
            .select('*')
            .single();

        if (error) throw error;
        return ok(res, mapMoneyEntry(data), 201);
    } catch (error) {
        return fail(res, error);
    }
};

exports.updateMoneyEntry = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const existing = await getOwnedRow(TABLES.moneyEntries, user.id, req.params.id);
        if (!existing) return fail(res, `Money entry '${req.params.id}' not found`, 404);

        const patch = { updated_at: new Date().toISOString() };
        if (req.body.date !== undefined) patch.entry_date = req.body.date;
        if (req.body.type !== undefined) {
            if (!['income', 'expense'].includes(req.body.type)) return fail(res, 'type must be income or expense', 400);
            patch.type = req.body.type;
        }
        if (req.body.amount !== undefined) {
            const amount = normalizeMoney(req.body.amount);
            if (!Number.isFinite(amount) || amount <= 0) return fail(res, 'amount must be more than 0', 400);
            patch.amount = amount;
        }
        if (req.body.category !== undefined) patch.category_name = String(req.body.category).trim();
        if (req.body.note !== undefined) patch.note = req.body.note || '';

        const { data, error } = await supabase
            .from(TABLES.moneyEntries)
            .update(patch)
            .eq('user_id', user.id)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) throw error;
        return ok(res, mapMoneyEntry(data));
    } catch (error) {
        return fail(res, error);
    }
};

exports.deleteMoneyEntry = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const { data, error } = await supabase
            .from(TABLES.moneyEntries)
            .delete()
            .eq('user_id', user.id)
            .eq('id', req.params.id)
            .select('*');

        if (error) throw error;
        if (!data || !data.length) return fail(res, `Money entry '${req.params.id}' not found`, 404);
        return ok(res, mapMoneyEntry(data[0]));
    } catch (error) {
        return fail(res, error);
    }
};

exports.getProducts = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const { data, error } = await supabase
            .from(TABLES.productOverview)
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) throw error;
        return ok(res, data.map(mapProduct));
    } catch (error) {
        return fail(res, error);
    }
};

exports.createProduct = async (req, res) => {
    try {
        requireFields(req.body, ['name', 'salePrice']);
        const costPrice = normalizeMoney(req.body.costPrice || 0);
        const salePrice = normalizeMoney(req.body.salePrice);
        const stock = Number(req.body.stock || 0);
        if (!Number.isFinite(costPrice) || costPrice < 0) return fail(res, 'costPrice must be 0 or more', 400);
        if (!Number.isFinite(salePrice) || salePrice <= 0) return fail(res, 'salePrice must be more than 0', 400);
        if (!Number.isInteger(stock) || stock < 0) return fail(res, 'stock must be 0 or more', 400);

        const user = await getCurrentUser(req);
        const { data, error } = await supabase
            .from(TABLES.products)
            .insert({
                user_id: user.id,
                name: String(req.body.name).trim(),
                cost_price: costPrice,
                sale_price: salePrice,
                stock_quantity: stock
            })
            .select('*')
            .single();

        if (error) throw error;

        if (stock > 0) {
            await supabase.from(TABLES.stockMovements).insert({
                user_id: user.id,
                product_id: data.id,
                movement_type: 'initial',
                quantity_delta: stock,
                unit_cost: costPrice,
                unit_sale_price: salePrice,
                note: 'Initial stock'
            });
        }

        return ok(res, mapProduct(data), 201);
    } catch (error) {
        return fail(res, error);
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const existing = await getOwnedRow(TABLES.products, user.id, req.params.id);
        if (!existing) return fail(res, `Product '${req.params.id}' not found`, 404);

        const patch = { updated_at: new Date().toISOString() };
        if (req.body.name !== undefined) patch.name = String(req.body.name).trim();
        if (req.body.costPrice !== undefined) {
            const costPrice = normalizeMoney(req.body.costPrice);
            if (!Number.isFinite(costPrice) || costPrice < 0) return fail(res, 'costPrice must be 0 or more', 400);
            patch.cost_price = costPrice;
        }
        if (req.body.salePrice !== undefined) {
            const salePrice = normalizeMoney(req.body.salePrice);
            if (!Number.isFinite(salePrice) || salePrice <= 0) return fail(res, 'salePrice must be more than 0', 400);
            patch.sale_price = salePrice;
        }
        if (req.body.stock !== undefined) {
            const stock = Number(req.body.stock);
            if (!Number.isInteger(stock) || stock < 0) return fail(res, 'stock must be 0 or more', 400);
            patch.stock_quantity = stock;
        }

        const { data, error } = await supabase
            .from(TABLES.products)
            .update(patch)
            .eq('user_id', user.id)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) throw error;

        if (patch.stock_quantity !== undefined && patch.stock_quantity !== existing.stock_quantity) {
            await supabase.from(TABLES.stockMovements).insert({
                user_id: user.id,
                product_id: data.id,
                movement_type: 'adjust',
                quantity_delta: patch.stock_quantity - existing.stock_quantity,
                unit_cost: patch.cost_price ?? data.cost_price,
                unit_sale_price: patch.sale_price ?? data.sale_price,
                note: 'Stock adjusted from product edit'
            });
        }

        return ok(res, mapProduct(data));
    } catch (error) {
        return fail(res, error);
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const { data, error } = await supabase
            .from(TABLES.products)
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('id', req.params.id)
            .select('*');

        if (error) throw error;
        if (!data || !data.length) return fail(res, `Product '${req.params.id}' not found`, 404);
        return ok(res, mapProduct(data[0]));
    } catch (error) {
        return fail(res, error);
    }
};

exports.getProductStockMovements = async (req, res) => {
    try {
        const user = await getCurrentUser(req);
        const { data, error } = await supabase
            .from(TABLES.stockMovements)
            .select('*')
            .eq('user_id', user.id)
            .eq('product_id', req.params.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return ok(res, data);
    } catch (error) {
        return fail(res, error);
    }
};
