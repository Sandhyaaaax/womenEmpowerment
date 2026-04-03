const express = require('express');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Temporary in-memory OTP storage (phone => { otp, timestamp })
const otps = {};

// Optional credentials (would normally be in .env)
const TWILIO_SID = process.env.TWILIO_SID || 'mock_sid';
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || 'mock_token';
const TWILIO_PHONE = process.env.TWILIO_PHONE || '+1234567890';
const twilioClient = TWILIO_SID !== 'mock_sid' ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

// Use Ethereal for testing Email automatically
let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log(`✉️ Automated Nodemailer Ethereal Testing Server is Ready.`);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from the current directory
const publicDir = __dirname;
app.use(express.static(publicDir));

// --- API Routes ---

// 1. Chatbot Endpoint Placeholder
app.post('/api/chat', async (req, res) => {
    try {
        const { message, language } = req.body;
        // In the future, integrate with @google/genai or Google AI Studio here
        console.log(`Received message in ${language || 'en'}: ${message}`);
        
        // Placeholder response
        res.json({
            success: true,
            reply: `You said: "${message}". AI integration is pending.`
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// 2. Authentication
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !email.endsWith('@gmail.com')) {
        return res.status(400).json({ success: false, message: 'Only @gmail.com accounts are permitted.' });
    }
    // Simulate successful registration
    res.json({ success: true, message: 'Signup successful! Redirecting to security checks.' });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !email.endsWith('@gmail.com')) {
        return res.status(400).json({ success: false, message: 'Invalid email provider. Must be @gmail.com' });
    }
    // Simulate successful login
    res.json({ success: true, message: 'Login successful (stub)' });
});

// 3. Security Mock Endpoints
app.post('/api/auth/face-check', (req, res) => {
    // In a real scenario, an image would be passed and processed by an ML model (e.g. AWS Rekognition, Google Cloud Vision)
    // to verify liveness and gender. We simulate success here.
    const isFemale = true; // Simulated result
    if (isFemale) {
        res.json({ success: true, message: 'Female verified! Identity confirmed.' });
    } else {
        res.status(403).json({ success: false, message: 'Authentication failed. Account restricted to women.' });
    }
});

app.post('/api/auth/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required.' });

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otps[phone] = { otp: code, exp: Date.now() + 5 * 60 * 1000 };

    console.log(`\n🔔 [MOCK SMS] To ${phone}: Your SafePing OTP is ${code}\n`);

    if (twilioClient) {
        try {
            await twilioClient.messages.create({
                body: `Your SafePing OTP is ${code}. It expires in 5 minutes.`,
                from: TWILIO_PHONE,
                to: phone
            });
        } catch (e) {
            console.error('Twilio Error:', e.message);
        }
    }
    
    // In prototyping, we pretend it worked successfully even if Twilio isn't set up.
    // If you're looking at the termial running this, you'll see the [MOCK SMS] printed out!
    res.json({ success: true, message: 'OTP Sent successfully.', mockOtp: code });
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, otp, email } = req.body;
    console.log(`[VERIFY-OTP] Received phone: "${phone}", otp: "${otp}", email: "${email}"`);
    console.log(`[VERIFY-OTP] Current OTPs dictionary keys:`, Object.keys(otps));
    if (otps[phone]) console.log(`[VERIFY-OTP] Expected OTP object for this phone is:`, otps[phone]);

    if (!otp || otp.length < 6) return res.status(400).json({ success: false, message: 'Invalid OTP format.' });
    if (!otps[phone] || otps[phone].otp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    if (Date.now() > otps[phone].exp) {
        delete otps[phone];
        return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    // OTP Correct! Delete it
    delete otps[phone];

    // Trigger Success Email if email is provided
    let emailPreview = null;
    if (email) {
        if (transporter) {
            try {
                let info = await transporter.sendMail({
                    from: `"SafePing" <safeping@ethereal.email>`,
                    to: email,
                    subject: 'Welcome to SafePing — Verification Complete!',
                    text: 'Your identity and mobile number have been successfully verified. Your SafePing account is active and protecting you.',
                    html: `<h3>Welcome to SafePing!</h3><p>Your identity and mobile number have been successfully verified. Your account is active and protecting you.</p>`
                });
                console.log(`\n📧 [EMAIL DISPATCHED] To ${email}`);
                emailPreview = nodemailer.getTestMessageUrl(info);
                console.log(`🔗 Preview your actual sent email here: ${emailPreview}\n`);
            } catch (e) {
                console.error('Nodemailer Error:', e.message);
            }
        }
    }

    res.json({ success: true, message: 'Verification fully completed.', emailPreview });
});

// For any other route, send back index.html (SPA Fallback or generic routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// GET /api/profile?email=...
router.get('/', profileController.getProfile);

// PUT /api/profile
router.put('/', profileController.updateProfile);

module.exports = router;


// Start Server
app.listen(PORT, () => {
    console.log(`🚀 SafePing server running on http://localhost:${PORT}`);
});
