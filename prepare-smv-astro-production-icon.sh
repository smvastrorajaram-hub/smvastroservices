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
  private static int averageCornerColor(BufferedImage image) {
    int[][] points = {
      {0, 0}, {image.getWidth()-1, 0},
      {0, image.getHeight()-1}, {image.getWidth()-1, image.getHeight()-1}
    };
    long red=0, green=0, blue=0;
    for (int[] point : points) {
      int rgb = image.getRGB(point[0], point[1]);
      red += (rgb >> 16) & 255;
      green += (rgb >> 8) & 255;
      blue += rgb & 255;
    }
    return (int)(((red/4) << 16) | ((green/4) << 8) | (blue/4));
  }

  private static Graphics2D qualityGraphics(BufferedImage image) {
    Graphics2D g = image.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
    g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    return g;
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 2) throw new IllegalArgumentException("Usage: input-icon.png output-res-dir");
    File input = new File(args[0]);
    Path res = Paths.get(args[1]);
    BufferedImage source = ImageIO.read(input);
    if (source == null || source.getWidth() != source.getHeight() || source.getWidth() < 192) {
      throw new IllegalArgumentException("Existing SMV ASTRO icon must be a readable square PNG of at least 192px.");
    }

    int background = averageCornerColor(source);
    Color backgroundColor = new Color(background);

    // Place the existing artwork inside the central circular mask-safe region.
    BufferedImage foreground = new BufferedImage(432, 432, BufferedImage.TYPE_INT_ARGB);
    Graphics2D fg = qualityGraphics(foreground);
    int adaptiveSize = 300;
    int adaptiveOffset = (432 - adaptiveSize) / 2;
    fg.drawImage(source, adaptiveOffset, adaptiveOffset, adaptiveSize, adaptiveSize, null);
    fg.dispose();
    ImageIO.write(foreground, "png", res.resolve("drawable-nodpi/ic_launcher_foreground.png").toFile());

    // Preserve the exact current artwork for non-adaptive square launchers.
    Files.copy(input.toPath(), res.resolve("mipmap-nodpi/ic_launcher.png"), StandardCopyOption.REPLACE_EXISTING);

    // Provide a circular pre-adaptive fallback with enough inset for the full artwork.
    BufferedImage round = new BufferedImage(512, 512, BufferedImage.TYPE_INT_ARGB);
    Graphics2D rg = qualityGraphics(round);
    rg.setClip(new Ellipse2D.Double(0, 0, 512, 512));
    rg.setColor(backgroundColor);
    rg.fillRect(0, 0, 512, 512);
    int roundSize = 350;
    int roundOffset = (512 - roundSize) / 2;
    rg.drawImage(source, roundOffset, roundOffset, roundSize, roundSize, null);
    rg.dispose();
    ImageIO.write(round, "png", res.resolve("mipmap-nodpi/ic_launcher_round.png").toFile());

    String colorHex = String.format("#%06X", background);
    String colorsXml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<resources>\n    <color name=\"smv_launcher_background\">" + colorHex + "</color>\n</resources>\n";
    Files.writeString(res.resolve("values/colors.xml"), colorsXml);

    String adaptive = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
      "<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">\n" +
      "    <background android:drawable=\"@color/smv_launcher_background\" />\n" +
      "    <foreground android:drawable=\"@drawable/ic_launcher_foreground\" />\n" +
      "</adaptive-icon>\n";
    Files.writeString(res.resolve("mipmap-anydpi-v26/ic_launcher.xml"), adaptive);
    Files.writeString(res.resolve("mipmap-anydpi-v26/ic_launcher_round.xml"), adaptive);

    System.out.println("Generated SMV ASTRO adaptive, round and legacy icons from the existing 512px artwork. Background: " + colorHex);
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

echo "Existing SMV ASTRO icon successfully prepared for adaptive and legacy Android launchers."
