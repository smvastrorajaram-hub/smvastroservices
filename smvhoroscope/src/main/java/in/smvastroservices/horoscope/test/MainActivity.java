package in.smvastroservices.horoscope.test;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;

import androidx.browser.customtabs.CustomTabsIntent;

public class MainActivity extends Activity {
    private static final String START_URL = "https://horoscope.smvastroservices.in/?lang=en&source=android-test";
    private boolean launchedExternal = false;
    private boolean wasPaused = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (savedInstanceState == null) {
            openSite();
        }
    }

    private void openSite() {
        Uri uri = Uri.parse(START_URL);
        try {
            CustomTabsIntent tabs = new CustomTabsIntent.Builder()
                    .setShowTitle(false)
                    .build();
            launchedExternal = true;
            tabs.launchUrl(this, uri);
            return;
        } catch (Exception ignored) {
            // Fall through to the normal browser intent.
        }

        try {
            Intent browser = new Intent(Intent.ACTION_VIEW, uri);
            browser.addCategory(Intent.CATEGORY_BROWSABLE);
            launchedExternal = true;
            startActivity(browser);
        } catch (ActivityNotFoundException e) {
            launchedExternal = false;
            TextView message = new TextView(this);
            message.setGravity(Gravity.CENTER);
            message.setPadding(32, 32, 32, 32);
            message.setText("SMV HOROSCOPE could not open a browser. Please install or enable Chrome or another web browser.");
            setContentView(message);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (launchedExternal) wasPaused = true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (launchedExternal && wasPaused) {
            finish();
        }
    }
}
