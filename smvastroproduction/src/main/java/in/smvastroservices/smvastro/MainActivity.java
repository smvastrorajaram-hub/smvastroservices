package in.smvastroservices.smvastro;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static volatile boolean appVisible = false;

    public static boolean isAppVisible() {
        return appVisible;
    }
    private static final String HOME_URL = "https://smvastroservices.in/";
    private static final String OWN_HOST = "smvastroservices.in";
    private static final String EXTRA_URL = "smv_open_url";
    private static final int FILE_CHOOSER_REQUEST = 6001;
    private static final int REQUEST_POST_NOTIFICATIONS = 7412;
    private static final int REQUEST_RECORD_AUDIO = 7413;

    private WebView webView;
    private ProgressBar progress;
    private ValueCallback<Uri[]> fileChooserCallback;
    private final List<PermissionRequest> pendingAudioPermissionRequests = new ArrayList<>();
    private boolean recordAudioPermissionPromptInFlight = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            buildWebView();
            if (savedInstanceState != null) {
                webView.restoreState(savedInstanceState);
            } else {
                webView.loadUrl(resolveStartUrl(getIntent()));
            }
        } catch (Throwable t) {
            showFatalMessage("SMV ASTRO could not start the Android WebView. Please enable or update Android System WebView/Chrome, then reopen the app.");
        }
    }

    private void buildWebView() {
        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);

        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3));
        progressParams.gravity = Gravity.TOP;

        root.addView(webView, webParams);
        root.addView(progress, progressParams);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                hidePwaInstallUi(view);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                hidePwaInstallUi(view);
                requestNotificationPermissionIfNeeded();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (request == null) return;
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (request == null) return;
                runOnUiThread(() -> pendingAudioPermissionRequests.remove(request));
            }

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress >= 100 ? android.view.View.GONE : android.view.View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = filePathCallback;
                try {
                    Intent chooser = fileChooserParams.createIntent();
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    fileChooserCallback = null;
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> openExternal(Uri.parse(url)));

        NativeWebBridge.install(this, webView);
    }

    private void hidePwaInstallUi(WebView view) {
        if (view == null) return;
        String script = "(function(){try{" +
                "['smvInstallAppSection','smvPermanentAndroidAppSection','smvHoroscopeInstallArea','smvCalendarInstallArea'].forEach(function(x){var e=document.getElementById(x);if(e){e.hidden=true;e.setAttribute('aria-hidden','true');}});" +
                "}catch(e){}})();";
        view.evaluateJavascript(script, null);
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        if (webView == null || isFinishing() || isDestroyed()
                || !isTrustedAudioOrigin(request.getOrigin())
                || !requestsAudioCaptureOnly(request.getResources())) {
            denyWebPermissionRequest(request);
            return;
        }

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            grantWebAudioPermission(request);
            return;
        }

        if (!pendingAudioPermissionRequests.contains(request)) pendingAudioPermissionRequests.add(request);
        if (recordAudioPermissionPromptInFlight) return;
        recordAudioPermissionPromptInFlight = true;
        try {
            requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, REQUEST_RECORD_AUDIO);
        } catch (RuntimeException permissionError) {
            recordAudioPermissionPromptInFlight = false;
            settlePendingAudioPermissionRequests(false);
        }
    }

    private static boolean requestsAudioCaptureOnly(String[] resources) {
        return resources != null && resources.length == 1
                && PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resources[0]);
    }

    private static boolean isTrustedAudioOrigin(Uri origin) {
        if (origin == null || !"https".equalsIgnoreCase(origin.getScheme())) return false;
        int port = origin.getPort();
        if (port != -1 && port != 443) return false;
        String host = lower(origin.getHost());
        return "smvastroservices.in".equals(host) || "www.smvastroservices.in".equals(host);
    }

    private void grantWebAudioPermission(PermissionRequest request) {
        try { request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE }); }
        catch (RuntimeException ignored) { /* The WebView may cancel while Android permission UI is open. */ }
    }

    private static void denyWebPermissionRequest(PermissionRequest request) {
        try { request.deny(); } catch (RuntimeException ignored) { /* Ignore cancelled requests. */ }
    }

    private void settlePendingAudioPermissionRequests(boolean permissionGranted) {
        List<PermissionRequest> pending = new ArrayList<>(pendingAudioPermissionRequests);
        pendingAudioPermissionRequests.clear();
        for (PermissionRequest request : pending) {
            boolean stillTrusted = webView != null && !isFinishing() && !isDestroyed()
                    && isTrustedAudioOrigin(request.getOrigin())
                    && requestsAudioCaptureOnly(request.getResources());
            if (permissionGranted && stillTrusted
                    && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                grantWebAudioPermission(request);
            } else {
                denyWebPermissionRequest(request);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_RECORD_AUDIO) return;
        recordAudioPermissionPromptInFlight = false;
        boolean granted = grantResults != null && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        settlePendingAudioPermissionRequests(granted);
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < 33) return;
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        android.content.SharedPreferences preferences = getSharedPreferences(SmvAstroApplication.PUSH_PREFS, MODE_PRIVATE);
        if (preferences.getBoolean("post_notifications_prompted", false)) return;
        preferences.edit().putBoolean("post_notifications_prompted", true).apply();
        requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, REQUEST_POST_NOTIFICATIONS);
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
        String scheme = lower(uri.getScheme());
        if ("http".equals(scheme) || "https".equals(scheme)) {
            String host = lower(uri.getHost());
            if (isSmvHost(host)) {
                String siblingPackage = packageForHost(host);
                if (siblingPackage != null && !siblingPackage.equals(getPackageName()) && launchSibling(siblingPackage, uri.toString())) {
                    return true;
                }
                return false;
            }
            openExternal(uri);
            return true;
        }

        if ("intent".equals(scheme)) {
            try {
                Intent intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                startActivity(intent);
            } catch (Exception ignored) {}
            return true;
        }

        openExternal(uri);
        return true;
    }

    private boolean launchSibling(String packageName, String url) {
        try {
            Intent launch = getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch == null) return false;
            launch.putExtra(EXTRA_URL, url);
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(launch);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (Exception ignored) {}
    }

    private String resolveStartUrl(Intent intent) {
        String candidate = intent == null ? null : intent.getStringExtra(EXTRA_URL);
        if (candidate != null) {
            try {
                Uri uri = Uri.parse(candidate);
                String scheme = lower(uri.getScheme());
                String host = lower(uri.getHost());
                if (("https".equals(scheme) || "http".equals(scheme)) && ownsHost(host)) return candidate;
            } catch (Exception ignored) {}
        }
        return HOME_URL;
    }

    private boolean ownsHost(String host) {
        if (host == null) return false;
        if (OWN_HOST.equals(host)) return true;
        return "smvastroservices.in".equals(OWN_HOST) && "www.smvastroservices.in".equals(host);
    }

    private static boolean isSmvHost(String host) {
        return "smvastroservices.in".equals(host)
                || "www.smvastroservices.in".equals(host)
                || "horoscope.smvastroservices.in".equals(host)
                || "calendar.smvastroservices.in".equals(host);
    }

    private static String packageForHost(String host) {
        // The SMV ASTRO production app must not redirect internal links to the standalone Test APKs.
        return null;
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.US);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void showFatalMessage(String message) {
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextColor(Color.BLACK);
        text.setTextSize(16f);
        text.setGravity(Gravity.CENTER);
        text.setPadding(dp(24), dp(24), dp(24), dp(24));
        setContentView(text);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (webView != null) webView.loadUrl(resolveStartUrl(intent));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileChooserCallback != null) {
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileChooserCallback.onReceiveValue(result);
            fileChooserCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        appVisible = false;
        if (webView != null) webView.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        appVisible = true;
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        appVisible = false;
        for (PermissionRequest request : new ArrayList<>(pendingAudioPermissionRequests)) {
            denyWebPermissionRequest(request);
        }
        pendingAudioPermissionRequests.clear();
        recordAudioPermissionPromptInFlight = false;
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
