#!/usr/bin/env bash
set -euo pipefail

source_icon="public/assets/icon-512.png"
res="smvastroproduction/src/main/res"
generator_dir="/tmp/smv-astro-icon-generator"

if [[ ! -s "$source_icon" ]]; then
  echo "::error::The existing SMV ASTRO icon is missing: $source_icon"
  exit 1
fi

mkdir -p "$generator_dir" \
  "$res/drawable-nodpi" \
  "$res/mipmap-nodpi" \
  "$res/mipmap-anydpi-v26" \
  "$res/values"

cat > "$generator_dir/SmvLauncherIconGenerator.java" <<'JAVA'
import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;
import java.nio.file.*;

public final class SmvLauncherIconGenerator {
  private static final int ADAPTIVE_CANVAS = 432;
  private static final int ADAPTIVE_ART_SIZE = 384;
  private static final int ROUND_CANVAS = 512;
  private static final int ROUND_ART_SIZE = 480;
  private static final int LAUNCHER_BACKGROUND = 0x260719;

  private static int red(int rgb) { return (rgb >>> 16) & 255; }
  private static int green(int rgb) { return (rgb >>> 8) & 255; }
  private static int blue(int rgb) { return rgb & 255; }

  // Only near-white pixels connected to the outside of the existing image
  // are treated as the removable canvas. White details enclosed by the gold
  // frame are deliberately retained.
  private static boolean isOuterBackgroundCandidate(int rgb) {
    int r = red(rgb), g = green(rgb), b = blue(rgb);
    int spread = Math.max(r, Math.max(g, b)) - Math.min(r, Math.min(g, b));
    double dr = 255 - r, dg = 255 - g, db = 255 - b;
    double distance = Math.sqrt(dr * dr + dg * dg + db * db);
    return distance <= 112.0 && spread <= 72;
  }

  private static int clamp(int value) {
    return Math.max(0, Math.min(255, value));
  }

  private static int unmatteAgainstWhite(int channel, double alpha) {
    if (alpha <= 0.0) return 0;
    return clamp((int)Math.round((channel - (1.0 - alpha) * 255.0) / alpha));
  }

