package in.smvastroservices.test;
import android.app.Application;
import android.content.Context;
import android.util.Log;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
public final class SmvAstroApplication extends Application {
    public static final String PUSH_PREFS = "smv_native_push";
    private static final String LOG_TAG = "SMVNativePush";
    @Override public void onCreate() {
        super.onCreate();
        ensureFirebaseConfigured(this);
        NativeCallNotifications.createChannels(this);
    }
    public static boolean ensureFirebaseConfigured(Context context) {
        try { FirebaseApp.getInstance(); return true; }
        catch (IllegalStateException noDefaultApp) { /* explicit options below */ }
        String appId = BuildConfig.SMV_FIREBASE_ANDROID_APP_ID == null ? "" : BuildConfig.SMV_FIREBASE_ANDROID_APP_ID.trim();
        String prefix = "1:" + BuildConfig.SMV_FIREBASE_SENDER_ID + ":android:";
        if (!appId.startsWith(prefix)) {
            Log.w(LOG_TAG, "Native FCM disabled: set SMV_FIREBASE_ANDROID_APP_ID to the registered Android app ID.");
            return false;
        }
        try {
            FirebaseOptions options = new FirebaseOptions.Builder()
                .setApplicationId(appId).setApiKey(BuildConfig.SMV_FIREBASE_API_KEY)
                .setProjectId(BuildConfig.SMV_FIREBASE_PROJECT_ID).setGcmSenderId(BuildConfig.SMV_FIREBASE_SENDER_ID).build();
            return FirebaseApp.initializeApp(context.getApplicationContext(), options) != null;
        } catch (Exception error) {
            Log.e(LOG_TAG, "Unable to initialize native FCM.", error); return false;
        }
    }
}
