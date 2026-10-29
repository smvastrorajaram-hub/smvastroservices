package in.smvastroservices.smvastro;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import java.util.Map;
public final class NativeCallNotifications {
    public static final String CHANNEL_INCOMING = "smv_native_incoming_call_v1";
    public static final String CHANNEL_ALERTS = "smv_native_background_alerts_v1";
    public static final String EXTRA_TYPE="smv_native_type", EXTRA_MODE="smv_native_mode", EXTRA_SESSION_ID="smv_native_session_id",
        EXTRA_BOOKING_ID="smv_native_booking_id", EXTRA_TITLE="smv_native_title", EXTRA_BODY="smv_native_body",
        EXTRA_TAG="smv_native_tag", EXTRA_NOTIFICATION_ID="smv_native_notification_id";
    private NativeCallNotifications() {}
    public static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if(manager==null)return;
        NotificationChannel incoming=new NotificationChannel(CHANNEL_INCOMING,"Incoming SMV ASTRO Calls and Chats",NotificationManager.IMPORTANCE_HIGH);
        incoming.setDescription("Ringing alerts for incoming Live Call and Live Chat requests.");
        incoming.setSound(null,(AudioAttributes)null); incoming.enableVibration(false); incoming.setShowBadge(true);
        manager.createNotificationChannel(incoming);
        NotificationChannel alerts=new NotificationChannel(CHANNEL_ALERTS,"SMV ASTRO Background Alerts",NotificationManager.IMPORTANCE_HIGH);
        alerts.setDescription("Background alerts for scheduled bookings and notification tests.");
        alerts.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        alerts.enableVibration(true); manager.createNotificationChannel(alerts);
    }
    public static int notificationId(String sessionId,String bookingId) {
        String id=!empty(sessionId)?sessionId:bookingId; if(empty(id))id="smv-incoming";
        return 14000+((id.hashCode()&0x7fffffff)%5000);
    }
    public static Notification buildIncomingNotification(Context context,String title,String body,String type,String mode,String sessionId,String bookingId,String tag) {
        createChannels(context);
        int id=notificationId(sessionId,bookingId);
        Intent incoming=new Intent(context,IncomingCallActivity.class).putExtra(EXTRA_TYPE,type).putExtra(EXTRA_MODE,mode)
            .putExtra(EXTRA_SESSION_ID,sessionId).putExtra(EXTRA_BOOKING_ID,bookingId).putExtra(EXTRA_TITLE,title)
            .putExtra(EXTRA_BODY,body).putExtra(EXTRA_TAG,tag).putExtra(EXTRA_NOTIFICATION_ID,id);
        incoming.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent call=PendingIntent.getActivity(context,id,incoming,PendingIntent.FLAG_UPDATE_CURRENT|immutableFlag());
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,CHANNEL_INCOMING):new Notification.Builder(context);
        String safeTitle=empty(title)?"Incoming SMV ASTRO request":title;
        String safeBody=empty(body)?"A Customer is waiting. Open SMV ASTRO to respond.":body;
        return builder.setSmallIcon(R.drawable.smv_notification_call).setContentTitle(safeTitle).setContentText(safeBody)
            .setStyle(new Notification.BigTextStyle().bigText(safeBody)).setCategory(Notification.CATEGORY_CALL)
            .setVisibility(Notification.VISIBILITY_PUBLIC).setPriority(Notification.PRIORITY_MAX).setOngoing(true)
            .setAutoCancel(false).setOnlyAlertOnce(true).setColor(0xFF24103F).setContentIntent(call).setFullScreenIntent(call,true).build();
    }
    public static void showStandardAlert(Context context,Map<String,String> data) {
        createChannels(context);
        String type=value(data,"type"),title=value(data,"title"),body=value(data,"body"),sessionId=value(data,"sessionId"),bookingId=value(data,"bookingId");
        Intent open=mainIntent(context,sessionId,bookingId); int id=notificationId(sessionId,bookingId)+6000;
        PendingIntent pending=PendingIntent.getActivity(context,id,open,PendingIntent.FLAG_UPDATE_CURRENT|immutableFlag());
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,CHANNEL_ALERTS):new Notification.Builder(context);
        Notification notification=builder.setSmallIcon(R.drawable.smv_notification_call)
            .setContentTitle(empty(title)?"SMV ASTRO Alert":title).setContentText(empty(body)?"Open SMV ASTRO to review the request.":body)
            .setAutoCancel(true).setCategory("scheduled_booking".equals(type)?Notification.CATEGORY_EVENT:Notification.CATEGORY_STATUS)
            .setPriority(Notification.PRIORITY_HIGH).setContentIntent(pending).setColor(0xFF24103F).build();
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE); if(manager!=null)manager.notify(id,notification);
    }
    static Intent mainIntent(Context context,String sessionId,String bookingId) {
        Uri.Builder uri=Uri.parse("https://smvastroservices.in/").buildUpon().appendQueryParameter("smvLivePush","1");
        if(!empty(sessionId))uri.appendQueryParameter("smvSessionId",sessionId);
        if(!empty(bookingId))uri.appendQueryParameter("smvBookingId",bookingId);
        return new Intent(context,MainActivity.class).putExtra("smv_open_url",uri.build().toString())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }
    static int immutableFlag(){return Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0;}
    static boolean empty(String value){return value==null||value.trim().isEmpty();}
    private static String value(Map<String,String> data,String key){return data==null?"":String.valueOf(data.getOrDefault(key,"")).trim();}
}
