const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const STRAPI_URL = process.env.STRAPI_URL; // e.g. https://cms.example.com
const COOKIE_NAME = process.env.COOKIE_NAME || "preview_jwt";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const PORT = process.env.PORT || 3001;

if (!STRAPI_URL) {
  console.error("STRAPI_URL env var is required");
  process.exit(1);
}

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static assets (CSS, JS) under /auth so they don't collide with site routes
app.use("/auth", express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// GET /verify — called by Caddy forward_auth
//   200 → allow request through
//   401 → Caddy redirects to login
// ---------------------------------------------------------------------------
app.get("/verify", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).send("no token");

  try {
    const r = await fetch(`${STRAPI_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(401).send("invalid token");
    return res.status(200).send("ok");
  } catch {
    return res.status(401).send("error");
  }
});

// ---------------------------------------------------------------------------
// GET /login — serve the login page
// ---------------------------------------------------------------------------
app.get("/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ---------------------------------------------------------------------------
// POST /login — authenticate against Strapi, set JWT cookie
// ---------------------------------------------------------------------------
app.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.redirect("/login?error=1");
  }

  try {
    const r = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    if (!r.ok) return res.redirect("/login?error=1");

    const body = await r.json();
    const jwt = body.jwt;
    if (!jwt) return res.redirect("/login?error=1");

    res.cookie(COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_MS,
      path: "/",
    });

    // Redirect to the page originally requested (or /)
    const dest = req.query.redirect || "/";
    return res.redirect(dest);
  } catch {
    return res.redirect("/login?error=1");
  }
});

// ---------------------------------------------------------------------------
// GET /logout — clear cookie and redirect to login
// ---------------------------------------------------------------------------
app.get("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.redirect("/login");
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`forward-auth listening on :${PORT}`);
});
