const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const saltRounds = 10;
const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"], // adjust if frontend runs elsewhere
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    key: "userId",
    secret: "subscribe",
    resave: false,
    saveUninitialized: false,
    cookie: { expires: 60 * 60 * 24 }, // 1 day
  })
);

// DB connection
const db = mysql.createConnection({
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "1707",
  database: "flightauth",
});

// Connect to DB
db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database.");
});

// JWT verification middleware
const verifyJWT = (req, res, next) => {
  const token = req.headers["x-access-token"];
  if (!token) return res.status(401).json({ auth: false, message: "No token provided" });

  jwt.verify(token, "jwtBalaji", (err, decoded) => {
    if (err) return res.status(401).json({ auth: false, message: "Failed to authenticate" });
    req.username = decoded.sub;
    next();
  });
};

// Register route
app.post("/register", (req, res) => {
  const { fullname, username, email, password } = req.body;
  const role = "USER"; // default role

  // Hash password
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) return res.status(500).json({ error: "Password hashing failed" });

    // Use db.query to insert into MySQL
    const query = "INSERT INTO users (fullname, username, email, password, role) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [fullname, username, email, hash, role], (err, result) => {
      if (err) {
        console.error("Error inserting user:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Return the registered user (without password)
      res.status(201).json({
        user: {
          id: result.insertId,
          fullname,
          username,
          email,
          role
        }
      });

      console.log("User added with username:", username);
    });
  });
});


// Update user
app.put("/update", (req, res) => {
  const { oldUsername, fullname, email } = req.body;
  const query = "UPDATE users SET fullname = ?, email = ? WHERE username = ?";
  db.query(query, [fullname, email, oldUsername], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "User updated successfully", result });
  });
});

// Check authentication
app.get("/isUserAuth", verifyJWT, (req, res) => {
  res.json({ auth: true, message: "You are an authenticated person", user: req.username });
});

// Get session login status
app.get("/login", (req, res) => {
  if (req.session.user) res.json({ loggedIn: true, user: req.session.user });
  else res.json({ loggedIn: false });
});

// Get user by username or email
app.post("/user", (req, res) => {
  const { username, email } = req.body;
  const query = "SELECT * FROM users WHERE username = ? OR email = ?";
  db.query(query, [username, email], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ result });
  });
});

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM users WHERE username = ?";

  db.query(query, [username], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!result || result.length === 0) return res.json({ auth: false, message: "User doesn't exist" });

    bcrypt.compare(password, result[0].password, (error, isMatch) => {
      if (error) return res.status(500).json({ error: "Password compare failed" });

      if (isMatch) {
        const token = jwt.sign({ sub: result[0].username }, "jwtBalaji", { expiresIn: "1h" });
        req.session.user = result[0];
        res.json({ auth: true, token, user: result[0] });
      } else {
        res.json({ auth: false, message: "Wrong username/password combination" });
      }
    });
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth Server is Running on port ${PORT}`);
});
