import cookieParser from "cookie-parser";
import express from "express";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || "3000";

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
