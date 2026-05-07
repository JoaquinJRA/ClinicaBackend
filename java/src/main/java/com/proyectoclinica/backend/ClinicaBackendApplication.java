package com.proyectoclinica.backend;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class ClinicaBackendApplication {
    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("JAVA_PORT", "8081"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/api/salud", exchange -> json(exchange, 200,
                "{\"servicio\":\"backend-java\",\"estado\":\"ok\",\"mensaje\":\"Servicio Java 21 listo\"}"));

        server.createContext("/api/especialidades", exchange -> json(exchange, 200,
                "[{\"id\":1,\"nombre\":\"Medicina general\"},{\"id\":2,\"nombre\":\"Pediatria\"},{\"id\":3,\"nombre\":\"Cardiologia\"}]"));

        server.start();
        System.out.printf("Backend Java escuchando en http://localhost:%d%n", port);
    }

    private static void json(HttpExchange exchange, int status, String body) throws IOException {
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream response = exchange.getResponseBody()) {
            response.write(bytes);
        }
    }
}
