import cookieParser from "cookie-parser";
import express from "express";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import citasRoutes from "./routes/citas.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import pacientesRoutes from "./routes/pacientes.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import cors from "cors";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "https://clinicafrontend-kappa.vercel.app",
  "https://clinica-frontend-rosy-six.vercel.app",
  "https://clinica-frontend-git-main-joaquin-rojas-projects.vercel.app",
];

const isAllowedVercelPreview = (origin) =>
  /^https:\/\/clinica-frontend-[a-z0-9-]+\.vercel\.app$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || isAllowedVercelPreview(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/pacientes", pacientesRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || "3000";

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
