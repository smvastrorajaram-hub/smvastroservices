package in.smvastroservices.smvastro;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceRequest;
import android.webkit.ServiceWorkerController;
import android.webkit.ServiceWorkerWebSettings;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

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
                if (isIncomingLivePushIntent(getIntent())) {
                    webView.loadUrl(resolveStartUrl(getIntent()));
                }
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
        // Keep the WebView HTTP cache in normal online-first mode. The website's
        // scoped Service Workers own versioned UI/offline caches and refresh them
        // from the network; never clear WebView or origin storage on app launch.
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        ServiceWorkerWebSettings serviceWorkerSettings =
                ServiceWorkerController.getInstance().getServiceWorkerWebSettings();
        serviceWorkerSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        serviceWorkerSettings.setBlockNetworkLoads(false);
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

        // Native PDF controls are exposed only on the trusted SMV ASTRO Horoscope print page.
        webView.addJavascriptInterface(new NativePdfBridge(), "SMVAstroNativePdf");

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
                configureAstroPdfActions(view, url);
                applyAstroHoroscopeReportLayout(view, url);
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

    private boolean isAstroHoroscopePrintPageUrl(String rawUrl) {
        if (rawUrl == null) return false;
        try {
            Uri uri = Uri.parse(rawUrl);
            int port = uri.getPort();
            String host = lower(uri.getHost());
            String path = uri.getPath();

            // The Horoscope shell redirects from smvastroservices.in to its
            // canonical subdomain. Saved-report handoff is relative, so the
            // actual Android WebView URL is /report-print.html on that host.
            // Keep the exact legacy ASTRO path too; never trust a wildcard host.
            boolean canonicalHoroscopeReport =
                    "horoscope.smvastroservices.in".equals(host)
                            && "/report-print.html".equals(path);
            boolean legacyAstroReport =
                    ownsHost(host)
                            && "/horoscope/report-print.html".equals(path);

            return "https".equals(lower(uri.getScheme()))
                    && (port == -1 || port == 443)
                    && (canonicalHoroscopeReport || legacyAstroReport);
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private boolean isAstroLiveReceiptPageUrl(String rawUrl) {
        if (rawUrl == null) return false;
        try {
            Uri uri = Uri.parse(rawUrl);
            int port = uri.getPort();
            String host = lower(uri.getHost());
            String path = uri.getPath();
            return "https".equals(lower(uri.getScheme()))
                    && (port == -1 || port == 443)
                    && ownsHost(host)
                    && "/live-session-receipt.html".equals(path);
        } catch (RuntimeException ignored) {
            return false;
        }
    }
    private final class NativePdfBridge {
        @JavascriptInterface
        public void viewPdf() {
            runOnUiThread(() -> openAstroNativePdf(false));
        }

        @JavascriptInterface
        public void downloadPdf() {
            runOnUiThread(() -> openAstroNativePdf(true));
        }

        @JavascriptInterface
        public void viewLiveReceiptPdf() {
            runOnUiThread(() -> openAstroLiveReceiptPdf(false));
        }

        @JavascriptInterface
        public void downloadLiveReceiptPdf() {
            runOnUiThread(() -> openAstroLiveReceiptPdf(true));
        }
    }

    private void openAstroLiveReceiptPdf(boolean download) {
        String currentUrl = webView == null ? null : webView.getUrl();
        if (!isAstroLiveReceiptPageUrl(currentUrl)) {
            Toast.makeText(this, "Open a trusted SMV ASTRO Live Session receipt before creating its PDF.", Toast.LENGTH_LONG).show();
            return;
        }
        openAstroNativePdf(download);
    }

    private void openAstroNativePdf(boolean download) {
        String currentUrl = webView == null ? null : webView.getUrl();
        boolean horoscopeReport = isAstroHoroscopePrintPageUrl(currentUrl);
        boolean liveReceipt = isAstroLiveReceiptPageUrl(currentUrl);
        if (!horoscopeReport && !liveReceipt) {
            Toast.makeText(this, "Open a trusted SMV ASTRO receipt or Horoscope report before creating its PDF.", Toast.LENGTH_LONG).show();
            return;
        }
        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) {
            Toast.makeText(this, "Android PDF print service is unavailable on this device.", Toast.LENGTH_LONG).show();
            return;
        }
        String jobName = liveReceipt
                ? (download ? "SMV ASTRO Live Session Receipt Download" : "SMV ASTRO Live Session Receipt")
                : (download ? "SMV ASTRO Horoscope PDF Download" : "SMV ASTRO Horoscope PDF View");
        String resolutionId = liveReceipt ? "smv_astro_live_receipt_pdf" : "smv_astro_horoscope_pdf";
        String resolutionLabel = liveReceipt ? "SMV ASTRO Live Session Receipt" : "SMV ASTRO Horoscope PDF";
        try {
            PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setResolution(new PrintAttributes.Resolution(resolutionId, resolutionLabel, 300, 300))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
            printManager.print(jobName, webView.createPrintDocumentAdapter(jobName), attributes);
            String message = download
                    ? "PDF preview opened. Choose ‘Save as PDF’ to save it on your device."
                    : "PDF preview opened. You can review it or choose ‘Save as PDF’.";
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        } catch (RuntimeException ex) {
            Toast.makeText(this, "Could not create the SMV ASTRO PDF: " + ex.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
    private void configureAstroPdfActions(WebView view, String url) {
        if (view == null || !isAstroHoroscopePrintPageUrl(url)) return;
        String script = "(function(){try{" +
                "var preview=document.getElementById('printNow'),nav=document.querySelector('.print-tools');" +
                "if(!preview||!nav)return;" +
                "var ta=(document.documentElement.lang||'').toLowerCase().indexOf('ta')===0;" +
                "preview.textContent=ta?'PDF பார்க்க':'View PDF';" +
                "preview.setAttribute('aria-label',ta?'PDF முன்னோட்டம் பார்க்க':'Open PDF preview');" +
                "var status=function(message){var node=document.getElementById('printStatus');if(node)node.textContent=message;};" +
                "var invoke=function(download){try{var bridge=window.SMVAstroNativePdf;if(!bridge){status(ta?'இந்த Android பதிப்பில் PDF வசதி இல்லை. App-ஐ Update செய்யவும்.':'Native PDF bridge is unavailable. Update the SMV ASTRO app.');return;}if(download)bridge.downloadPdf();else bridge.viewPdf();}catch(e){status(String(e&&e.message||e));}};" +
                "if(!window.__smvAstroAndroidPdfClickCaptureInstalled){" +
                "var clickHandler=function(event){var target=event.target;if(target&&target.nodeType!==1)target=target.parentElement;var button=target&&target.closest?target.closest('#printNow,#smvAstroAndroidPdfDownload'):null;if(!button||button.disabled)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();invoke(button.id==='smvAstroAndroidPdfDownload');};" +
                "document.addEventListener('click',clickHandler,true);window.__smvAstroAndroidPdfClickCaptureInstalled=true;}" +
                "window.print=function(){invoke(false);};" +
                "var save=document.getElementById('smvAstroAndroidPdfDownload');" +
                "if(!save){save=document.createElement('button');save.type='button';save.id='smvAstroAndroidPdfDownload';save.className=preview.className;save.textContent=ta?'PDF பதிவிறக்கம்':'Download PDF';save.disabled=preview.disabled;preview.insertAdjacentElement('afterend',save);}" +
                "save.setAttribute('aria-label',ta?'PDF பதிவிறக்கம்':'Download PDF');" +
                "if(window.MutationObserver&&!save.__smvObserver){save.__smvObserver=new MutationObserver(function(){save.disabled=preview.disabled;});save.__smvObserver.observe(preview,{attributes:true,attributeFilter:['disabled']});}" +
                "}catch(e){var node=document.getElementById('printStatus');if(node)node.textContent=String(e&&e.message||e);}})();";
        view.evaluateJavascript(script, null);
    }

    private void applyAstroHoroscopeReportLayout(WebView view, String url) {
        if (view == null || !isAstroHoroscopePrintPageUrl(url)) return;
        String script = "(function(){try{" +
                "var root=document.getElementById('printReport');if(!root)return;" +
                "var sheet=Array.prototype.find.call(document.styleSheets,function(x){return x.href&&x.href.indexOf('report-print.css')!==-1;});" +
                "if(sheet){" +
                "if(!window.__smvAstroAndroidResponsivePdfCss){" +
                "var css='@media screen and (max-width:720px){html,body{width:100%;max-width:100%;overflow-x:hidden}main{width:100%;max-width:100%;padding:0 8px}#printReport{width:100%;max-width:100%;overflow:visible}#printReport .smv-android-table-scroll{display:block!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;padding-bottom:5px!important}#printReport table{width:100%!important;max-width:100%!important;table-layout:auto!important}#printReport table.smv-android-wide-table{width:max-content!important;min-width:680px!important;max-width:none!important;table-layout:auto!important}#printReport table.smv-android-wide-table.smv-shadbala-table{min-width:900px!important}#printReport table.smv-android-wide-table th,#printReport table.smv-android-wide-table td{min-width:58px!important;max-width:180px!important;padding:7px 6px!important;font-size:12px!important;line-height:1.4!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important}#printReport .south-indian-chart{width:100%!important;max-width:560px!important;min-height:0!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(4,minmax(68px,auto))!important}#printReport .south-rasi-cell{min-width:0!important;padding:5px!important;font-size:clamp(10px,2.7vw,14px)!important}#printReport .south-chart-center{font-size:clamp(15px,4vw,22px)!important}#printReport .sbc-grid-full{width:100%!important;max-width:100%!important;grid-template-rows:repeat(9,minmax(70px,auto))!important}}';" +
                "try{sheet.insertRule(css,sheet.cssRules.length);window.__smvAstroAndroidResponsivePdfCss=true;}catch(e){}}" +
                "if(!window.__smvAstroAndroidPrintPdfCss){" +
                "var printCss='@media print{html,body{width:auto!important;max-width:none!important;overflow:visible!important}main{width:100%!important;max-width:184mm!important;margin:0 auto!important;padding:0!important}#printReport{width:100%!important;max-width:184mm!important;overflow:visible!important}#printReport .smv-android-table-scroll,#printReport .smv-shadbala-scroll,#printReport .data-table-wrap,#printReport .adv-table-wrap,#printReport .smv-v257-table-wrap{display:block!important;width:100%!important;max-width:100%!important;overflow:visible!important;overflow-x:visible!important;overflow-y:visible!important}#printReport table{width:100%!important;max-width:100%!important}#printReport table.smv-android-wide-table{width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important;font-size:6.3pt!important;line-height:1.18!important}#printReport table.smv-android-wide-table th,#printReport table.smv-android-wide-table td{min-width:0!important;max-width:none!important;padding:.7mm .55mm!important;font-size:6.3pt!important;line-height:1.18!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important}#printReport table.smv-shadbala-table{width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important;font-size:6pt!important}#printReport .south-indian-chart{display:grid!important;width:132mm!important;max-width:100%!important;min-height:112mm!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(4,minmax(26mm,auto))!important;break-inside:avoid!important;page-break-inside:avoid!important}#printReport .south-rasi-cell{min-width:0!important;padding:1.5mm!important;font-size:8pt!important;line-height:1.35!important;overflow-wrap:anywhere!important}#printReport .south-chart-center{font-size:13pt!important}#printReport .sbc-grid-full{width:174mm!important;max-width:100%!important;grid-template-columns:repeat(9,minmax(0,1fr))!important;grid-template-rows:repeat(9,minmax(11mm,auto))!important;break-inside:avoid!important;page-break-inside:avoid!important}}';" +
                "try{sheet.insertRule(printCss,sheet.cssRules.length);window.__smvAstroAndroidPrintPdfCss=true;}catch(e){}}" +
                "}" +
                "var enhance=function(){root.querySelectorAll('table').forEach(function(table){var cols=0;Array.prototype.forEach.call(table.rows,function(row){cols=Math.max(cols,row.cells.length);});if(cols<6)return;table.classList.add('smv-android-wide-table');var wrap=table.closest('.data-table-wrap,.adv-table-wrap,.smv-shadbala-scroll,.smv-v257-table-wrap,.smv-android-table-scroll');if(!wrap){wrap=document.createElement('div');wrap.className='smv-android-table-scroll';table.parentNode.insertBefore(wrap,table);wrap.appendChild(table);}else{wrap.classList.add('smv-android-table-scroll');}});};enhance();" +
                "if(window.MutationObserver&&!window.__smvAstroAndroidReportObserver){window.__smvAstroAndroidReportObserver=new MutationObserver(enhance);window.__smvAstroAndroidReportObserver.observe(root,{childList:true,subtree:true});}" +
                "}catch(e){}})();";
        view.evaluateJavascript(script, null);
    }

    private void hidePwaInstallUi(WebView view) {
        if (view == null) return;
        String script = "(function(){try{" +
                "['smvInstallAppSection','smvPermanentAndroidAppSection','adminGroupAppManagement','smvHoroscopeInstallArea','smvCalendarInstallArea'].forEach(function(x){var e=document.getElementById(x);if(e){e.hidden=true;e.style.display='none';e.setAttribute('aria-hidden','true');}});" +
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
        if (isIncomingLivePushIntent(intent)) {
            Uri.Builder target = Uri.parse(HOME_URL).buildUpon()
                    .appendQueryParameter("smvLivePush", "1");
            String sessionId = intentString(intent, "sessionId");
            String bookingId = intentString(intent, "bookingId");
            if (!sessionId.isEmpty()) target.appendQueryParameter("smvSessionId", sessionId);
            if (!bookingId.isEmpty()) target.appendQueryParameter("smvBookingId", bookingId);
            return target.build().toString();
        }
        return HOME_URL;
    }

    private static boolean isIncomingLivePushIntent(Intent intent) {
        String type = intentString(intent, "type");
        return "live_request".equals(type) || "live_booking".equals(type);
    }

    private static String intentString(Intent intent, String key) {
        if (intent == null || key == null) return "";
        try {
            String value = intent.getStringExtra(key);
            return value == null ? "" : value.trim();
        } catch (RuntimeException ignored) {
            return "";
        }
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
        if ("horoscope.smvastroservices.in".equals(host)) return "in.smvastroservices.horoscope";
        if ("calendar.smvastroservices.in".equals(host)) return "in.smvastroservices.calendar";
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
        if (webView != null) {
            webView.onResume();
            // A retained WebView may keep stale dashboard data after Android backgrounds it.
            // Ask the authenticated page to reconcile only after its JS task has resumed.
            webView.postDelayed(() -> {
                if (webView != null && appVisible) {
                    webView.evaluateJavascript(
                        "window.__smvAndroidAppResumed && window.__smvAndroidAppResumed();", null);
                }
            }, 350);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        // Keep SMV ASTRO as a standby task in Android Recents instead of finishing it.
        moveTaskToBack(true);
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
