import request from "supertest";
import app from "../../app.js";

describe("Integración: GET /api", () => {
  test("CI01: responde 200 con estructura correcta", async () => {
    const response = await request(app).get("/api");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "Backend funcionando correctamente",
      })
    );
    expect(response.body.timestamp).toBeDefined();
  });

  test("CI02: responde 404 en una ruta inexistente", async () => {
    const response = await request(app).get("/api/ruta-que-no-existe");

    expect(response.status).toBe(404);
  });
});