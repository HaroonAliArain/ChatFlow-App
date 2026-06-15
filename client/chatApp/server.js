import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback — serve index.html for ALL routes that don't match a static file
// This is what makes /chat, /profile, /login etc. work on page refresh
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
