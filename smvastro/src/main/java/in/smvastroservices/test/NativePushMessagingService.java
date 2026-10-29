package in.smvastroservices.test;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
public final class NativePushMessagingService extends FirebaseMessagingService {
    public static final String ACTION_TOKEN_UPDATED = "in.smvastroservices.test.NATIVE_FCM_TOKEN_UPDATED";
    public static final String EXTRA_TOKEN = "native_fcm_token";
    public static final String PREF_TOKEN = "fcm_token";
    private static final String LOG_TAG = "SMVNativePush";
    public interface TokenCallback { void onToken(String token); }
    public static void refreshToken(Context context, TokenCallback callback) {
        if (!SmvAstroApplication.ensureFirebaseConfigured(context)) { if (callback != null) callback.onToken(""); return; }
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                String token = task.isSuccessful() && task.getResult() != null ? task.getResult().trim() : "";
                if (!token.isEmpty()) saveToken(context, token);
                if (callback != null) callback.onToken(token);
                if (!task.isSuccessful()) Log.w(LOG_TAG, "Native FCM token is not available yet.", task.getException());
            });
        } catch (Exception error) { Log.w(LOG_TAG, "Native FCM token request failed.", error); if (callback != null) callback.onToken(""); }
    }
    @Override public void onNewToken(String token) {
        super.onNewToken(token);
        String value = token == null ? "" : token.trim();
        if (value.isEmpty()) return;
        saveToken(this, value);
        sendBroadcast(new Intent(ACTION_TOKEN_UPDATED).setPackage(getPackageName()).putExtra(EXTRA_TOKEN, value));
    }
    private static void saveToken(Context context, String token) {
        context.getApplicationContext().getSharedPreferences(SmvAstroApplication.PUSH_PREFS, Context.MODE_PRIVATE)
            .edit().putString(PREF_TOKEN, token).apply();
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        Map<String,String> data = message == null ? null : message.getData();
        if (data == null || data.isEmpty()) return;
        String type = value(data,"type"), sessionId = value(data,"sessionId"), bookingId = value(data,"bookingId");
        if ("stop_ringing".equals(type)) { IncomingCallRingtoneService.stopFor(this,sessionId,bookingId); return; }
        if (MainActivity.isAppVisible() && (type.equals("live_request") || type.equals("live_booking"))) return;
        if (type.equals("live_request") || type.equals("live_booking")) {
            Intent ring = new Intent(this,IncomingCallRingtoneService.class)
                .setAction(IncomingCallRingtoneService.ACTION_RING)
                .putExtra(NativeCallNotifications.EXTRA_TYPE,type)
                .putExtra(NativeCallNotifications.EXTRA_MODE,value(data,"mode"))
                .putExtra(NativeCallNotifications.EXTRA_SESSION_ID,sessionId)
                .putExtra(NativeCallNotifications.EXTRA_BOOKING_ID,bookingId)
                .putExtra(NativeCallNotifications.EXTRA_TITLE,value(data,"title"))
                .putExtra(NativeCallNotifications.EXTRA_BODY,value(data,"body"))
                .putExtra(NativeCallNotifications.EXTRA_TAG,value(data,"tag"));
            try { if (android.os.Build.VERSION.SDK_INT >= 26) startForegroundService(ring); else startService(ring); }
            catch (Exception error) { Log.w(LOG_TAG,"Could not start native ring service.",error); NativeCallNotifications.showStandardAlert(this,data); }
            return;
        }
        NativeCallNotifications.showStandardAlert(this,data);
    }
    private static String value(Map<String,String> data,String key) { return data == null ? "" : String.valueOf(data.getOrDefault(key,"")).trim(); }
}
