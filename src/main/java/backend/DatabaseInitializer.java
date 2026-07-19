package backend;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class DatabaseInitializer {

    public static void initialize() {
        try (Connection conn = DriverManager.getConnection(DatabaseEnv.jdbcUrlServerNoCatalog(), DatabaseEnv.user(), DatabaseEnv.password());
             Statement stmt = conn.createStatement()) {

            for (String db : DatabaseEnv.allCatalogNames()) {
                stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS `" + db + "`");
            }
            System.out.println("MySQL catalogs ready: " + String.join(", ", DatabaseEnv.allCatalogNames()));

        } catch (Exception e) {
            System.err.println("Error creating databases: " + e.getMessage());
        }

        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement()) {

            String createBooksTable = "CREATE TABLE IF NOT EXISTS books (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "book_name VARCHAR(255) NOT NULL COMMENT 'book name', " +
                    "author_name VARCHAR(255) NOT NULL, " +
                    "book_price DECIMAL(10,2) NOT NULL, " +
                    "book_photo VARCHAR(1024) COMMENT 'book photo URL or static path', " +
                    "category VARCHAR(100), " +
                    "ratings DOUBLE DEFAULT 0, " +
                    "edition VARCHAR(100), " +
                    "format VARCHAR(100)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            stmt.executeUpdate(createBooksTable);
            ensureBooksColumns(conn);
            widenImageColumn(conn);
            BooksXmlSeeder.seedIfNeeded(conn);
            System.out.println("Table 'books' verified (ecommerce CRUD schema).");

        } catch (Exception e) {
            System.err.println("Error initializing books table: " + e.getMessage());
        }

        try (Connection conn = DatabaseConfigAuth.getConnection();
             Statement stmt = conn.createStatement()) {

            stmt.executeUpdate("CREATE TABLE IF NOT EXISTS users (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "email VARCHAR(255) UNIQUE NOT NULL, " +
                    "password VARCHAR(255) NOT NULL" +
                    ");");

            stmt.executeUpdate("CREATE TABLE IF NOT EXISTS admins (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "email VARCHAR(255) UNIQUE NOT NULL, " +
                    "password VARCHAR(255) NOT NULL" +
                    ");");

            try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM admins")) {
                if (rs.next() && rs.getInt(1) == 0) {
                    stmt.executeUpdate("INSERT INTO admins (email, password) VALUES ('admin@taleverse.com', 'admin123')");
                    System.out.println("Default admin user provisioned.");
                }
            } catch (Exception ignore) {
                // ignore
            }

            System.out.println("Tables 'users' and 'admins' verified.");

        } catch (Exception e) {
            System.err.println("Error initializing auth tables: " + e.getMessage());
        }
    }

    private static Set<String> existingBookColumns(Connection conn) throws SQLException {
        Set<String> names = new HashSet<>();
        DatabaseMetaData meta = conn.getMetaData();
        String catalog = conn.getCatalog();
        if (catalog == null || catalog.isBlank()) {
            catalog = DatabaseEnv.booksCatalogName();
        }
        try (ResultSet rs = meta.getColumns(catalog, null, "books", null)) {
            while (rs.next()) {
                names.add(rs.getString("COLUMN_NAME").toLowerCase(Locale.ROOT));
            }
        }
        return names;
    }

    private static void addColumnIfMissing(Connection conn, Set<String> cols, String colName, String ddl)
            throws SQLException {
        if (!cols.contains(colName.toLowerCase(Locale.ROOT))) {
            try (Statement st = conn.createStatement()) {
                st.executeUpdate(ddl);
            }
            cols.add(colName.toLowerCase(Locale.ROOT));
        }
    }

    private static void ensureBooksColumns(Connection conn) throws SQLException {
        Set<String> cols = existingBookColumns(conn);
        addColumnIfMissing(conn, cols, "ratings",
                "ALTER TABLE books ADD COLUMN ratings DOUBLE NULL DEFAULT 0");
        addColumnIfMissing(conn, cols, "book_photo",
                "ALTER TABLE books ADD COLUMN book_photo VARCHAR(1024) NULL");
        addColumnIfMissing(conn, cols, "category",
                "ALTER TABLE books ADD COLUMN category VARCHAR(100) NULL");
        addColumnIfMissing(conn, cols, "edition",
                "ALTER TABLE books ADD COLUMN edition VARCHAR(100) NULL");
        addColumnIfMissing(conn, cols, "format",
                "ALTER TABLE books ADD COLUMN format VARCHAR(100) NULL");
    }

    private static void widenImageColumn(Connection conn) {
        try (Statement st = conn.createStatement()) {
            st.executeUpdate("ALTER TABLE books MODIFY COLUMN book_photo VARCHAR(1024) NULL");
        } catch (SQLException ignored) {
        }
    }
}
