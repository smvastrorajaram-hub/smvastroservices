import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Ellipse2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

/**
 * Builds compact Android launcher resources from the three approved JPEGs
 * stored in the repository's ICON folder. Website/PWA files are never edited.
 * Every generated image is a JPEG and is strictly limited to 300,000 bytes.
 */
public final class SmvProductLauncherIconGenerator {
  private static final int ADAPTIVE_CANVAS = 432; // 108dp at 4px per dp
  private static final int ADAPTIVE_ART_SIZE = 232; // 58dp, within Android's 66dp safe zone
  private static final int ADAPTIVE_CORNER_RADIUS = 64; // 16dp
  private static final int LEGACY_CANVAS = 512;
  private static final int LEGACY_ART_SIZE = 275; // 58dp at the legacy canvas scale
  private static final int LEGACY_CORNER_RADIUS = 76; // 16dp
  private static final int WHITE = 0xFFFFFF;
  private static final int MAX_ASSET_BYTES = 300000;

  private static Graphics2D qualityGraphics(BufferedImage image) {
    Graphics2D g = image.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
    g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    return g;
  }

  /**
   * Retains the complete supplied square icon, including its original white
   * rounded-square canvas. The tile is centered inside a white Android canvas.
   */
  private static BufferedImage renderIcon(BufferedImage source, int canvas, int artSize,
                                           int cornerRadius, boolean roundCanvas) {
    BufferedImage output = new BufferedImage(canvas, canvas, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = qualityGraphics(output);
    g.setColor(Color.WHITE);
    g.fillRect(0, 0, canvas, canvas);
    if (roundCanvas) {
      g.setClip(new Ellipse2D.Double(0, 0, canvas, canvas));
    }
    int offset = (canvas - artSize) / 2;
    g.clip(new RoundRectangle2D.Double(offset, offset, artSize, artSize,
        cornerRadius * 2.0, cornerRadius * 2.0));
    g.drawImage(source, offset, offset, artSize, artSize, null);
    g.dispose();
    return output;
  }

  private static byte[] encodeJpeg(BufferedImage image, float quality) throws IOException {
    Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
    if (!writers.hasNext()) throw new IOException("Java JPEG encoder is unavailable.");
    ImageWriter writer = writers.next();
    try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
         ImageOutputStream output = ImageIO.createImageOutputStream(bytes)) {
      writer.setOutput(output);
      ImageWriteParam params = writer.getDefaultWriteParam();
      if (params.canWriteCompressed()) {
        params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        params.setCompressionQuality(quality);
      }
      writer.write(null, new IIOImage(image, null, null), params);
      output.flush();
      return bytes.toByteArray();
    } finally {
      writer.dispose();
    }
  }

  private static long writeJpegUnderLimit(BufferedImage image, Path target) throws IOException {
    Files.createDirectories(target.getParent());
    IOException lastError = null;
    for (float quality = 0.92f; quality >= 0.52f; quality -= 0.04f) {
      try {
        byte[] encoded = encodeJpeg(image, quality);
        if (encoded.length <= MAX_ASSET_BYTES) {
          Files.write(target, encoded);
          if (!Files.isRegularFile(target) || Files.size(target) != encoded.length) {
            throw new IOException("Generated JPEG was not written completely: " + target);
          }
          return encoded.length;
        }
      } catch (IOException error) {
        lastError = error;
        break;
      }
    }
    if (lastError != null) throw lastError;
    throw new IOException("Could not compress " + target + " below the 300,000-byte launcher asset limit.");
  }

  private static void verifySource(BufferedImage source, Path sourcePath) {
    if (source == null || source.getWidth() != source.getHeight() || source.getWidth() < 512) {
      throw new IllegalArgumentException("Approved icon must be a readable square JPG of at least 512x512: " + sourcePath);
    }
    int center = source.getRGB(source.getWidth() / 2, source.getHeight() / 2) & 0xFFFFFF;
    if (center == WHITE) {
      throw new IllegalArgumentException("Approved icon center is unexpectedly white; refusing to create a blank launcher icon: " + sourcePath);
    }
  }

  private static void writeAdaptiveXml(Path res) throws IOException {
    Path adaptive = res.resolve("mipmap-anydpi-v26");
    Path values = res.resolve("values");
    Files.createDirectories(adaptive);
    Files.createDirectories(values);
    String xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">\n" +
      "    <background android:drawable=\"@color/smv_launcher_background\" />\n" +
      "    <foreground android:drawable=\"@drawable/ic_launcher_foreground\" />\n" +
      "</adaptive-icon>\n";
    Files.writeString(adaptive.resolve("ic_launcher.xml"), xml);
    Files.writeString(adaptive.resolve("ic_launcher_round.xml"), xml);
    Files.writeString(values.resolve("colors.xml"),
      "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<resources>\n    <color name=\"smv_launcher_background\">#FFFFFF</color>\n</resources>\n");
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 2) {
      throw new IllegalArgumentException("Usage: SmvProductLauncherIconGenerator ICON/app-icon.jpg output-res-directory");
    }
    Path inputPath = Paths.get(args[0]);
    Path res = Paths.get(args[1]);
    BufferedImage source = ImageIO.read(inputPath.toFile());
    verifySource(source, inputPath);

    Path drawable = res.resolve("drawable-nodpi");
    Path mipmap = res.resolve("mipmap-nodpi");
    Files.createDirectories(drawable);
    Files.createDirectories(mipmap);

    long squareBytes = writeJpegUnderLimit(
      renderIcon(source, LEGACY_CANVAS, LEGACY_ART_SIZE, LEGACY_CORNER_RADIUS, false),
      mipmap.resolve("ic_launcher.jpg"));
    long roundBytes = writeJpegUnderLimit(
      renderIcon(source, LEGACY_CANVAS, LEGACY_ART_SIZE, LEGACY_CORNER_RADIUS, true),
      mipmap.resolve("ic_launcher_round.jpg"));
    long foregroundBytes = writeJpegUnderLimit(
      renderIcon(source, ADAPTIVE_CANVAS, ADAPTIVE_ART_SIZE, ADAPTIVE_CORNER_RADIUS, false),
      drawable.resolve("ic_launcher_foreground.jpg"));

    writeAdaptiveXml(res);

    System.out.println("PASS: Used the supplied " + inputPath.getFileName() + " artwork unchanged in design.");
    System.out.println("PASS: 512x512 square " + squareBytes + " bytes; 512x512 round " + roundBytes +
      " bytes; 432x432 adaptive foreground " + foregroundBytes + " bytes.");
    System.out.println("PASS: Every generated Android icon image is below 300,000 bytes.");
  }
}
