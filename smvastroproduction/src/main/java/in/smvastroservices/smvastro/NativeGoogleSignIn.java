package in.smvastroservices.smvastro;

import android.app.Activity;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.webkit.JavaScriptReplyProxy;

import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONObject;

import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Starts Google's native Android account picker and returns only the short-lived
 * Google ID token to the already trusted SMV ASTRO page. Firebase JS Auth then
 * exchanges that token so existing Firestore role checks and dashboard routing
 * continue to use the same WebView Firebase Auth instance.
 */
final class NativeGoogleSignIn {
    private static final String LOG_TAG = "SMVNativeGoogleAuth";
    private static final AtomicBoolean SIGN_IN_IN_PROGRESS = new AtomicBoolean(false);
    private static final Executor MAIN_EXECUTOR = command -> {
        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(command);
    };

    private NativeGoogleSignIn() {}

    static void start(Activity activity, JavaScriptReplyProxy replyProxy, String requestId) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            postError(replyProxy, requestId, "Google Sign-In is unavailable. Reopen SMV ASTRO and try again.");
            return;
        }
        if (!SIGN_IN_IN_PROGRESS.compareAndSet(false, true)) {
            postError(replyProxy, requestId, "A Google Sign-In request is already open.");
            return;
        }

        try {
            GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
                    .setServerClientId(BuildConfig.SMV_GOOGLE_WEB_CLIENT_ID)
                    // This is an explicit Google button flow: allow users to choose
                    // any device account, including one not previously authorized.
                    .setFilterByAuthorizedAccounts(false)
                    .build();

            GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build();

            CredentialManager credentialManager = CredentialManager.create(activity);
            credentialManager.getCredentialAsync(
                    activity,
                    request,
                    new CancellationSignal(),
                    MAIN_EXECUTOR,
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse result) {
                            try {
                                Credential credential = result == null ? null : result.getCredential();
                                if (!(credential instanceof CustomCredential)
                                        || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                                                .equals(credential.getType())) {
                                    postError(replyProxy, requestId, "Google did not return a supported sign-in credential. Please try again.");
                                    return;
                                }

                                GoogleIdTokenCredential googleCredential =
                                        GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());
                                String idToken = googleCredential.getIdToken();
                                if (idToken == null || idToken.trim().isEmpty()) {
                                    postError(replyProxy, requestId, "Google returned an empty sign-in token. Please try again.");
                                    return;
                                }
                                postToken(replyProxy, requestId, idToken);
                            } catch (Exception error) {
                                Log.w(LOG_TAG, "Unable to parse the Google credential.", error);
                                postError(replyProxy, requestId, "Google Sign-In could not be completed. Please try again.");
                            } finally {
                                SIGN_IN_IN_PROGRESS.set(false);
                            }
                        }

                        @Override
                        public void onError(GetCredentialException error) {
                            try {
                                if (!(error instanceof GetCredentialCancellationException)) {
                                    Log.w(LOG_TAG, "Credential Manager Google Sign-In failed: "
                                            + error.getClass().getSimpleName());
                                }
                                postError(replyProxy, requestId,
                                        error instanceof GetCredentialCancellationException
                                                ? "Google Sign-In was cancelled."
                                                : "Google Sign-In is unavailable on this device. Check Google Play services and try again.");
                            } finally {
                                SIGN_IN_IN_PROGRESS.set(false);
                            }
                        }
                    }
            );
        } catch (Exception error) {
            SIGN_IN_IN_PROGRESS.set(false);
            Log.w(LOG_TAG, "Unable to start Credential Manager.", error);
            postError(replyProxy, requestId, "Unable to open Google Sign-In. Please update Google Play services and try again.");
        }
    }

    private static void postToken(JavaScriptReplyProxy replyProxy, String requestId, String idToken) {
        try {
            JSONObject response = new JSONObject();
            response.put("type", "googleIdToken");
            response.put("requestId", requestId);
            response.put("idToken", idToken);
            replyProxy.postMessage(response.toString());
        } catch (Exception error) {
            Log.w(LOG_TAG, "Could not return Google Sign-In result to the SMV ASTRO page.", error);
        }
    }

    private static void postError(JavaScriptReplyProxy replyProxy, String requestId, String message) {
        try {
            JSONObject response = new JSONObject();
            response.put("type", "googleSignInError");
            response.put("requestId", requestId);
            response.put("message", message);
            replyProxy.postMessage(response.toString());
        } catch (Exception error) {
            Log.w(LOG_TAG, "Could not return Google Sign-In error to the SMV ASTRO page.", error);
        }
    }
}