  private static BufferedImage removeOuterWhiteBackground(BufferedImage input) {
    final int width = input.getWidth();
    final int height = input.getHeight();
    final int count = width * height;
    boolean[] outerBackground = new boolean[count];
    int[] queue = new int[count];
    int head = 0, tail = 0;

    // Seed all four edges. Flood-fill only the near-white connected canvas.
    for (int x = 0; x < width; x++) {
      int top = x;
      int bottom = (height - 1) * width + x;
      if (!outerBackground[top] && isOuterBackgroundCandidate(input.getRGB(x, 0))) {
        outerBackground[top] = true; queue[tail++] = top;
      }
      if (!outerBackground[bottom] && isOuterBackgroundCandidate(input.getRGB(x, height - 1))) {
        outerBackground[bottom] = true; queue[tail++] = bottom;
      }
    }
    for (int y = 0; y < height; y++) {
      int left = y * width;
      int right = y * width + width - 1;
      if (!outerBackground[left] && isOuterBackgroundCandidate(input.getRGB(0, y))) {
        outerBackground[left] = true; queue[tail++] = left;
      }
      if (!outerBackground[right] && isOuterBackgroundCandidate(input.getRGB(width - 1, y))) {
        outerBackground[right] = true; queue[tail++] = right;
      }
    }

    final int[] dx = {-1, 0, 1, -1, 1, -1, 0, 1};
    final int[] dy = {-1, -1, -1, 0, 0, 1, 1, 1};
    while (head < tail) {
      int index = queue[head++];
      int x = index % width;
      int y = index / width;
      for (int k = 0; k < 8; k++) {
        int nx = x + dx[k], ny = y + dy[k];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        int next = ny * width + nx;
        if (outerBackground[next]) continue;
        if (isOuterBackgroundCandidate(input.getRGB(nx, ny))) {
          outerBackground[next] = true;
          queue[tail++] = next;
        }
      }
    }

    BufferedImage output = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    int removed = 0;
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        int rgb = input.getRGB(x, y);
        if (!outerBackground[y * width + x]) {
          output.setRGB(x, y, 0xFF000000 | (rgb & 0xFFFFFF));
          continue;
        }

        removed++;
        int r = red(rgb), g = green(rgb), b = blue(rgb);
        double dr = 255 - r, dg = 255 - g, db = 255 - b;
        double distance = Math.sqrt(dr * dr + dg * dg + db * db);

        // Smooth anti-aliased edge transition and remove the white matte
        // from partially blended border pixels.
        double alpha = Math.max(0.0, Math.min(1.0, (distance - 22.0) / 90.0));
        int a = clamp((int)Math.round(alpha * 255.0));
        if (a < 8) {
          output.setRGB(x, y, 0x00000000);
        } else {
          int fr = unmatteAgainstWhite(r, alpha);
          int fg = unmatteAgainstWhite(g, alpha);
          int fb = unmatteAgainstWhite(b, alpha);
          output.setRGB(x, y, (a << 24) | (fr << 16) | (fg << 8) | fb);
        }
      }
    }

    if (removed < (count / 100)) {
      throw new IllegalStateException("Outer white background was not detected; refusing to ship an unchanged icon.");
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

  private static void verifyTransparentCorners(BufferedImage image, String label) {
    int w = image.getWidth(), h = image.getHeight();
    int[][] points = {{0,0},{w-1,0},{0,h-1},{w-1,h-1}};
    for (int[] point : points) {
      int alpha = image.getRGB(point[0], point[1]) >>> 24;
      if (alpha != 0) {
        throw new IllegalStateException(label + " must have transparent outer corners.");
      }
    }
    if ((image.getRGB(w / 2, h / 2) >>> 24) == 0) {
      throw new IllegalStateException(label + " lost its central SMV ASTRO artwork.");
    }
  }

  private static BufferedImage drawScaled(BufferedImage source, int canvasSize, int artSize) {
    BufferedImage output = new BufferedImage(canvasSize, canvasSize, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = qualityGraphics(output);
    int offset = (canvasSize - artSize) / 2;
    g.drawImage(source, offset, offset, artSize, artSize, null);
    g.dispose();
    return output;
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 2) throw new IllegalArgumentException("Usage: input-icon.png output-res-dir");
    Path inputPath = Paths.get(args[0]);
    Path res = Paths.get(args[1]);
    BufferedImage original = ImageIO.read(inputPath.toFile());
    if (original == null || original.getWidth() != original.getHeight() || original.getWidth() < 192) {
      throw new IllegalArgumentException("Existing SMV ASTRO icon must be a readable square PNG of at least 192px.");
    }

    BufferedImage transparent = removeOuterWhiteBackground(original);
    verifyTransparentCorners(transparent, "Transparent source icon");

    // Square legacy launcher: same existing artwork, only the outside canvas
    // becomes transparent; no logo, words, border or artwork is redesigned.
    ImageIO.write(transparent, "png", res.resolve("mipmap-nodpi/ic_launcher.png").toFile());

    // Android adaptive foreground: retain the full composition at a slightly
    // inset size so central wording survives circular and squircle masks.
    BufferedImage adaptiveForeground = drawScaled(transparent, ADAPTIVE_CANVAS, ADAPTIVE_ART_SIZE);
    verifyTransparentCorners(adaptiveForeground, "Adaptive foreground");
    ImageIO.write(adaptiveForeground, "png", res.resolve("drawable-nodpi/ic_launcher_foreground.png").toFile());

    // Legacy round launcher: a circular burgundy background with the same
    // transparent artwork inset so the original wordmark remains visible.
    BufferedImage round = new BufferedImage(ROUND_CANVAS, ROUND_CANVAS, BufferedImage.TYPE_INT_ARGB);
    Graphics2D rg = qualityGraphics(round);
    rg.setClip(new Ellipse2D.Double(0, 0, ROUND_CANVAS, ROUND_CANVAS));
    rg.setColor(new Color(LAUNCHER_BACKGROUND));
    rg.fillRect(0, 0, ROUND_CANVAS, ROUND_CANVAS);
    rg.setComposite(AlphaComposite.SrcOver);
    int roundOffset = (ROUND_CANVAS - ROUND_ART_SIZE) / 2;
    rg.drawImage(transparent, roundOffset, roundOffset, ROUND_ART_SIZE, ROUND_ART_SIZE, null);
    rg.dispose();
    ImageIO.write(round, "png", res.resolve("mipmap-nodpi/ic_launcher_round.png").toFile());

    String colorHex = String.format("#%06X", LAUNCHER_BACKGROUND);
    String colorsXml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<resources>\n    <color name=\"smv_launcher_background\">" + colorHex + "</color>\n</resources>\n";
    Files.writeString(res.resolve("values/colors.xml"), colorsXml);

    String adaptiveXml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">\n" +
      "    <background android:drawable=\"@color/smv_launcher_background\" />\n" +
      "    <foreground android:drawable=\"@drawable/ic_launcher_foreground\" />\n" +
      "</adaptive-icon>\n";
    Files.writeString(res.resolve("mipmap-anydpi-v26/ic_launcher.xml"), adaptiveXml);
    Files.writeString(res.resolve("mipmap-anydpi-v26/ic_launcher_round.xml"), adaptiveXml);

    System.out.println("PASS: Removed only the outer near-white connected background from the existing SMV ASTRO artwork.");
    System.out.println("PASS: Preserved the central artwork and verified transparent corners in the square and adaptive PNGs.");
    System.out.println("Generated adaptive, round and square launcher assets from public/assets/icon-512.png. Background: " + colorHex);
  }
}
JAVA

javac -encoding UTF-8 -d "$generator_dir" "$generator_dir/SmvLauncherIconGenerator.java"
java -Djava.awt.headless=true -cp "$generator_dir" SmvLauncherIconGenerator "$source_icon" "$res"

for asset in \
  "$res/drawable-nodpi/ic_launcher_foreground.png" \
  "$res/mipmap-nodpi/ic_launcher.png" \
  "$res/mipmap-nodpi/ic_launcher_round.png" \
  "$res/mipmap-anydpi-v26/ic_launcher.xml" \
  "$res/mipmap-anydpi-v26/ic_launcher_round.xml" \
  "$res/values/colors.xml"; do
  test -s "$asset" || { echo "::error::Generated launcher resource is missing: $asset"; exit 1; }
done

echo "Existing SMV ASTRO artwork is ready for transparent square, adaptive and round Android launchers."
JAVA
