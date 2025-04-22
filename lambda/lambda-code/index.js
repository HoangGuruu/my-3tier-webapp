
const { Client } = require('pg');
const AWS = require('aws-sdk');

exports.handler = async (event, context) => {
    try {
        const dbHost = process.env.DB_HOST;
        const dbName = process.env.DB_NAME;
        const dbUser = process.env.DB_USER;
        const dbPassword = process.env.DB_PASSWORD;

        const client = new Client({
            host: dbHost,
            database: dbName,
            user: dbUser,
            password: dbPassword,
            ssl: {
                rejectUnauthorized: false
            }
        });

        await client.connect();

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL
          )
        `);

        // Handle POST request
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { name, email } = body;

            if (!name || !email) {
                return {
                    statusCode: 400,
                    headers: corsHeaders(),
                    body: JSON.stringify({ message: "Missing name or email" })
                };
            }

            const insertQuery = 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *';
            const insertResult = await client.query(insertQuery, [name, email]);

            await client.end();

            return {
                statusCode: 201,
                headers: corsHeaders(),
                body: JSON.stringify({
                    message: 'User created successfully',
                    data: insertResult.rows[0]
                })
            };
        }

        // Default to GET users
        const result = await client.query('SELECT * FROM users LIMIT 10');
        await client.end();

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Data retrieved successfully',
                data: result.rows
            })
        };

    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                message: 'Using mock data due to database error',
                data: [
                    { id: 1, name: 'User 1', email: 'user1@example.com' },
                    { id: 2, name: 'User 2', email: 'user2@example.com' },
                    { id: 3, name: 'User 3', email: 'user3@example.com' }
                ]
            })
        };
    }
};

// Helper: standard CORS headers
function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

