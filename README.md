# SafePing 🛡️

**Safety That Works Even When You Can't.**

SafePing is a web application designed exclusively for women's safety. It provides real-time proactive journey monitoring, AI distress detection, and silent emergency SOS triggers, ensuring safety and peace of mind without needing manual intervention in a crisis.

## ✨ Core Features

* **Proactive Check-In & Real-Time Tracking**: Set your expected safe duration before heading out. SafePing silently monitors your location in the background and takes automatic actions if no response is detected when the timer ends.
* **AI Distress Detection**: Utilizes on-device ML (with multi-language chatbot integration via `@google/generative-ai`) to measure distress patterns.
* **Exclusive Female-Only Access**: Enforces end-to-end security through biometric Face-Only Authentication logic to guarantee no male accounts are permitted.
* **Trusted Contact Alerts**: Automatically dispatches alerts with exact GPS coordinates and movement history via Twilio SMS and Nodemailer if you don't check-in safely.
* **Community Safety Map**: Crowd-sourced safety ratings where users can pinpoint safety insights.
* **Women's Health Hub**: An integrated portal for period tracking, skincare, breast health info, and multilingual well-being chatbots.

## 🛠️ Technology Stack

* **Frontend**: Vanilla HTML5, CSS3 (Modern gradients, glassmorphism), CSS Variables, Google Fonts (DM Sans & Fraunces).
* **Backend**: Node.js & Express.js.
* **Security & Auth**: Firebase Admin, Face verification logic, OTP via SMS/Email.
* **Database**: SQLite3 integration available.
* **Integrations**: Twilio (SMS OTP), Nodemailer (Email verification), `@google/generative-ai` (Wellness Chatbot).

## 🚀 Installation & Setup

1. **Prerequisites**: Make sure you have [Node.js](https://nodejs.org/) installed on your machine.
2. **Clone the Repository / Open Folder**:
   Navigate to the `women empowerment` folder (or where `package.json` resides).

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Environment Variables (.env)**:
   Create a `.env` file in the root directory and add your keys (optional for testing since mocks exist):
   ```env
   PORT=3000
   TWILIO_SID=your_twilio_sid
   TWILIO_TOKEN=your_twilio_token
   TWILIO_PHONE=your_twilio_phone
   ```

5. **Start the Application**:
   Run the backend server using Node.
   ```bash
   npm start
   ```

6. **Usage**:
   Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

## 📁 Repository Structure

* `index.html` - The modern, responsive hero landing page and application overview.
* `login.html`, `security.html`, `navregistration.html` - Frontend flows for secure registration, app navigation, and Face-ID simulation.
* `server.js` - Express backend dealing with routing, Twilio mock OTP setup, Ethereal email dispatch, and API routes.
* `package.json` - Node scripts and backend dependencies.

## 🔒 Privacy & Security First
SafePing is End-To-End Encrypted. We believe in Zero Data Selling. All GPS location handling and background messaging is unreadable by outside parties, including the server administrators.
