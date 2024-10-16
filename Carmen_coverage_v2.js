const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;
const NodeCache = require("node-cache");

// Cache setup to avoid repeated queries and optimize CPU usage.
const cache = new NodeCache({ stdTTL: 600 });

// PostgreSQL connection pool (optimized for re-use to reduce CPU/memory overhead).
const pool = new Pool({
    user: 'your_db_user',
    host: 'your_db_host',
    database: 'your_db_name',
    password: 'your_db_password',
    port: 5432,
});

// Middleware for parsing JSON requests.
app.use(express.json());

// POST route to check coverage
app.post('/check-coverage', async (req, res) => {
    const { latitude, longitude, address } = req.body;
    const cacheKey = `${latitude},${longitude},${address}`;

    // Use cached response if available, reducing query load and CPU usage.
    if (cache.has(cacheKey)) {
        return res.json(cache.get(cacheKey));
    }

    try {
        // Query to check coverage from the coverage table and fetch products with the lowest price
        const query = `
            SELECT c.provider, c.product, c.status, p.price
            FROM coverage_table c
            JOIN product_table p ON c.product = p.product_name
            WHERE ST_Contains(c.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
            AND c.address = $3
            AND c.status = 'live'
            ORDER BY p.price ASC; -- Sorting by price to get the cheapest product
        `;
        const values = [longitude, latitude, address];
        const result = await pool.query(query, values);

        // If coverage exists, filter live status and return only the cheapest price for each provider
        if (result.rows.length > 0) {
            const providers = {};

            // Group products by provider, selecting the cheapest product per provider
            result.rows.forEach(row => {
                if (!providers[row.provider] || row.price < providers[row.provider].price) {
                    providers[row.provider] = {
                        product: row.product,
                        price: row.price,
                        status: row.status
                    };
                }
            });

            // Constructing response with the list of providers and their cheapest product
            const response = {
                message: 'Yes, this address is covered.',
                address,
                providers: Object.entries(providers).map(([provider, details]) => ({
                    provider,
                    product: details.product,
                    price: details.price,
                    status: details.status
                })),
            };

            // Cache the response to reduce subsequent query load
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
