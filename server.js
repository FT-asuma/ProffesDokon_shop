const express = require("express");
const session = require("express-session");
const path = require("path");
const customerRoutes = require("./routes/customer");
const adminRoutes = require("./routes/admin");
const i18n = require("i18n"); // Add i18n require

const app = express();

// Configure i18n
i18n.configure({
  locales: ["en", "ru", "uz"], // Supported languages
  directory: path.join(__dirname, "locales"), // Path to translation files
  defaultLocale: "en",
  objectNotation: true,
  updateFiles: false, // Prevent auto-creating missing translation files
  queryParameter: "lang", // Allow language switching via ?lang=ru
});

// Middleware
app.use(i18n.init); // Initialize i18n middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Theme and language middleware
app.use((req, res, next) => {
  req.session.theme = req.session.theme || "light";
  // Set locale from session or query parameter
  if (req.query.lang && ["en", "ru", "uz"].includes(req.query.lang)) {
    req.session.lang = req.query.lang;
  }
  res.locals.lang = req.session.lang || i18n.getLocale(req) || "en";
  next();
});

// Routes
app.use("/", customerRoutes);
app.use("/admin", adminRoutes);

app.post("/theme", (req, res) => {
  req.session.theme = req.body.theme || "light";
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});