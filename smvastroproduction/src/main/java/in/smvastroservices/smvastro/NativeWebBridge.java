package in.smvastroservices.smvastro;

import android.app.Activity;
import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebView;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException;

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
    private static final Object GOOGLE_SIGN_IN_LOCK = new Object();
    private static boolean googleSignInInProgress = false;
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
          var googleSignInPending = null;
          function send(action) {
            try { nativeBridge.postMessage(JSON.stringify({ action: action })); } catch (_) {}
          }
          window.SMVNativeCalls = {
            isNativeApp: function () { return true; },
            getFcmToken: function () { return token; },
            requestTokenRefresh: function () { send('refreshToken'); },
            signInWithGoogle: function () {
              if (googleSignInPending) return Promise.reject(new Error('Google Sign-In is already in progress.'));
              return new Promise(function (resolve, reject) {
                var timer = setTimeout(function () {
                  googleSignInPending = null;
                  reject(new Error('Google Sign-In timed out. Please try again.'));
                }, 60000);
                googleSignInPending = { resolve: resolve, reject: reject, timer: timer };
                send('googleSignIn');
              });
            }
          };
          nativeBridge.onmessage = function (event) {
            try {
              var message = JSON.parse(String(event.data || '{}'));
              if (message.type === 'token') {
                token = String(message.token || '').trim();
                if (token && typeof window.__smvNativeFcmTokenReady === 'function') {
                  window.__smvNativeFcmTokenReady(token);
                }
                return;
              }
              if (message.type === 'googleSignInResult') {
                var pending = googleSignInPending;
                if (!pending) return;
                googleSignInPending = null;
                clearTimeout(pending.timer);
                var idToken = String(message.idToken || '').trim();
                if (idToken) pending.resolve({ idToken: idToken });
                else pending.reject(new Error(String(message.message || 'Google Sign-In failed. Please try again.')));
              }
            } catch (_) {}
          };
          send('getToken');
        })();
        """;

    private NativeWebBridge() {}

    public static void install(Activity activity, WebView webView) {
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
                handleMessage(activity, message, replyProxy);
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

    private static void handleMessage(Activity activity, WebMessageCompat message, JavaScriptReplyProxy replyProxy) {
        try {
            JSONObject request = new JSONObject(message == null ? "" : message.getData());
            String action = request.optString("action", "");
            if ("googleSignIn".equals(action)) {
                startGoogleSignIn(activity, replyProxy);
                return;
            }
            if (!"getToken".equals(action) && !"refreshToken".equals(action)) return;

            String saved = activity.getSharedPreferences(SmvAstroApplication.PUSH_PREFS, Activity.MODE_PRIVATE)
                .getString(NativePushMessagingService.PREF_TOKEN, "");
            if ("getToken".equals(action) && saved != null && !saved.trim().isEmpty()) {
                postToken(replyProxy, saved.trim());
                return;
            }

            NativePushMessagingService.refreshToken(activity.getApplicationContext(), token -> postToken(replyProxy, token));
        } catch (Exception error) {
            Log.w(LOG_TAG, "Rejected invalid native bridge message.", error);
        }
    }

    private static void startGoogleSignIn(Activity activity, JavaScriptReplyProxy replyProxy) {
        synchronized (GOOGLE_SIGN_IN_LOCK) {
            if (googleSignInInProgress) {
                postGoogleSignInResult(replyProxy, null, "Google Sign-In is already in progress. Please wait.");
                return;
            }
            googleSignInInProgress = true;
        }

        if (activity.isFinishing() || activity.isDestroyed()) {
            finishGoogleSignIn(replyProxy, null, "Please reopen SMV ASTRO and try Google Sign-In again.");
            return;
        }

        try {
            GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
                    .setServerClientId(BuildConfig.SMV_GOOGLE_WEB_CLIENT_ID)
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .build();
            GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build();

            CredentialManager credentialManager = CredentialManager.create(activity);
            MutableContextWrapper context = new MutableContextWrapper(activity);
            CancellationSignal cancellationSignal = new CancellationSignal();
            credentialManager.getCredentialAsync(
                    context,
                    request,
                    cancellationSignal,
                    activity::runOnUiThread,
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            try {
                                Credential credential = response.getCredential();
                                if (!(credential instanceof CustomCredential)
                                        || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    finishGoogleSignIn(replyProxy, null, "Google did not return a supported sign-in credential. Please try again.");
                                    return;
                                }
                                GoogleIdTokenCredential googleCredential =
                                        GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());
                                String idToken = googleCredential.getIdToken();
                                if (idToken == null || idToken.trim().isEmpty()) {
                                    finishGoogleSignIn(replyProxy, null, "Google did not return an ID token. Please try again.");
                                    return;
                                }
                                finishGoogleSignIn(replyProxy, idToken, null);
                            } catch (GoogleIdTokenParsingException parseError) {
                                finishGoogleSignIn(replyProxy, null, "Google returned an invalid sign-in response. Please try again.");
                            } catch (RuntimeException callbackError) {
                                finishGoogleSignIn(replyProxy, null, "Google Sign-In could not be completed. Please try again.");
                            }
                        }

                        @Override
                        public void onError(GetCredentialException error) {
                            String message = "Google Sign-In was cancelled or is unavailable. Please try again.";
                            finishGoogleSignIn(replyProxy, null, message);
                        }
                    }
            );
        } catch (RuntimeException error) {
            finishGoogleSignIn(replyProxy, null, "Google Sign-In could not be started. Please try again.");
        }
    }

    private static void finishGoogleSignIn(JavaScriptReplyProxy replyProxy, String idToken, String errorMessage) {
        try {
            postGoogleSignInResult(replyProxy, idToken, errorMessage);
        } finally {
            synchronized (GOOGLE_SIGN_IN_LOCK) {
                googleSignInInProgress = false;
            }
        }
    }

    private static void postGoogleSignInResult(JavaScriptReplyProxy replyProxy, String idToken, String errorMessage) {
        try {
            JSONObject response = new JSONObject();
            response.put("type", "googleSignInResult");
            if (idToken != null && !idToken.trim().isEmpty()) response.put("idToken", idToken);
            if (errorMessage != null && !errorMessage.trim().isEmpty()) response.put("message", errorMessage);
            replyProxy.postMessage(response.toString());
        } catch (Exception error) {
            Log.w(LOG_TAG, "Could not return Google sign-in status to the app page.");
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
