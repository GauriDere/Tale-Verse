package backend;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class AuthApiHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }

        if (!method.equalsIgnoreCase("POST")) {
            sendResponse(exchange, 405, "{\"error\": \"Method not allowed\"}");
            return;
        }

        InputStream is = exchange.getRequestBody();
        String body = JsonUtils.readStream(is);

        String email = JsonUtils.extractString(body, "email");
        String password = JsonUtils.extractString(body, "password");

        if (path.equals("/api/auth/register")) {
            String name = JsonUtils.extractString(body, "name");
            handleRegister(exchange, name, email, password);
        } else if (path.equals("/api/auth/login")) {
            handleLogin(exchange, email, password, false);
        } else if (path.equals("/api/auth/admin/login")) {
            handleLogin(exchange, email, password, true);
        } else {
            sendResponse(exchange, 404, "{\"error\": \"Not found\"}");
        }
    }

    private void handleRegister(HttpExchange exchange, String name, String email, String password) throws IOException {
        if (name == null || email == null || password == null) {
            sendResponse(exchange, 400, "{\"error\": \"Missing fields\"}");
            return;
        }

        try (Connection conn = DatabaseConfigAuth.getConnection();
             PreparedStatement checkStmt = conn.prepareStatement("SELECT id FROM users WHERE email = ?");
             PreparedStatement insertStmt = conn.prepareStatement("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")) {
            
            checkStmt.setString(1, email);
            ResultSet rs = checkStmt.executeQuery();
            if (rs.next()) {
                sendResponse(exchange, 409, "{\"error\": \"Email already registered\"}");
                return;
            }

            insertStmt.setString(1, name);
            insertStmt.setString(2, email);
            insertStmt.setString(3, password);
            insertStmt.executeUpdate();

            sendResponse(exchange, 201, "{\"success\": true, \"message\": \"User registered successfully\"}");

        } catch (SQLException e) {
            e.printStackTrace();
            sendResponse(exchange, 503, jsonError(sqlErrorHint(e)));
        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, jsonError("Internal server error"));
        }
    }

    private void handleLogin(HttpExchange exchange, String email, String password, boolean isAdmin) throws IOException {
        if (email == null || password == null) {
            sendResponse(exchange, 400, "{\"error\": \"Missing credentials\"}");
            return;
        }

        String table = isAdmin ? "admins" : "users";
        String selectQuery = "SELECT * FROM " + table + " WHERE email = ? AND password = ?";

        try (Connection conn = DatabaseConfigAuth.getConnection();
             PreparedStatement stmt = conn.prepareStatement(selectQuery)) {
            
            stmt.setString(1, email);
            stmt.setString(2, password);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                String name = isAdmin ? "Administrator" : rs.getString("name");
                String responseBody = String.format("{\"success\": true, \"name\": \"%s\", \"email\": \"%s\", \"role\": \"%s\"}", 
                        JsonUtils.escapeJson(name), JsonUtils.escapeJson(email), isAdmin ? "admin" : "user");
                sendResponse(exchange, 200, responseBody);
            } else {
                sendResponse(exchange, 401, "{\"error\": \"Invalid email or password\"}");
            }

        } catch (SQLException e) {
            e.printStackTrace();
            sendResponse(exchange, 503, jsonError(sqlErrorHint(e)));
        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, jsonError("Internal server error"));
        }
    }

    private static String jsonError(String message) {
        return "{\"error\":\"" + JsonUtils.escapeJson(message) + "\"}";
    }

    private static String sqlErrorHint(SQLException e) {
        String m = e.getMessage();
        if (m == null) {
            return "Database error. Check the TaleVerse server console.";
        }
        if (m.contains("Communications link failure") || m.contains("Connection refused")) {
            return "Cannot reach MySQL. Start the MySQL service (port 3306) and try again.";
        }
        if (m.contains("Access denied")) {
            return "MySQL login failed. If your root user has a password, set environment variable TALEVERSE_DB_PASSWORD (and optionally TALEVERSE_DB_USER), then restart the TaleVerse server.";
        }
        if (m.contains("Unknown database")) {
            return "Unknown MySQL database. Check database.name in database.properties (or env TALEVERSE_DATABASE), then restart the TaleVerse server.";
        }
        return "Database error. See the TaleVerse server console for the full message.";
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
