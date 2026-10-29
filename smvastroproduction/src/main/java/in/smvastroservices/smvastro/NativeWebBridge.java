package in.smvastroservices.smvastro;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebView;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public final class NativeWebBridge {
    private static final String LOG_TAG = "SMVNativeBridge";
    private static final Set<String> TRUSTED_ORIGINS = new HashSet<>(Arrays.asList(
        "https://smvastroservices.in",
        "https://www.smvastroservices.in"
    ));

    private static final String BOOTSTRAP_SCRIPT = """
        (function () {
          'use strict';
          var nativeBridge = window.SMVNativeBridge;
          if (!nativeBridge || typeof nativeBridge.postMessage !== 'function') return;
          var token = '';
          function send(action) {
            try { nativeBridge.postMessage(JSON.stringify({ action: action })); } catch (_) {}
          }
          window.SMVNativeCalls = {
            isNativeApp: function () { return true; },
            getFcmToken: function () { return token; },
            requestTokenRefresh: function () { send('refreshToken'); }
          };
          nativeBridge.onmessage = function (event) {
            try {
              var message = JSON.parse(String(event.data || '{}'));
              if (message.type !== 'token') return;
              token = String(message.token || '').trim();
              if (token && typeof window.__smvNativeFcmTokenReady === 'function') {
                window.__smvNativeFcmTokenReady(token);
              }
            } catch (_) {}
          };
          send('getToken');
        })();
        """;

    private NativeWebBridge() {}

    public static void install(Context context, WebView webView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w(LOG_TAG, "Native bridge unavailable; update Android System WebView to enable it.");
            return;
        }

        WebViewCompat.addWebMessageListener(
            webView,
            "SMVNativeBridge",
            TRUSTED_ORIGINS,
            (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                if (!isMainFrame || !isTrustedOrigin(sourceOrigin)) return;
                handleMessage(context.getApplicationContext(), message, replyProxy);
            }
        );

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, BOOTSTRAP_SCRIPT, TRUSTED_ORIGINS);
        } else {
            Log.w(LOG_TAG, "Document-start JavaScript unavailable; native website bridge is disabled on this WebView.");
        }
    }

    private static boolean isTrustedOrigin(Uri origin) {
        if (origin == null || !"https".equalsIgnoreCase(origin.getScheme())) return false;
        String host = origin.getHost();
        return "smvastroservices.in".equalsIgnoreCase(host)
            || "www.smvastroservices.in".equalsIgnoreCase(host);
    }

    private static void handleMessage(Context context, WebMessageCompat message, JavaScriptReplyProxy replyProxy) {
        try {
            JSONObject request = new JSONObject(message == null ? "" : message.getData());
            String action = request.optString("action", "");
            if (!"getToken".equals(action) && !"refreshToken".equals(action)) return;

            String saved = context.getSharedPreferences(SmvAstroApplication.PUSH_PREFS, Context.MODE_PRIVATE)
                .getString(NativePushMessagingService.PREF_TOKEN, "");
            if ("getToken".equals(action) && saved != null && !saved.trim().isEmpty()) {
                postToken(replyProxy, saved.trim());
                return;
            }

            NativePushMessagingService.refreshToken(context, token -> postToken(replyProxy, token));
        } catch (Exception error) {
            Log.w(LOG_TAG, "Rejected invalid native bridge message.", error);
        }
    }

    private static void postToken(JavaScriptReplyProxy replyProxy, String token) {
        try {
            JSONObject response = new JSONObject();
            response.put("type", "token");
            response.put("token", token == null ? "" : token);
            replyProxy.postMessage(response.toString());
        } catch (Exception error) {
            Log.w(LOG_TAG, "Could not return the FCM token to the app page.", error);
        }
    }
}
