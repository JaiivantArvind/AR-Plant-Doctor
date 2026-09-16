# AR Plant Doctor

## Project Overview
AR Plant Doctor is a web-based Augmented Reality application designed to assist users with plant care and health diagnosis directly in their mobile browser. By scanning AR barcode markers placed on or near houseplants, users can view real-time care instructions, watering schedules, and environmental tips rendered directly over their plants.

## Tech Stack
- **HTML5 & CSS3**: Core application structure, reset styling, and loading screen animations
- **JavaScript (ES6+)**: Dynamic data fetching, date math for watering calculations, and AR event tracking
- **Node.js & Express**: Backend API server for persisting plant data and serving the dashboard
- **A-Frame 1.4.0**: 3D and WebXR framework for rendering spatial overlays and text entities
- **AR.js**: Lightweight AR library for camera feed processing and barcode marker recognition
- **Chart.js**: Interactive analytics charting for tracking watering trends
- **Service Workers**: Background notification scheduling for overdue plant alerts

## How to Run the Dashboard

### 8.1 Local Development
Replace `npx serve .` with `node server.js` from now on. The Express server handles everything:
1. `cd C:\Games\Jaiivant\ARVR`
2. `node server.js`
3. Open `http://localhost:3000` on your laptop → AR app
4. Open `http://localhost:3000/dashboard` on your laptop → Dashboard
5. For phone AR testing, still use ngrok: `npx ngrok http 3000`

### 8.2 Workflow
The intended daily workflow once built:
- Open dashboard at `localhost:3000/dashboard` on your laptop
- Tap "Mark Watered" on any plant after you water it — updates `plants.json` instantly
- Scan the AR marker on the pot with your phone — shows updated watering status from the same file
- Check Analytics weekly to see which plants you have been neglecting
- Enable notifications in Settings — browser will alert you when a plant is overdue

## How to Add a New Plant
1. Edit `plants.json` or use the Dashboard UI to add a new plant entry keyed by its marker ID string (e.g. `"6"`).
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
