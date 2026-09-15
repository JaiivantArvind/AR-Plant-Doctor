# AR Plant Doctor

## Project Overview
AR Plant Doctor is a web-based Augmented Reality application designed to assist users with plant care and health diagnosis directly in their mobile browser. By scanning AR barcode markers placed on or near houseplants, users can view real-time care instructions, watering schedules, and environmental tips rendered directly over their plants.

## Tech Stack
- **HTML5 & CSS3**: Core application structure, reset styling, and loading screen animations
- **JavaScript (ES6+)**: Dynamic data fetching, date math for watering calculations, and AR event tracking
- **A-Frame 1.4.0**: 3D and WebXR framework for rendering spatial overlays and text entities
- **AR.js**: Lightweight AR library for camera feed processing and barcode marker recognition

## How to Run Locally
1. Start a local static file server from the project root:
   ```bash
   npx serve .
   ```
2. Because web camera access requires an HTTPS context on mobile devices, expose your local port using ngrok:
   ```bash
   ngrok http <port>
   ```
3. Open the generated `https://` URL on your smartphone browser and allow camera permissions when prompted.

## How to Add a New Plant
1. Edit `plants.json` to append a new plant entry keyed by its marker ID string (e.g. `"6"`).
2. Specify the plant attributes (`name`, `scientificName`, `lastWatered`, `wateringIntervalDays`, `sunlight`, `tips`, `emoji`).
3. Print or display the 3x3 matrix barcode marker matching the key value (e.g., Barcode value 6) and place it near your plant.

## How to Deploy
1. Commit all project files to your local repository.
2. Push your changes to the `main` branch:
   ```bash
   git push origin main
   ```
3. The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically trigger and host the updated web app on GitHub Pages.

## Phase 8 Note
An image recognition upgrade is available for markerless plant detection and automated leaf disease classification using machine learning models.
