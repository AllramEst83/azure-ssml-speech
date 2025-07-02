# Azure SSML Speech Synthesizer

This is a simple web application for generating lifelike speech using the Azure Speech Service and SSML (Speech Synthesis Markup Language). The app allows you to customize language, voice, style, pitch, rate, volume, and more, and then play back the synthesized audio in your browser.

## Features

- Enter any text and synthesize speech using Azure's neural voices
- Customize language, voice, style, pitch, rate, volume, emphasis, and role
- Real-time volume control with a slider
- Start and stop audio playback
- Modern, responsive UI (Tailwind CSS)

## Setup

1. **Clone the repository**
2. **Install dependencies** (if any; this project is vanilla JS and does not require a build step)
3. **Configure Azure Speech Service**
   - Copy `config.js.example` to `config.js` (or create your own `config.js`)
   - Add your Azure Speech Service `KEY` and `REGION` to `config.js`
   - **Do not commit your real keys to version control!**
4. **Open `index.html` in your browser**

## File Structure

- `index.html` — Main HTML UI
- `js/app.js` — Main application logic
- `css/style.css` — Custom styles (in addition to Tailwind)
- `config.js` — Your Azure Speech Service credentials (ignored by git)

## Requirements

- Azure Speech Service subscription (get your key and region from the Azure portal)
- Modern web browser

## Security Note

**Never commit your real Azure keys to a public repository.** The `config.js` file is in `.gitignore` by default.

## License

MIT License
