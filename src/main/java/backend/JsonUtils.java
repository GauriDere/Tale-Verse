package backend;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class JsonUtils {
    public static String extractString(String json, String key) {
        String regex = "\"" + Pattern.quote(key) + "\"\\s*:\\s*\"([^\"]*)\"";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    public static String extractRaw(String json, String key) {
        String regex = "\"" + Pattern.quote(key) + "\"\\s*:\\s*([^,\\}]+)";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1).trim().replaceAll("\"", "");
        }
        return null;
    }

    public static double extractDouble(String json, String key, double defaultVal) {
        String raw = extractRaw(json, key);
        if (raw == null || raw.isEmpty()) {
            return defaultVal;
        }
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            return defaultVal;
        }
    }

    public static boolean extractBoolean(String json, String key, boolean defaultVal) {
        String raw = extractRaw(json, key);
        if (raw == null) {
            return defaultVal;
        }
        return "true".equalsIgnoreCase(raw.trim());
    }

    public static String escapeJson(String input) {
        if (input == null) {
            return "";
        }
        return input.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "")
                .replace("\r", "");
    }

    public static String readStream(java.io.InputStream is) throws java.io.IOException {
        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        int nRead;
        byte[] data = new byte[1024];
        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        buffer.flush();
        return new String(buffer.toByteArray(), java.nio.charset.StandardCharsets.UTF_8);
    }
}
