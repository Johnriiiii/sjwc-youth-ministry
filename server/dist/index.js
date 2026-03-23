import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
const start = async () => {
    await connectDb();
    app.listen(env.port, () => {
        console.log(`Server running on http://localhost:${env.port}`);
    });
};
start().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
});
