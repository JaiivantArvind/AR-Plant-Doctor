const app = require('./src/app');
const config = require('./src/config');
const storageService = require('./src/services/storageService');
const markerService = require('./src/services/markerService');

function bootstrap() {
    try {
        console.log('AR Plant Doctor: Checking database and pattern markers...');
        const plants = storageService.getPlants();
        markerService.reconcileMissingMarkers(plants);
    } catch (err) {
        console.error('AR Plant Doctor: Startup reconciliation error:', err);
    }

    app.listen(config.PORT, () => {
        console.log('============================================================');
        console.log('       🌿 AR Plant Doctor Server Successfully Started');
        console.log('============================================================');
        console.log(`  Local AR Camera:   http://localhost:${config.PORT}`);
        console.log(`  Care Dashboard:    http://localhost:${config.PORT}/dashboard`);
        console.log(`  Environment:       ${process.env.NODE_ENV || 'development'}`);
        console.log('============================================================\n');
    });
}

bootstrap();
