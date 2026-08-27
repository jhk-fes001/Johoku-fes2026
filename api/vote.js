const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { projectId, deviceId } = req.body || {};

        if (!projectId || !deviceId) {
            return res.status(400).json({ error: 'projectId と deviceId は必須です' });
        }

        const salt = process.env.VOTE_DEVICE_SALT || 'default_johoku_salt_2026';
        const deviceHash = crypto
            .createHash('sha256')
            .update(`${deviceId}_${salt}`)
            .digest('hex');

        const { data, error } = await supabase
            .from('votes')
            .insert([{ project_id: projectId, device_hash: deviceHash }]);

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ 
                    success: false, 
                    error: 'already_voted',
                    message: 'この企画には既に投票済みです（1企画につき1票まで）' 
                });
            }
            console.error('Supabase insert error:', error);
            return res.status(500).json({ success: false, error: 'Database Error' });
        }

        return res.status(200).json({ 
            success: true, 
            message: '投票が完了しました！' 
        });

    } catch (err) {
        console.error('Vote API error:', err);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
