import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Ellipse2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import javax.imageio.ImageIO;

/**
 * Generates the SMV ASTRO-matching Android launcher treatment for the
 * independent HOROSCOPE and CALENDAR artwork. Website/PWA source icons are
 * read-only inputs; only the production Android res directory is written.
 */
public final class SmvProductLauncherIconGenerator {
  private static final int ADAPTIVE_CANVAS = 432; // 108dp at 4px per dp
  private static final int ADAPTIVE_ART_SIZE = 232; // 58dp centered artwork tile
  private static final int ADAPTIVE_CORNER_RADIUS = 64; // 16dp
  private static final int LEGACY_CANVAS = 512;
  private static final int LEGACY_ART_SIZE = 275; // 58dp at the same scale
  private static final int LEGACY_CORNER_RADIUS = 76; // 16dp
  private static final int WHITE = 0xFFFFFF;

  private static int channel(int rgb, int shift) {
    return (rgb >>> shift) & 255;
  }

  private static int clamp(int value) {
    return Math.max(0, Math.min(255, value));
  }

  private static boolean isOuterBackgroundCandidate(int argb) {
    int alpha = (argb >>> 24) & 255;
    if (alpha == 0) return true;

    int r = channel(argb, 16), g = channel(argb, 8), b = channel(argb, 0);
    int spread = Math.max(r, Math.max(g, b)) - Math.min(r, Math.min(g, b));
    double dr = 255 - r, dg = 255 - g, db = 255 - b;
    double distance = Math.sqrt(dr * dr + dg * dg + db * db);
    return distance <= 112.0 && spread <= 72;
  }

  private static int unmatteAgainstWhite(int value, double alpha) {
    if (alpha <= 0.0) return 0;
    return clamp((int)Math.round((value - (1.0 - alpha) * 255.0) / alpha));
  }

