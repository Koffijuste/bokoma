const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("❌ MONGO_URI manquant dans les variables d'environnement");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

async function connectDB() {
  console.log("\n================ MongoDB Debug ================");
  console.log("🕒 Time:", new Date().toISOString());
  console.log("🌍 NODE_ENV:", process.env.NODE_ENV);
  console.log("📦 Mongoose Version:", mongoose.version);
  console.log("🟢 Node Version:", process.version);

  if (cached.conn) {
    console.log("♻️ Utilisation de la connexion MongoDB en cache");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🔍 Tentative de connexion MongoDB...");

    const maskedUri = MONGO_URI.replace(
      /(mongodb(\+srv)?:\/\/[^:]+:)([^@]+)(@)/,
      "$1********$4"
    );

    console.log("🔗 URI:", maskedUri);

    mongoose.connection.on("connecting", () => {
      console.log("📡 Mongoose: connecting...");
    });

    // ✅ Flag pour éviter "No such label 'mongo-connect' for console.timeEnd()"
    //    lors des reconnexions (l'event "connected" peut se déclencher plusieurs fois
    //    si Mongoose perd/retrouve la connexion, mais le timer ne tourne qu'une fois).
    let initialConnectLogged = false;
    console.time("mongo-connect");

    mongoose.connection.on("connected", () => {
      console.log("✅ Mongoose: connected");
      if (!initialConnectLogged) {
        console.timeEnd("mongo-connect");
        initialConnectLogged = true;
      }
    });

    mongoose.connection.on("open", () => {
      console.log("📂 Mongoose: connection open");
    });

    mongoose.connection.on("disconnecting", () => {
      console.log("⚠️ Mongoose: disconnecting");
    });

    mongoose.connection.on("disconnected", () => {
      console.log("❌ Mongoose: disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 Mongoose: reconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("🚨 Mongoose Event Error:");
      console.error(err);
    });

    // Retry logic with exponential backoff to handle transient network issues
    const maxAttempts = 4;
    const baseDelay = 2000; // 2s

    const connectWithRetry = async () => {
      let attempt = 0;
      let lastError = null;

      while (attempt < maxAttempts) {
        try {
          attempt++;
          console.log(`🔁 MongoDB connect attempt ${attempt}/${maxAttempts}`);
          const conn = await mongoose.connect(MONGO_URI, {
            autoIndex: process.env.NODE_ENV !== "production",
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
          });
          return conn;
        } catch (err) {
          lastError = err;
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`⚠️ MongoDB connect failed (attempt ${attempt}): ${err.message}. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      // If all attempts failed, throw the last error
      throw lastError;
    };

    cached.promise = connectWithRetry();
  }

  try {
    cached.conn = await cached.promise;

    console.log("===============================================");
    console.log("🎉 MongoDB connecté avec succès");
    console.log(
      "📚 Database:",
      mongoose.connection.db?.databaseName || "unknown"
    );
    console.log(
      "🏠 Host:",
      mongoose.connection.host || "unknown"
    );
    console.log("===============================================\n");

    return cached.conn;
  } catch (error) {
    console.error("\n===============================================");
    console.error("❌ ÉCHEC DE CONNEXION MONGODB");
    console.error("===============================================");
    console.error("Name:", error?.name);
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Cause:", error?.cause);

    if (error?.reason) {
      console.error("\n📋 Reason:");
      console.error(error.reason);
    }

    if (error?.errors) {
      console.error("\n📋 Nested Errors:");
      console.error(error.errors);
    }

    console.error("\n📋 Stack:");
    console.error(error?.stack);

    console.error("===============================================\n");

    cached.promise = null;
    throw error;
  }
}

module.exports = connectDB;