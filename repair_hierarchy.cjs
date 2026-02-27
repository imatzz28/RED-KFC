
const SUPABASE_URL = 'https://kljmajrsrndjcoxlobnp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsam1hanJzcm5kamNveGxvYm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTE4NjcsImV4cCI6MjA4NzcyNzg2N30.EDB2XaTFL3ZypjIVw5IkwKTiZ9k3drEc_yZaU9zI_PY';

async function repairHierarchy() {
    console.log('Fetching restaurants...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    if (!res.ok) {
        console.error('Error fetching restaurants:', await res.text());
        return;
    }

    const restaurants = await res.json();
    console.log(`Found ${restaurants.length} restaurants.`);

    const regionMap = new Map();

    restaurants.forEach(r => {
        const regionName = r.region || 'Sin Region';
        const zoneName = r.zone || 'Sin Zona';
        const storeId = r.id;

        if (!regionMap.has(regionName)) regionMap.set(regionName, new Map());
        const zonesMap = regionMap.get(regionName);

        if (!zonesMap.has(zoneName)) zonesMap.set(zoneName, new Set());
        zonesMap.get(zoneName).add(storeId);
    });

    const hierarchyData = {
        lockedMonths: ["2026-02"], // Manteniendo el mes bloqueado que vimos antes
        regions: Array.from(regionMap.entries()).map(([regionName, zonesMap]) => ({
            name: regionName,
            zones: Array.from(zonesMap.entries()).map(([zoneName, storeIds]) => ({
                name: zoneName,
                restaurantIds: Array.from(storeIds)
            }))
        }))
    };

    console.log('Updating hierarchy in Supabase...');
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/hierarchy?on_conflict=id`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ id: 1, data: hierarchyData })
    });

    if (updateRes.ok) {
        console.log('✅ Hierarchy repaired successfully.');
        console.log(JSON.stringify(hierarchyData, null, 2));
    } else {
        console.error('❌ Error updating hierarchy:', await updateRes.text());
    }
}

repairHierarchy();
