const express = require('express');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Temporary in-memory stores
const otps = {};
const users = {}; // Store mock user profiles: email => { name, email, password }

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

// 1. Chatbot Endpoint using Groq
app.post('/api/chat', async (req, res) => {
    try {
        require('dotenv').config({ override: true }); // Ensure latest .env is loaded
        const { messages, lang } = req.body;
        
        if (!messages || messages.length === 0) {
            return res.status(400).json({ success: false, error: 'No messages provided.' });
        }
        
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ success: false, error: 'Missing Groq API Key', reply: "Whoops! The API key is missing. Please add GROQ_API_KEY to your .env file." });
        }
        
        const systemInstruction = `You are Aria, a warm, compassionate AI companion for HerShield. You help users with:
- Setting up emergency check-in timers
- Adding emergency contacts
- Understanding HerShield features
- Personal safety tips
- Emotional support in distressing situations

CRITICAL LANGUAGE RULE: Always respond in the EXACT SAME LANGUAGE as the user (e.g., if code is ${lang}, respond in that language). If they write in Hindi, respond in Hindi.

For emergency situations:
- Respond with empathy and urgency
- Remind them to use HerShield's SOS feature
- Suggest calling local emergency services
- Stay calm and supportive

Keep responses concise, warm, and helpful. Use occasional emojis.`;

        // Format for Groq Chat Completions
        const groqMessages = [
            { role: "system", content: systemInstruction },
            ...messages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }))
        ];

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: groqMessages,
                max_tokens: 350
            })
        });

        if (!groqResponse.ok) {
             const errData = await groqResponse.text();
             console.error("Groq API Error:", errData);
             throw new Error("Groq API Request Failed");
        }

        const data = await groqResponse.json();
        const reply = data.choices[0].message.content;
        
        res.json({
            success: true,
            reply: reply
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error', reply: "I'm having trouble connecting to my brain right now. Please try again or use the quick access buttons if you need immediate help." });
    }
});

// 2. Authentication
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !email.endsWith('@gmail.com')) {
        return res.status(400).json({ success: false, message: 'Only @gmail.com accounts are permitted.' });
    }
    
    users[email] = { name, email, password };
    
    // Simulate successful registration
    res.json({ success: true, message: 'Signup successful! Redirecting to security checks.' });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !email.endsWith('@gmail.com')) {
        return res.status(400).json({ success: false, message: 'Invalid email provider. Must be @gmail.com' });
    }
    if (!users[email] || users[email].password !== password) {
        // We will allow login even if user not in memory to support prototyping without persisting DB
        // But let's create a default mock user for them if not found
        users[email] = { name: email.split('@')[0], email, password };
    }
    // Simulate successful login
    res.json({ success: true, message: 'Login successful' });
});

// 3. Security Mock Endpoints
app.post('/api/auth/face-check', (req, res) => {
    // In a real scenario, an image would be passed and processed by an ML model.
    // Since frontend handles liveness/gender logic natively, this validates the session.
    const { email } = req.body;
    const user = users[email] || { name: 'Verified HerShield', email };
    res.json({ success: true, message: 'Verified!', user });
});

app.post('/api/profile', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = users[email] || { name: email.split('@')[0] || 'User', email };
    res.json({ success: true, user });
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

// const profileController = require('../controllers/profileController');

// // GET /api/profile?email=...
// app.get('/', profileController.getProfile);

// // PUT /api/profile
// app.put('/', profileController.updateProfile);

// module.exports = app;


// Start Server
app.listen(PORT, () => {
    console.log(`🚀 SafePing server running on http://localhost:${PORT}`);
});
