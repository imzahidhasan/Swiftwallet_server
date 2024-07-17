// index.js
const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

app.get("/", async (req, res) => {
  res.send("server is running...");
});

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.ek5qasv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("swiftwallet").collection("users");

    app.post("/register", async (req, res) => {
      const { email, phone, name, pin } = req.body;

      if (!email) {
        res.send({ message: "email is required" });
        return;
      }

      if (email) {
        const result = await userCollection.findOne({ email });
        if (result) {
          res.send({ isExist: true, message: "user already exist" });
          return;
        }
      }

      const hashedPin = bcrypt.hashSync(pin, 10);
      const newUser = {
        name,
        email,
        phone,
        pin: hashedPin,
        status: "pending",
        balance: 0,
      };

      const result = await userCollection.insertOne(newUser);
      const token = jwt.sign({ email, phone }, process.env.JWT_SECRET, {
        expiresIn: "2h",
      });
      res.send({ result, token });
    });

    app.post("/checkUser", async (req, res) => {
      const { email, pin } = req.body;

      if (email) {
        const user = await userCollection.findOne({ email });

        if (!user) {
          res.send({ notFound: true, message: "user not available" });
          return
        }

        if (user) {
          const isValid = bcrypt.compareSync(pin, user.pin);
          if (isValid) {
            const token = jwt.sign(
              { email: user.email, phone: user.phone },
              process.env.JWT_SECRET,
              {
                expiresIn: "2h",
              }
            );
            res.send({ ...user, token });
          } else {
            res.send({ message: "pin number is incorrect" });
          }
        }
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
