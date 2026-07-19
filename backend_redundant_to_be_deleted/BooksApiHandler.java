package backend;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * MySQL-backed CRUD for the ecommerce books catalog.
 * Fields: title (name), author, price, image (photo), category, rating, edition, type (format),
 * plus oldPrice, discount, bestseller.
 */
public class BooksApiHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        String method = exchange.getRequestMethod().toUpperCase();

        switch (method) {
            case "GET":
                handleGet(exchange);
                break;
            case "POST":
                handleAddBook(exchange);
                break;
            case "PUT":
                handleUpdateBook(exchange);
                break;
            case "DELETE":
                handleDeleteBook(exchange);
                break;
            case "OPTIONS":
                exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                break;
            default:
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
        }
    }

    private void handleGet(HttpExchange exchange) throws IOException {
        String query = exchange.getRequestURI().getQuery();
        Integer id = parseIdQuery(query);

        if (id != null) {
            handleGetOne(exchange, id);
            return;
        }

        StringBuilder jsonArray = new StringBuilder("[");
        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT id, book_name, author_name, book_price, book_photo, category, ratings, edition, format FROM books ORDER BY id")) {

            boolean first = true;
            while (rs.next()) {
                if (!first) {
                    jsonArray.append(",");
                }
                first = false;
                jsonArray.append(rowToJson(rs));
            }
            jsonArray.append("]");
            sendResponse(exchange, 200, jsonArray.toString());

        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"error\":\"Internal server error\"}");
        }
    }

    private void handleGetOne(HttpExchange exchange, int id) throws IOException {
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                     "SELECT id, book_name, author_name, book_price, book_photo, category, ratings, edition, format FROM books WHERE id = ?")) {

            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    sendResponse(exchange, 200, rowToJson(rs));
                } else {
                    sendResponse(exchange, 404, "{\"error\":\"Book not found\"}");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"error\":\"Internal server error\"}");
        }
    }

    private static Integer parseIdQuery(String query) {
        if (query == null || !query.contains("id=")) {
            return null;
        }
        for (String part : query.split("&")) {
            if (part.startsWith("id=")) {
                try {
                    return Integer.parseInt(part.substring(3).trim());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        }
        return null;
    }

    private static String rowToJson(ResultSet rs) throws java.sql.SQLException {
        double rating = 0;
        double price = 0;
        try {
            rating = rs.getDouble("ratings");
            price = rs.getDouble("book_price");
        } catch (Exception e) {}
        
        return "{"
                + "\"id\":" + getIntSafe(rs, "id", 0) + ","
                + "\"title\":\"" + JsonUtils.escapeJson(getStringSafe(rs, "book_name")) + "\","
                + "\"author\":\"" + JsonUtils.escapeJson(getStringSafe(rs, "author_name")) + "\","
                + "\"price\":" + price + ","
                + "\"oldPrice\":\"\","
                + "\"discount\":\"\","
                + "\"rating\":" + rating + ","
                + "\"image\":\"" + JsonUtils.escapeJson(getStringSafe(rs, "book_photo")) + "\","
                + "\"category\":\"" + JsonUtils.escapeJson(getStringSafe(rs, "category")) + "\","
                + "\"bestseller\":false,"
                + "\"edition\":\"" + JsonUtils.escapeJson(getStringSafe(rs, "edition")) + "\","
                + "\"type\":\"" + JsonUtils.escapeJson(getStringSafe(rs, "format")) + "\","
                + "\"format\":\"" + JsonUtils.escapeJson(getStringSafe(rs, "format")) + "\""
                + "}";
    }

    private static String getStringSafe(ResultSet rs, String colName) {
        try {
            String val = rs.getString(colName);
            return val != null ? val : "";
        } catch (Exception e) {
            return "";
        }
    }

    private static int getIntSafe(ResultSet rs, String colName, int defaultVal) {
        try {
            return rs.getInt(colName);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private void handleAddBook(HttpExchange exchange) throws IOException {
        String body = JsonUtils.readStream(exchange.getRequestBody());

        String title = JsonUtils.extractString(body, "title");
        String author = JsonUtils.extractString(body, "author");
        String price = JsonUtils.extractString(body, "price");
        String image = JsonUtils.extractString(body, "image");
        String category = JsonUtils.extractString(body, "category");
        String edition = JsonUtils.extractString(body, "edition");
        String format = firstNonEmpty(
                JsonUtils.extractString(body, "format"),
                JsonUtils.extractString(body, "type"));
        double rating = JsonUtils.extractDouble(body, "rating", 4.5);

        if (title == null || author == null || price == null) {
            sendResponse(exchange, 400, "{\"error\":\"Missing required fields: title, author, price\"}");
            return;
        }

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                     "INSERT INTO books (book_name, author_name, book_price, ratings, book_photo, category, edition, format) "
                             + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {

            stmt.setString(1, title);
            stmt.setString(2, author);
            stmt.setDouble(3, parseDoubleSafe(price, 0));
            stmt.setDouble(4, rating);
            stmt.setString(5, image == null || image.isEmpty() ? "images/default_book.jpg" : image);
            stmt.setString(6, category == null ? "Fantasy" : category);
            stmt.setString(7, edition == null ? "Standard" : edition);
            stmt.setString(8, format == null ? "Paperback" : format);

            stmt.executeUpdate();
            sendResponse(exchange, 201, "{\"success\":true,\"message\":\"Book added\"}");

        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"error\":\"Internal server error\"}");
        }
    }

    private void handleUpdateBook(HttpExchange exchange) throws IOException {
        String body = JsonUtils.readStream(exchange.getRequestBody());
        String idStr = JsonUtils.extractRaw(body, "id");

        if (idStr == null || idStr.isEmpty()) {
            sendResponse(exchange, 400, "{\"error\":\"Missing book id\"}");
            return;
        }

        int id;
        try {
            id = Integer.parseInt(idStr);
        } catch (NumberFormatException e) {
            sendResponse(exchange, 400, "{\"error\":\"Invalid book id\"}");
            return;
        }

        String title = JsonUtils.extractString(body, "title");
        String author = JsonUtils.extractString(body, "author");
        String price = JsonUtils.extractString(body, "price");
        String image = JsonUtils.extractString(body, "image");
        String category = JsonUtils.extractString(body, "category");
        String edition = JsonUtils.extractString(body, "edition");
        String format = firstNonEmpty(
                JsonUtils.extractString(body, "format"),
                JsonUtils.extractString(body, "type"));

        double rating = JsonUtils.extractDouble(body, "rating", 0);

        if (title == null || author == null || price == null) {
            sendResponse(exchange, 400, "{\"error\":\"Missing required fields: title, author, price\"}");
            return;
        }

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                     "UPDATE books SET book_name=?, author_name=?, book_price=?, ratings=?, book_photo=?, category=?, edition=?, format=? WHERE id=?")) {

            stmt.setString(1, title);
            stmt.setString(2, author);
            stmt.setDouble(3, parseDoubleSafe(price, 0));
            stmt.setDouble(4, rating);
            stmt.setString(5, image == null || image.isEmpty() ? "images/default_book.jpg" : image);
            stmt.setString(6, category == null ? "" : category);
            stmt.setString(7, edition == null ? "Standard" : edition);
            stmt.setString(8, format == null ? "Paperback" : format);
            stmt.setInt(9, id);

            int rows = stmt.executeUpdate();
            if (rows > 0) {
                sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Book updated\"}");
            } else {
                sendResponse(exchange, 404, "{\"error\":\"Book not found\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"error\":\"Internal server error\"}");
        }
    }

    private void handleDeleteBook(HttpExchange exchange) throws IOException {
        String query = exchange.getRequestURI().getQuery();
        int id = -1;

        if (query != null && query.contains("id=")) {
            for (String part : query.split("&")) {
                if (part.startsWith("id=")) {
                    try {
                        id = Integer.parseInt(part.substring(3).trim());
                    } catch (NumberFormatException ignore) {
                    }
                    break;
                }
            }
        }

        if (id == -1) {
            sendResponse(exchange, 400, "{\"error\":\"Missing or invalid book id in query string\"}");
            return;
        }

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement("DELETE FROM books WHERE id=?")) {

            stmt.setInt(1, id);
            int rows = stmt.executeUpdate();
            if (rows > 0) {
                sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Book deleted\"}");
            } else {
                sendResponse(exchange, 404, "{\"error\":\"Book not found\"}");
            }
        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"error\":\"Internal server error\"}");
        }
    }

    private static double parseDoubleSafe(String val, double defaultVal) {
        if (val == null || val.isEmpty()) return defaultVal;
        try {
            return Double.parseDouble(val.replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private static String firstNonEmpty(String a, String b) {
        if (a != null && !a.isEmpty()) {
            return a;
        }
        if (b != null && !b.isEmpty()) {
            return b;
        }
        return null;
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