  /**
   * Removes only transparent/near-white pixels connected to the image edge.
   * White details enclosed by the app artwork are retained. If the approved
   * artwork has no removable outer white canvas, the source is preserved.
   */
  private static BufferedImage removeOuterWhiteBackground(BufferedImage input) {
    int width = input.getWidth(), height = input.getHeight();
    int count = width * height;
    boolean[] background = new boolean[count];
    int[] queue = new int[count];
    int head = 0, tail = 0;

    for (int x = 0; x < width; x++) {
      int top = x;
      int bottom = (height - 1) * width + x;
      if (!background[top] && isOuterBackgroundCandidate(input.getRGB(x, 0))) {
        background[top] = true;
        queue[tail++] = top;
      }
      if (!background[bottom] && isOuterBackgroundCandidate(input.getRGB(x, height - 1))) {
        background[bottom] = true;
        queue[tail++] = bottom;
      }
    }
    for (int y = 0; y < height; y++) {
      int left = y * width;
      int right = y * width + width - 1;
      if (!background[left] && isOuterBackgroundCandidate(input.getRGB(0, y))) {
        background[left] = true;
        queue[tail++] = left;
      }
      if (!background[right] && isOuterBackgroundCandidate(input.getRGB(width - 1, y))) {
        background[right] = true;
        queue[tail++] = right;
      }
    }

    int[] dx = {-1, 0, 1, -1, 1, -1, 0, 1};
    int[] dy = {-1, -1, -1, 0, 0, 1, 1, 1};
    while (head < tail) {
      int index = queue[head++];
      int x = index % width, y = index / width;
      for (int k = 0; k < 8; k++) {
        int nx = x + dx[k], ny = y + dy[k];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        int next = ny * width + nx;
        if (!background[next] && isOuterBackgroundCandidate(input.getRGB(nx, ny))) {
          background[next] = true;
          queue[tail++] = next;
        }
      }
    }

    BufferedImage output = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        int argb = input.getRGB(x, y);
        if (!background[y * width + x]) {
          output.setRGB(x, y, argb);
          continue;
        }

        int originalAlpha = (argb >>> 24) & 255;
        if (originalAlpha == 0) {
          output.setRGB(x, y, 0x00000000);
          continue;
        }

        int r = channel(argb, 16), g = channel(argb, 8), b = channel(argb, 0);
        double dr = 255 - r, dg = 255 - g, db = 255 - b;
        double distance = Math.sqrt(dr * dr + dg * dg + db * db);
        double matteAlpha = Math.max(0.0, Math.min(1.0, (distance - 22.0) / 90.0));
        int finalAlpha = clamp((int)Math.round(originalAlpha * matteAlpha));
        if (finalAlpha < 8) {
          output.setRGB(x, y, 0x00000000);
        } else {
          int fr = unmatteAgainstWhite(r, matteAlpha);
          int fg = unmatteAgainstWhite(g, matteAlpha);
          int fb = unmatteAgainstWhite(b, matteAlpha);
          output.setRGB(x, y, (finalAlpha << 24) | (fr << 16) | (fg << 8) | fb);
        }
      }
    }
    return output;
  }

  private static Graphics2D qualityGraphics(BufferedImage image) {
    Graphics2D g = image.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
    g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    g.setComposite(AlphaComposite.Src);
    return g;
  }

  private static RoundRectangle2D tileShape(int canvas, int tile, int radius) {
    int offset = (canvas - tile) / 2;
    return new RoundRectangle2D.Double(offset, offset, tile, tile, radius * 2.0, radius * 2.0);
  }

  private static BufferedImage drawAdaptiveForeground(BufferedImage artwork) {
    BufferedImage output = new BufferedImage(ADAPTIVE_CANVAS, ADAPTIVE_CANVAS, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = qualityGraphics(output);
    int offset = (ADAPTIVE_CANVAS - ADAPTIVE_ART_SIZE) / 2;
    g.setClip(tileShape(ADAPTIVE_CANVAS, ADAPTIVE_ART_SIZE, ADAPTIVE_CORNER_RADIUS));
    g.setComposite(AlphaComposite.SrcOver);
    g.drawImage(artwork, offset, offset, ADAPTIVE_ART_SIZE, ADAPTIVE_ART_SIZE, null);
    g.dispose();
    return output;
  }

  private static BufferedImage drawLegacyIcon(BufferedImage artwork, boolean circular) {
    BufferedImage output = new BufferedImage(LEGACY_CANVAS, LEGACY_CANVAS, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = qualityGraphics(output);
    if (circular) g.setClip(new Ellipse2D.Double(0, 0, LEGACY_CANVAS, LEGACY_CANVAS));
    g.setColor(Color.WHITE);
    g.fillRect(0, 0, LEGACY_CANVAS, LEGACY_CANVAS);
    g.setComposite(AlphaComposite.SrcOver);
    int offset = (LEGACY_CANVAS - LEGACY_ART_SIZE) / 2;
    g.clip(tileShape(LEGACY_CANVAS, LEGACY_ART_SIZE, LEGACY_CORNER_RADIUS));
    g.drawImage(artwork, offset, offset, LEGACY_ART_SIZE, LEGACY_ART_SIZE, null);
    g.dispose();
    return output;
  }

  private static int alphaAt(BufferedImage image, int x, int y) {
    return (image.getRGB(x, y) >>> 24) & 255;
  }

  private static void verifyTransparentCorners(BufferedImage image, String name) {
    int w = image.getWidth(), h = image.getHeight();
    int[][] corners = {{0,0},{w-1,0},{0,h-1},{w-1,h-1}};
    for (int[] point : corners) {
      if (alphaAt(image, point[0], point[1]) != 0) {
        throw new IllegalStateException(name + " must have transparent outer corners.");
      }
    }
  }

  private static void verifyWhiteBackground(BufferedImage image, String name) {
    int w = image.getWidth(), h = image.getHeight();
    int[][] points = {{w/2,8},{8,h/2},{w-9,h/2},{w/2,h-9}};
    for (int[] point : points) {
      int pixel = image.getRGB(point[0], point[1]);
      if (((pixel >>> 24) & 255) != 255 || (pixel & 0xFFFFFF) != WHITE) {
        throw new IllegalStateException(name + " must show a solid #FFFFFF background around the centered app icon.");
      }
    }
  }

  private static void verifyArtworkPresent(BufferedImage image, String name) {
    int visible = 0;
    for (int y = 0; y < image.getHeight(); y++) {
      for (int x = 0; x < image.getWidth(); x++) {
        if (alphaAt(image, x, y) > 8) visible++;
      }
    }
    if (visible < 8) throw new IllegalStateException(name + " contains no visible app artwork.");
  }

  private static void writePng(BufferedImage image, Path target) throws IOException {
    Files.createDirectories(target.getParent());
    if (!ImageIO.write(image, "png", target.toFile())) {
      throw new IOException("PNG writer is unavailable for " + target);
    }
    if (!Files.isRegularFile(target) || Files.size(target) == 0) {
      throw new IOException("Generated launcher asset is missing: " + target);
    }
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 2) {
      throw new IllegalArgumentException("Usage: SmvProductLauncherIconGenerator input-icon.png output-res-directory");
    }

    Path inputPath = Paths.get(args[0]);
    Path res = Paths.get(args[1]);
    BufferedImage original = ImageIO.read(inputPath.toFile());
    if (original == null || original.getWidth() != original.getHeight() || original.getWidth() < 192) {
      throw new IllegalArgumentException("Approved app artwork must be a readable square PNG of at least 192px.");
    }

    BufferedImage artwork = removeOuterWhiteBackground(original);
    verifyArtworkPresent(artwork, "Processed source artwork");

    Path drawable = res.resolve("drawable-nodpi");
    Path mipmap = res.resolve("mipmap-nodpi");
    Path adaptive = res.resolve("mipmap-anydpi-v26");
    Path values = res.resolve("values");

    BufferedImage foreground = drawAdaptiveForeground(artwork);
    verifyTransparentCorners(foreground, "Adaptive foreground");
    verifyArtworkPresent(foreground, "Adaptive foreground");
    writePng(foreground, drawable.resolve("ic_launcher_foreground.png"));

    BufferedImage square = drawLegacyIcon(artwork, false);
    verifyWhiteBackground(square, "Square fallback");
    verifyArtworkPresent(square, "Square fallback");
    writePng(square, mipmap.resolve("ic_launcher.png"));

    BufferedImage round = drawLegacyIcon(artwork, true);
    verifyTransparentCorners(round, "Round fallback");
    verifyWhiteBackground(round, "Round fallback");
    verifyArtworkPresent(round, "Round fallback");
    writePng(round, mipmap.resolve("ic_launcher_round.png"));

    Files.createDirectories(adaptive);
    Files.writeString(adaptive.resolve("ic_launcher.xml"),
      "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">\n" +
      "    <background android:drawable=\"@color/smv_launcher_background\" />\n" +
      "    <foreground android:drawable=\"@drawable/ic_launcher_foreground\" />\n" +
      "</adaptive-icon>\n");
    Files.writeString(adaptive.resolve("ic_launcher_round.xml"),
      "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">\n" +
      "    <background android:drawable=\"@color/smv_launcher_background\" />\n" +
      "    <foreground android:drawable=\"@drawable/ic_launcher_foreground\" />\n" +
      "</adaptive-icon>\n");

    Files.createDirectories(values);
    Files.writeString(values.resolve("colors.xml"),
      "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<resources>\n    <color name=\"smv_launcher_background\">#FFFFFF</color>\n</resources>\n");

    System.out.println("PASS: Preserved the approved app-specific artwork for " + inputPath.getFileName() + ".");
    System.out.println("PASS: Generated 58dp centered launcher artwork with 16dp rounded corners on a #FFFFFF background.");
    System.out.println("PASS: Generated adaptive, round and square Android launcher resources in " + res + ".");
  }
}