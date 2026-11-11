package in.smvastroservices.pages;

import android.app.Activity;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebView;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.util.Collections;
import java.util.Set;

public final class NativeWebBridge {
    private static final String LOG_TAG = "SMVPagesNativeBridge";
    private static final Set<String> TRUSTED_ORIGINS =
            Collections.singleton("https://smvastroservices.pages.dev");
    private static final String BOOTSTRAP_SCRIPT = """
        (function () {
          'use strict';
          var nativeBridge = window.SMVNativeBridge;
          if (!nativeBridge || typeof nativeBridge.postMessage !== 'function') return;
          function send(action, requestId) {
            try {
              var request = { action: action };
              if (requestId) request.requestId = String(requestId);
              nativeBridge.postMessage(JSON.stringify(request));
            } catch (_) {}
          }
          window.SMVNativeCalls = {
            isNativeApp: function () { return true; },
            getFcmToken: function () { return ''; },
            requestTokenRefresh: function () {},
            signInWithGoogle: function (requestId) { send('googleSignIn', requestId); }
          };
          nativeBridge.onmessage = function (event) {
            try {
              var message = JSON.parse(String(event.data || '{}'));
              if (message.type === 'googleIdToken') {
                var idToken = String(message.idToken || '').trim();
                if (idToken) window.dispatchEvent(new CustomEvent('smv:native-google-token', {
                  detail: { requestId: String(message.requestId || ''), idToken: idToken }
                }));
                return;
              }
              if (message.type === 'googleSignInError') {
                window.dispatchEvent(new CustomEvent('smv:native-google-error', {
                  detail: { requestId: String(message.requestId || ''), message: String(message.message || 'Google Sign-In failed.') }
                }));
              }
            } catch (_) {}
          };
        })();
        """;

    private NativeWebBridge() {}

    public static void install(Activity activity, WebView webView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
                || !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Log.w(LOG_TAG, "Native Google Sign-In is unavailable on this Android System WebView version.");
            return;
        }
        WebViewCompat.addWebMessageListener(webView, "SMVNativeBridge", TRUSTED_ORIGINS,
                (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                    if (!isMainFrame || !isTrustedOrigin(sourceOrigin)) return;
                    handleMessage(activity, message, replyProxy);
                });
        WebViewCompat.addDocumentStartJavaScript(webView, BOOTSTRAP_SCRIPT, TRUSTED_ORIGINS);
    }

    private static boolean isTrustedOrigin(Uri origin) {
        if (origin == null || !"https".equalsIgnoreCase(origin.getScheme())) return false;
        int port = origin.getPort();
        return (port == -1 || port == 443)
                && "smvastroservices.pages.dev".equalsIgnoreCase(origin.getHost());
    }

    private static void handleMessage(Activity activity, WebMessageCompat message,
                                      JavaScriptReplyProxy replyProxy) {
        try {
            JSONObject request = new JSONObject(message == null ? "" : message.getData());
            if (!"googleSignIn".equals(request.optString("action", ""))) return;
            String requestId = request.optString("requestId", "").trim();
            if (requestId.isEmpty() || requestId.length() > 80) {
                Log.w(LOG_TAG, "Rejected Google Sign-In request with an invalid request ID.");
                return;
            }
            NativeGoogleSignIn.start(activity, replyProxy, requestId);
        } catch (Exception error) {
            Log.w(LOG_TAG, "Rejected invalid native bridge message.", error);
        }
    }
}
