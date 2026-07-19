package backend;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.Properties;
import java.util.Set;

/**
 * MySQL connection settings. Precedence: environment variables, then {@code database.properties}
 * in the project working directory, then defaults.
 * <p>
 * Use one database for everything: set {@code database.name=taleversedatabase} in
 * {@code database.properties}, or set env {@code TALEVERSE_DATABASE=taleversedatabase}.
 * <p>
 * Split databases: set {@code database.books} and {@code database.auth}, or
 * {@code TALEVERSE_DB_BOOKS} / {@code TALEVERSE_DB_AUTH}.
 */
public final class DatabaseEnv {

    private static final Properties PROPS = new Properties();

    static {
        File f = new File("database.properties");
        if (f.isFile()) {
            try (InputStreamReader r = new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8)) {
                PROPS.load(r);
            } catch (IOException e) {
                System.err.println("Could not load database.properties: " + e.getMessage());
            }
        }
    }

    private DatabaseEnv() {
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    public static String user() {
        return firstNonBlank(System.getenv("TALEVERSE_DB_USER"), PROPS.getProperty("mysql.user"), "root");
    }

    public static String password() {
        String p = firstNonBlank(System.getenv("TALEVERSE_DB_PASSWORD"), PROPS.getProperty("mysql.password"));
        return p == null ? "" : p;
    }

    /**
     * One name for both books and auth when {@code TALEVERSE_DATABASE} or {@code database.name} is set.
     */
    public static String singleCatalogName() {
        return firstNonBlank(
                System.getenv("TALEVERSE_DATABASE"),
                PROPS.getProperty("database.name"));
    }

    public static String booksCatalogName() {
        String single = singleCatalogName();
        if (single != null) {
            return validateIdentifier(single, "books catalog");
        }
        String b = firstNonBlank(System.getenv("TALEVERSE_DB_BOOKS"), PROPS.getProperty("database.books"));
        if (b != null) {
            return validateIdentifier(b, "books catalog");
        }
        return "taleverse";
    }

    public static String authCatalogName() {
        String single = singleCatalogName();
        if (single != null) {
            return validateIdentifier(single, "auth catalog");
        }
        String a = firstNonBlank(System.getenv("TALEVERSE_DB_AUTH"), PROPS.getProperty("database.auth"));
        if (a != null) {
            return validateIdentifier(a, "auth catalog");
        }
        return "taleverse_auth";
    }

    public static String jdbcUrlBooks() {
        return jdbcUrlForCatalog(booksCatalogName());
    }

    public static String jdbcUrlAuth() {
        return jdbcUrlForCatalog(authCatalogName());
    }

    public static String jdbcUrlServerNoCatalog() {
        return "jdbc:mysql://localhost:3306/?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    }

    private static String jdbcUrlForCatalog(String catalog) {
        return "jdbc:mysql://localhost:3306/" + catalog
                + "?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    }

    private static String validateIdentifier(String name, String label) {
        if (name == null || !name.matches("^[a-zA-Z0-9_]+$")) {
            throw new IllegalArgumentException("Invalid " + label + " name (use letters, digits, underscore only): " + name);
        }
        return name;
    }

    /** Catalogs to create at startup (unique, stable order). */
    public static Set<String> allCatalogNames() {
        Set<String> out = new LinkedHashSet<>();
        out.add(booksCatalogName());
        out.add(authCatalogName());
        return out;
    }
}
