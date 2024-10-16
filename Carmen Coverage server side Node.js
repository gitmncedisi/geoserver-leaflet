const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 600 });

const pool = new Pool({
    user: 'your_db_user',
    host: 'your_db_host',
    database: 'your_db_name',
    password: 'your_db_password',
    port: 5432,
});

app.use(express.json());

app.post('/check-coverage', async (req, res) => {
    const { latitude, longitude, address } = req.body;
    const cacheKey = `${latitude},${longitude},${address}`;

    if (cache.has(cacheKey)) {
        return res.json(cache.get(cacheKey));
    }

    try {
        const query = `
            SELECT provider, product, status FROM coverage_table
            WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
            AND address = $3;
        `;
        const values = [longitude, latitude, address];
        const result = await pool.query(query, values);

        if (result.rows.length > 0 && result.rows.some(row => row.status === 'live')) {
            const providers = result.rows
                .filter(row => row.status === 'live')
                .map(row => ({ provider: row.provider, product: row.product }));

            const response = {
                message: 'Yes, this address is covered.',
                address,
                providers,
            };
            cache.set(cacheKey, response);
            res.json(response);
        } else {
            const response = { message: 'No, this address is not covered.', address };
            cache.set(cacheKey, response);
            res.json(response);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

async function searchCoverage(lat, lng, address) {
    try {
        const response = await fetch('/check-coverage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng, address })
        });
        const data = await response.json();
        document.getElementById('result').innerText = data.message;

        if (data.message.includes('covered')) {
            map.setView([lat, lng], 13);
            marker.setLatLng([lat, lng]);

            const providersDiv = document.getElementById('providers');
            providersDiv.innerHTML = `<table>
                <thead>
                    <tr><th>Provider</th><th>Product</th></tr>
                </thead>
                <tbody>
                    ${data.providers.map(provider => `
                        <tr><td>${provider.provider}</td><td>${provider.product}</td></tr>
                    `).join('')}
                </tbody>
            </table>`;
        } else {
            document.getElementById('providers').innerHTML = '';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('result').innerText = 'Error checking coverage.';
    }
}



