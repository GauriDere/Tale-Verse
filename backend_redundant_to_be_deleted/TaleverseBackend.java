package backend;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.SQLException;

public class TaleverseBackend {

    private static final int PORT = 8080;
    private static final String STATIC_DIR = "src/main/resources/static";

    public static void main(String[] args) throws IOException {
        System.out.println("Initializing databases...");
        DatabaseInitializer.initialize();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        
        // Serve static files
        server.createContext("/", new StaticFileHandler());
        
        // API routes
        server.createContext("/api/books", new BooksApiHandler());
        server.createContext("/api/auth", new AuthApiHandler());

        server.setExecutor(null); // creates a default executor
        server.start();
        System.out.println("TaleVerse Server started successfully!");
        System.out.println("Listening on http://localhost:" + PORT);
        System.out.println("Press Ctrl+C to stop the server.");
    }

    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            String path = t.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/registration.html";
            }

            File file = new File(STATIC_DIR + path);
            if (file.exists() && !file.isDirectory()) {
                String contentType = Files.probeContentType(file.toPath());
                if(contentType == null) {
                    if(path.endsWith(".js")) contentType = "application/javascript";
                    else if(path.endsWith(".css")) contentType = "text/css";
                    else if(path.endsWith(".html")) contentType = "text/html";
                    else contentType = "application/octet-stream";
                }

                t.getResponseHeaders().set("Content-Type", contentType);
                t.sendResponseHeaders(200, file.length());
                
                try (OutputStream os = t.getResponseBody(); FileInputStream fs = new FileInputStream(file)) {
                    final byte[] buffer = new byte[0x10000];
                    int count = 0;
                    while ((count = fs.read(buffer)) >= 0) {
                        os.write(buffer,0,count);
                    }
                }
            } else {
                String response = "404 Not Found: " + path;
                t.sendResponseHeaders(404, response.length());
                try (OutputStream os = t.getResponseBody()) {
                    os.write(response.getBytes());
                }
            }
        }
    }
}
