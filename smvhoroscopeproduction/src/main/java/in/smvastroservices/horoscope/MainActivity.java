package in.smvastroservices.horoscope;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
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

import java.util.Locale;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://horoscope.smvastroservices.in/?lang=en&source=android-production";
    private static final String OWN_HOST = "horoscope.smvastroservices.in";
    private static final String EXTRA_URL = "smv_open_url";
    private static final int FILE_CHOOSER_REQUEST = 6001;

    private WebView webView;
    private ProgressBar progress;
    private ValueCallback<Uri[]> fileChooserCallback;

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
            showFatalMessage("SMV HOROSCOPE could not start the Android WebView. Please enable or update Android System WebView/Chrome, then reopen the app.");
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

        // The native bridge exposes only fixed PDF actions. Each action re-checks
        // the exact trusted Horoscope report-print URL before opening Android UI.
        webView.addJavascriptInterface(new NativePdfBridge(), "SMVNativePdf");

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
                configureAndroidPdfActions(view, url);
                applyAndroidHoroscopeReportLayout(view, url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
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
    }

    private void hidePwaInstallUi(WebView view) {
        if (view == null) return;
        String script = "(function(){try{" +
                "var id='smv-android-production-hide-pwa-install';" +
                "if(!document.getElementById(id)){" +
                "var s=document.createElement('style');s.id=id;" +
                "s.textContent='#smvInstallAppSection,#smvHoroscopeInstallArea,#smvCalendarInstallArea,#smvHoroscopeAndroidApkSection,#smvCalendarAndroidApkSection,.cal-app-link,.cal-download-app-link{display:none!important;visibility:hidden!important}';" +
                "(document.head||document.documentElement).appendChild(s);" +
                "}" +
                "['smvInstallAppSection','smvHoroscopeInstallArea','smvCalendarInstallArea','smvHoroscopeAndroidApkSection','smvCalendarAndroidApkSection'].forEach(function(x){var e=document.getElementById(x);if(e){e.hidden=true;e.setAttribute('aria-hidden','true');}});" +
                "}catch(e){}})();";
        view.evaluateJavascript(script, null);
    }

    private boolean isHoroscopePrintPageUrl(String rawUrl) {
        if (rawUrl == null) return false;
        try {
            Uri uri = Uri.parse(rawUrl);
            return "https".equals(lower(uri.getScheme()))
                    && OWN_HOST.equals(lower(uri.getHost()))
                    && "/report-print.html".equals(uri.getPath());
        } catch (Exception ignored) {
            return false;
        }
    }

    private final class NativePdfBridge {
        @JavascriptInterface
        public void viewPdf() {
            runOnUiThread(() -> openNativePdf(false));
        }

        @JavascriptInterface
        public void downloadPdf() {
            runOnUiThread(() -> openNativePdf(true));
        }
    }

    private void openNativePdf(boolean download) {
        if (webView == null || !isHoroscopePrintPageUrl(webView.getUrl())) {
            Toast.makeText(this, "Open a saved Horoscope report before creating its PDF.", Toast.LENGTH_LONG).show();
            return;
        }
        PrintManager printManager = (PrintManager) getSystemService(android.content.Context.PRINT_SERVICE);
        if (printManager == null) {
            Toast.makeText(this, "Android PDF print service is unavailable on this device.", Toast.LENGTH_LONG).show();
            return;
        }
        String jobName = download ? "SMV HOROSCOPE PDF Download" : "SMV HOROSCOPE PDF View";
        try {
            PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setResolution(new PrintAttributes.Resolution("smv_horoscope_pdf", "SMV HOROSCOPE PDF", 300, 300))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
            printManager.print(jobName, webView.createPrintDocumentAdapter(jobName), attributes);
            String message = download
                    ? "PDF preview opened. Choose ‘Save as PDF’ to save the report on your device."
                    : "PDF preview opened. You can review it or choose ‘Save as PDF’.";
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        } catch (RuntimeException ex) {
            Toast.makeText(this, "Could not create the Horoscope PDF: " + ex.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void configureAndroidPdfActions(WebView view, String url) {
        if (view == null || !isHoroscopePrintPageUrl(url)) return;
        String script = "(function(){try{" +
                "if(window.__smvAndroidPdfActionsInstalled)return;window.__smvAndroidPdfActionsInstalled=true;" +
                "var preview=document.getElementById('printNow'),nav=document.querySelector('.print-tools');" +
                "if(!preview||!nav)return;" +
                "var ta=(document.documentElement.lang||'').toLowerCase().indexOf('ta')===0;" +
                "preview.textContent=ta?'PDF பார்க்க':'View PDF';" +
                "preview.setAttribute('aria-label',ta?'PDF முன்னோட்டம் பார்க்க':'Open PDF preview');" +
                "window.print=function(){try{window.SMVNativePdf.viewPdf();}catch(e){var s=document.getElementById('printStatus');if(s)s.textContent=String(e&&e.message||e);}};" +
                "var save=document.getElementById('smvAndroidPdfDownload');" +
                "if(!save){save=document.createElement('button');save.type='button';save.id='smvAndroidPdfDownload';save.className=preview.className;save.textContent=ta?'PDF பதிவிறக்கம்':'Download PDF';save.disabled=preview.disabled;preview.insertAdjacentElement('afterend',save);}" +
                "save.onclick=function(){if(save.disabled)return;var status=document.getElementById('printStatus');if(status)status.textContent=ta?'Android PDF சேமிப்பு திறக்கப்படுகிறது…':'Opening Android PDF save options…';try{window.SMVNativePdf.downloadPdf();}catch(e){if(status)status.textContent=String(e&&e.message||e);}};" +
                "if(window.MutationObserver&&!save.__smvObserver){save.__smvObserver=new MutationObserver(function(){save.disabled=preview.disabled;});save.__smvObserver.observe(preview,{attributes:true,attributeFilter:['disabled']});}" +
                "}catch(e){}})();";
        view.evaluateJavascript(script, null);
    }

    private void applyAndroidHoroscopeReportLayout(WebView view, String url) {
        if (view == null || !isHoroscopePrintPageUrl(url)) return;
        String script = "(function(){try{" +
                "var root=document.getElementById('printReport');if(!root)return;" +
                "var sheet=Array.prototype.find.call(document.styleSheets,function(x){return x.href&&x.href.indexOf('report-print.css')!==-1;});" +
                "if(sheet&&!window.__smvAndroidResponsivePdfCss){" +
                "var css='@media screen and (max-width:720px){' +
                'html,body{width:100%;max-width:100%;overflow-x:hidden}' +
                'main{width:100%;max-width:100%;padding:0 8px}' +
                '#printReport{width:100%;max-width:100%;overflow:visible}' +
                '#printReport .smv-android-table-scroll{display:block!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;padding-bottom:5px!important}' +
                '#printReport table{width:100%!important;max-width:100%!important;table-layout:auto!important}' +
                '#printReport table.smv-android-wide-table{width:max-content!important;min-width:680px!important;max-width:none!important;table-layout:auto!important}' +
                '#printReport table.smv-android-wide-table.smv-shadbala-table{min-width:900px!important}' +
                '#printReport table.smv-android-wide-table th,#printReport table.smv-android-wide-table td{min-width:58px!important;max-width:180px!important;padding:7px 6px!important;font-size:12px!important;line-height:1.4!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important}' +
                '#printReport .south-indian-chart{width:100%!important;max-width:560px!important;min-height:0!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(4,minmax(68px,auto))!important}' +
                '#printReport .south-rasi-cell{min-width:0!important;padding:5px!important;font-size:clamp(10px,2.7vw,14px)!important}' +
                '#printReport .south-chart-center{font-size:clamp(15px,4vw,22px)!important}' +
                '#printReport .sbc-grid-full{width:100%!important;max-width:100%!important;grid-template-rows:repeat(9,minmax(70px,auto))!important}' +
                '}';" +
                "try{sheet.insertRule(css,sheet.cssRules.length);window.__smvAndroidResponsivePdfCss=true;}catch(e){}}" +
                "var enhance=function(){root.querySelectorAll('table').forEach(function(table){" +
                "var cols=0;Array.prototype.forEach.call(table.rows,function(row){cols=Math.max(cols,row.cells.length);});" +
                "if(cols<6)return;table.classList.add('smv-android-wide-table');" +
                "var wrap=table.closest('.data-table-wrap,.adv-table-wrap,.smv-shadbala-scroll,.smv-v257-table-wrap,.smv-android-table-scroll');" +
                "if(!wrap){wrap=document.createElement('div');wrap.className='smv-android-table-scroll';table.parentNode.insertBefore(wrap,table);wrap.appendChild(table);}else{wrap.classList.add('smv-android-table-scroll');}" +
                "});};enhance();" +
                "if(window.MutationObserver&&!window.__smvAndroidReportObserver){window.__smvAndroidReportObserver=new MutationObserver(enhance);window.__smvAndroidReportObserver.observe(root,{childList:true,subtree:true});}" +
                "}catch(e){}})();";
        view.evaluateJavascript(script, null);
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
        if ("horoscope.smvastroservices.in".equals(host)) return "in.smvastroservices.horoscope";
        if ("calendar.smvastroservices.in".equals(host)) return "in.smvastroservices.calendar";
        if ("smvastroservices.in".equals(host) || "www.smvastroservices.in".equals(host)) return "in.smvastroservices.smvastro";
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
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
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
