package backend;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Loads catalog rows from {@code src/main/resources/static/books.xml} into MySQL {@code books}.
 * <ul>
 *   <li>If the table is empty, all books from the file are inserted.</li>
 *   <li>If {@code TALEVERSE_FORCE_BOOK_XML_SEED=true}, the table is truncated first, then reloaded from XML.</li>
 * </ul>
 */
public final class BooksXmlSeeder {

    private static final String XML_RELATIVE_PATH = "src/main/resources/static/books.xml";

    private BooksXmlSeeder() {
    }

    public static void seedIfNeeded(Connection conn) {
        try {
            String forceEnv = System.getenv("TALEVERSE_FORCE_BOOK_XML_SEED");
            boolean force = forceEnv != null && "true".equalsIgnoreCase(forceEnv.trim());

            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM books")) {
                rs.next();
                int count = rs.getInt(1);
                if (count > 0 && !force) {
                    System.out.println("books.xml seed skipped (" + count + " row(s) already). "
                            + "Empty the table or set TALEVERSE_FORCE_BOOK_XML_SEED=true to reload from XML.");
                    return;
                }
                if (count > 0) {
                    st.executeUpdate("TRUNCATE TABLE books");
                    System.out.println("books: truncated (TALEVERSE_FORCE_BOOK_XML_SEED=true), reloading from books.xml");
                }
            }

            File xmlFile = new File(XML_RELATIVE_PATH);
            if (!xmlFile.isFile()) {
                System.err.println("books.xml not found at " + xmlFile.getAbsolutePath() + " (run server from project root).");
                return;
            }

            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setExpandEntityReferences(false);
            Document doc = factory.newDocumentBuilder().parse(xmlFile);

            NodeList books = doc.getElementsByTagName("book");
            if (books.getLength() == 0) {
                System.out.println("books.xml contains no <book> entries.");
                return;
            }

            String insertSql = "INSERT INTO books (book_name, author_name, book_price, ratings, book_photo, category, edition, format) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

            int inserted = 0;
            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                for (int i = 0; i < books.getLength(); i++) {
                    Element book = (Element) books.item(i);
                    String title = text(book, "title");
                    String author = text(book, "author");
                    if (title.isEmpty() || author.isEmpty()) {
                        continue;
                    }
                    String price = text(book, "price");
                    if (price.isEmpty()) {
                        price = "0";
                    }
                    double rating = 0;
                    try {
                        String r = text(book, "rating");
                        if (!r.isEmpty()) {
                            rating = Double.parseDouble(r);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                    String image = text(book, "image");
                    if (image.isEmpty()) {
                        image = "images/default_book.jpg";
                    }
                    String category = text(book, "category");
                    if (category.isEmpty()) {
                        category = "Fantasy";
                    }
                    String edition = text(book, "edition");
                    if (edition.isEmpty()) edition = "Standard";
                    String format = text(book, "format");
                    if (format.isEmpty()) format = text(book, "type");
                    if (format.isEmpty()) format = "Paperback";

                    ps.setString(1, title);
                    ps.setString(2, author);
                    ps.setDouble(3, parseDouble(price, 0));
                    ps.setDouble(4, rating);
                    ps.setString(5, image);
                    ps.setString(6, category);
                    ps.setString(7, edition);
                    ps.setString(8, format);
                    ps.executeUpdate();
                    inserted++;
                }
            }
            System.out.println("Seeded " + inserted + " book(s) from books.xml into MySQL.");
        } catch (Exception e) {
            System.err.println("books.xml seed failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static double parseDouble(String val, double defaultVal) {
        if (val == null || val.isEmpty()) return defaultVal;
        try {
            return Double.parseDouble(val.replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private static String text(Element parent, String tag) {
        NodeList nl = parent.getElementsByTagName(tag);
        if (nl.getLength() == 0) {
            return "";
        }
        String s = nl.item(0).getTextContent();
        return s == null ? "" : s.trim();
    }
}
