const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const token = req.query.token || req.headers['authorization'];
        const adminToken = process.env.ADMIN_RESULTS_TOKEN || 'Johoku2026Admin';

        if (token !== adminToken) {
            return res.status(401).json({ error: '認証に失敗しました' });
        }

        const { data: projects, error: pErr } = await supabase
            .from('projects')
            .select('id, group_name, title, kind, type, award_categories, display_order')
            .order('display_order', { ascending: true });

        if (pErr) throw pErr;

        const { data: votes, error: vErr } = await supabase
            .from('votes')
            .select('project_id');

        if (vErr) throw vErr;

        const voteCounts = {};
        votes.forEach(v => {
            voteCounts[v.project_id] = (voteCounts[v.project_id] || 0) + 1;
        });

        const fullResults = projects.map(p => ({
            id: p.id,
            group_name: p.group_name,
            title: p.title,
            kind: p.kind,
            type: p.type,
            award_categories: p.award_categories,
            votes: voteCounts[p.id] || 0
        }));

        const ranking = {
            total_votes: votes.length,
            overall: [...fullResults].sort((a, b) => b.votes - a.votes),
            class: fullResults.filter(p => p.award_categories.includes('class')).sort((a, b) => b.votes - a.votes),
            exhibition: fullResults.filter(p => p.award_categories.includes('exhibition')).sort((a, b) => b.votes - a.votes),
            performance: fullResults.filter(p => p.award_categories.includes('performance')).sort((a, b) => b.votes - a.votes)
        };

        return res.status(200).json({ success: true, ranking });

    } catch (err) {
        console.error('Results API error:', err);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
