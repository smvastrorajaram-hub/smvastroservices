package in.smvastroservices.pages;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ServiceWorkerController;
import android.webkit.ServiceWorkerWebSettings;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String PAGES_HOST = "smvastroservices.pages.dev";
    private static final int FILE_CHOOSER_REQUEST = 6101;
    private static final int REQUEST_RECORD_AUDIO = 6102;
    private WebView webView;
    private ProgressBar progress;
    private ValueCallback<Uri[]> fileChooserCallback;
    private PermissionRequest pendingAudioRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            buildWebView();
            if (savedInstanceState != null) {
                webView.restoreState(savedInstanceState);
                if (webView.getUrl() == null) webView.loadUrl(BuildConfig.SMV_HOME_URL);
            } else {
                webView.loadUrl(BuildConfig.SMV_HOME_URL);
            }
        } catch (Throwable error) {
            showFatalMessage("SMV " + BuildConfig.SMV_PRODUCT.toUpperCase(Locale.US)
                    + " could not start. Please update Android System WebView/Chrome and reopen the app.");
        }
    }

    private void buildWebView() {
        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP);
        root.addView(progress, progressParams);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        // Each Pages.dev PWA owns its own versioned Service Worker cache. Keep the
        // standard online-first WebView cache and never erase website/app data.
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        ServiceWorkerWebSettings swSettings = ServiceWorkerController.getInstance()
                .getServiceWorkerWebSettings();
        swSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        swSettings.setBlockNetworkLoads(false);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        if (BuildConfig.SMV_PDF_ENABLED) {
            NativePdfBridge bridge = new NativePdfBridge();
            webView.addJavascriptInterface(bridge, "SMVNativePdf");
            if ("astro".equals(BuildConfig.SMV_PRODUCT)) {
                webView.addJavascriptInterface(bridge, "SMVAstroNativePdf");
            }
        }

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
                configurePdfActions(view, url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (request != null) runOnUiThread(() -> requestWebPermission(request));
            }
            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (request != null && request == pendingAudioRequest) pendingAudioRequest = null;
            }
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress >= 100 ? android.view.View.GONE : android.view.View.VISIBLE);
            }
            @Override
            public boolean onShowFileChooser(WebView target, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    fileChooserCallback = null;
                    return false;
                }
            }
        });
        webView.setDownloadListener((url, userAgent, disposition, mimeType, length) ->
                openExternal(Uri.parse(url)));
        if ("astro".equals(BuildConfig.SMV_PRODUCT)) NativeWebBridge.install(this, webView);
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
        String scheme = lower(uri.getScheme());
        if ("https".equals(scheme) && PAGES_HOST.equals(lower(uri.getHost()))) return false;
        if ("http".equals(scheme) || "https".equals(scheme)) {
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

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (Exception ignored) {}
    }

    private void hidePwaInstallUi(WebView view) {
        if (view == null) return;
        String script = "(function(){try{"
                + "var id='smv-pages-android-hide-install';"
                + "if(!document.getElementById(id)){var s=document.createElement('style');s.id=id;"
                + "s.textContent='#smvInstallAppSection,#smvPermanentAndroidAppSection,#adminGroupAppManagement,"
                + "#smvHoroscopeInstallArea,#smvCalendarInstallArea,#smvHoroscopeAndroidApkSection,"
                + "#smvCalendarAndroidApkSection,.cal-app-link,.cal-download-app-link{display:none!important;visibility:hidden!important}';"
                + "(document.head||document.documentElement).appendChild(s);}"
                + "['smvInstallAppSection','smvPermanentAndroidAppSection','adminGroupAppManagement',"
                + "'smvHoroscopeInstallArea','smvCalendarInstallArea','smvHoroscopeAndroidApkSection',"
                + "'smvCalendarAndroidApkSection'].forEach(function(id){var e=document.getElementById(id);"
                + "if(e){e.hidden=true;e.setAttribute('aria-hidden','true');}});"
                + "}catch(e){}})();";
        view.evaluateJavascript(script, null);
    }

    private boolean isTrustedPdfPage(String rawUrl) {
        if (rawUrl == null || !BuildConfig.SMV_PDF_ENABLED) return false;
        try {
            Uri uri = Uri.parse(rawUrl);
            int port = uri.getPort();
            return "https".equals(lower(uri.getScheme()))
                    && PAGES_HOST.equals(lower(uri.getHost()))
                    && (port == -1 || port == 443)
                    && BuildConfig.SMV_PDF_PATH.equals(uri.getPath());
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private void configurePdfActions(WebView view, String url) {
        if (view == null || !isTrustedPdfPage(url)) return;
        String bridgeName = "astro".equals(BuildConfig.SMV_PRODUCT)
                ? "SMVAstroNativePdf" : "SMVNativePdf";
        String saveId = "astro".equals(BuildConfig.SMV_PRODUCT)
                ? "smvAstroAndroidPdfDownload" : "smvAndroidPdfDownload";
        String script = "(function(){try{"
                + "var preview=document.getElementById('printNow'),nav=document.querySelector('.print-tools');"
                + "if(!preview||!nav)return;"
                + "var invoke=function(download){var api=window['" + bridgeName + "'];"
                + "if(!api){var s=document.getElementById('printStatus');if(s)s.textContent='Native PDF is unavailable. Update the app.';return;}"
                + "if(download)api.downloadPdf();else api.viewPdf();};"
                + "if(!window.__smvPagesAndroidPdfCapture){document.addEventListener('click',function(event){"
                + "var target=event.target;if(target&&target.nodeType!==1)target=target.parentElement;"
                + "var button=target&&target.closest?target.closest('#printNow,#" + saveId + "'):null;"
                + "if(!button||button.disabled)return;event.preventDefault();event.stopPropagation();"
                + "event.stopImmediatePropagation();invoke(button.id==='" + saveId + "');},true);"
                + "window.__smvPagesAndroidPdfCapture=true;}"
                + "window.print=function(){invoke(false);};"
                + "var save=document.getElementById('" + saveId + "');"
                + "if(!save){save=document.createElement('button');save.type='button';save.id='" + saveId + "';"
                + "save.className=preview.className;save.textContent='Download PDF';save.disabled=preview.disabled;"
                + "preview.insertAdjacentElement('afterend',save);}"
                + "if(window.MutationObserver&&!save.__smvPagesObserver){save.__smvPagesObserver=new MutationObserver(function(){save.disabled=preview.disabled;});"
                + "save.__smvPagesObserver.observe(preview,{attributes:true,attributeFilter:['disabled']});}"
                + "}catch(e){var s=document.getElementById('printStatus');if(s)s.textContent=String(e&&e.message||e);}})();";
        view.evaluateJavascript(script, null);
    }

    private final class NativePdfBridge {
        @JavascriptInterface
        public void viewPdf() { runOnUiThread(() -> openNativePdf(false)); }
        @JavascriptInterface
        public void downloadPdf() { runOnUiThread(() -> openNativePdf(true)); }
    }

    private void openNativePdf(boolean download) {
        if (webView == null || !isTrustedPdfPage(webView.getUrl())) {
            Toast.makeText(this, "Open a saved SMV report before creating its PDF.", Toast.LENGTH_LONG).show();
            return;
        }
        PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
        if (manager == null) {
            Toast.makeText(this, "Android PDF print service is unavailable.", Toast.LENGTH_LONG).show();
            return;
        }
        String jobName = "SMV " + BuildConfig.SMV_PRODUCT.toUpperCase(Locale.US)
                + (download ? " PDF Download" : " PDF View");
        try {
            PrintAttributes attrs = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setResolution(new PrintAttributes.Resolution("smv_pages_pdf", "SMV PDF", 300, 300))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS).build();
            manager.print(jobName, webView.createPrintDocumentAdapter(jobName), attrs);
            Toast.makeText(this, download ? "PDF preview opened. Choose Save as PDF."
                    : "PDF preview opened. You can review or save the report.", Toast.LENGTH_LONG).show();
        } catch (RuntimeException error) {
            Toast.makeText(this, "Could not create PDF: " + error.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void requestWebPermission(PermissionRequest request) {
        if (!"astro".equals(BuildConfig.SMV_PRODUCT) || !isTrustedPagesOrigin(request.getOrigin())
                || request.getResources() == null || request.getResources().length != 1
                || !PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(request.getResources()[0])) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            return;
        }
        if (pendingAudioRequest != null && pendingAudioRequest != request) pendingAudioRequest.deny();
        pendingAudioRequest = request;
        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO);
    }

    private static boolean isTrustedPagesOrigin(Uri origin) {
        if (origin == null || !"https".equalsIgnoreCase(origin.getScheme())) return false;
        int port = origin.getPort();
        return (port == -1 || port == 443) && PAGES_HOST.equalsIgnoreCase(origin.getHost());
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_RECORD_AUDIO) return;
        PermissionRequest request = pendingAudioRequest;
        pendingAudioRequest = null;
        if (request == null) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && isTrustedPagesOrigin(request.getOrigin())) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            request.deny();
        }
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
    protected void onSaveInstanceState(Bundle state) {
        if (webView != null) webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        if (pendingAudioRequest != null) {
            pendingAudioRequest.deny();
            pendingAudioRequest = null;
        }
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

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private void showFatalMessage(String message) {
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextColor(Color.BLACK);
        text.setTextSize(16f);
        text.setGravity(Gravity.CENTER);
        text.setPadding(dp(24), dp(24), dp(24), dp(24));
        setContentView(text);
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.US);
    }
}
