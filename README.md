# 🌊 OPW Realtime Water Levels - River Level Monitor

A Progressive Web App (PWA) to monitor river levels in Ireland using realtime data from the Office of Public Works (OPW).

**Live App:** [https://water-level-app.vercel.app/](https://water-level-app.vercel.app/)

## 🚀 Features

*   **Realtime Data:** Fetches live water levels from over 400 OPW stations across Ireland.
*   **Safety Alarms:** Set a custom threshold (e.g., 2.5m) for any station. If the water level exceeds this, an audible alarm will sound.
*   **Progressive Web App (PWA):** Installable on mobile and desktop. Works offline (cached UI) and behaves like a native app.
*   **Background Monitoring:** Uses the Wake Lock API to keep the screen on and monitoring active during storms.
*   **Privacy First:** No tracking. All monitored stations and settings are stored locally on your device.

## 🛠️ Tech Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Build Tool:** Vite
*   **API:** [OPW Water Level API](https://waterlevel.ie/)
*   **Deployment:** Vercel (with Serverless Functions for API proxying)

## 📦 Installation (Local Development)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/johnriordan1/river-level-app.git
    cd river-level-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

4.  **Open in browser:**
    Navigate to `http://localhost:5173/`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgements

*   Data provided by the [Office of Public Works (OPW)](https://waterlevel.ie/).
*   Contains Irish Public Sector Data licensed under a [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) licence.
