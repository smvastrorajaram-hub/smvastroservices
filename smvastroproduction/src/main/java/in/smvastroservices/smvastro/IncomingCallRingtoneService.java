package in.smvastroservices.smvastro;
import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
public final class IncomingCallRingtoneService extends Service {
    public static final String ACTION_RING="in.smvastroservices.smvastro.ACTION_RING_INCOMING";
    public static final String ACTION_STOP_RINGING="in.smvastroservices.smvastro.ACTION_STOP_RINGING";
    private static final long RING_TIMEOUT_MILLIS=120_000L;
    private static final String LOG_TAG="SMVCallRingtone";
    private static volatile IncomingCallRingtoneService instance;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private String sessionId="",bookingId="";
    private int activeNotificationId=-1;
    private boolean foregroundStarted;
    private final Runnable ringTimeout=this::stopRingingNow;
    @Override public void onCreate(){super.onCreate();instance=this;NativeCallNotifications.createChannels(this);}
    @Override public int onStartCommand(Intent intent,int flags,int startId) {
        if(intent==null){stopSelf(startId);return START_NOT_STICKY;}
        if(ACTION_STOP_RINGING.equals(intent.getAction())) {
            stopMatching(intent.getStringExtra(NativeCallNotifications.EXTRA_SESSION_ID),intent.getStringExtra(NativeCallNotifications.EXTRA_BOOKING_ID));
            return START_NOT_STICKY;
        }
        if(!ACTION_RING.equals(intent.getAction()))return START_NOT_STICKY;
        clearAudioAndTimeout();
        if(activeNotificationId>=0) {
            android.app.NotificationManager nm=(android.app.NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            if(nm!=null)nm.cancel(activeNotificationId);
        }
        sessionId=value(intent,NativeCallNotifications.EXTRA_SESSION_ID); bookingId=value(intent,NativeCallNotifications.EXTRA_BOOKING_ID);
        String type=value(intent,NativeCallNotifications.EXTRA_TYPE),mode=value(intent,NativeCallNotifications.EXTRA_MODE);
        String title=value(intent,NativeCallNotifications.EXTRA_TITLE),body=value(intent,NativeCallNotifications.EXTRA_BODY),tag=value(intent,NativeCallNotifications.EXTRA_TAG);
        activeNotificationId=NativeCallNotifications.notificationId(sessionId,bookingId);
        Notification incoming=NativeCallNotifications.buildIncomingNotification(this,title,body,type,mode,sessionId,bookingId,tag);
        try {
            if(Build.VERSION.SDK_INT>=29)startForeground(activeNotificationId,incoming,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(activeNotificationId,incoming);
            foregroundStarted=true;
        } catch(Exception error) {
            Log.w(LOG_TAG,"Foreground ringtone service was blocked by Android.",error); stopSelf(startId);
            NativeCallNotifications.showStandardAlert(this,java.util.Collections.singletonMap("title",title.isEmpty()?"Incoming SMV ASTRO request":title));
            return START_NOT_STICKY;
        }
        startLoopingRingtone(); handler.removeCallbacks(ringTimeout); handler.postDelayed(ringTimeout,RING_TIMEOUT_MILLIS);
        return START_NOT_STICKY;
    }
    private void startLoopingRingtone() {
        try {
            Uri ringtone=RingtoneManager.getActualDefaultRingtoneUri(this,RingtoneManager.TYPE_RINGTONE);
            if(ringtone==null)ringtone=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if(ringtone==null)ringtone=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if(ringtone==null){Log.w(LOG_TAG,"No default Android ringtone is configured.");return;}
            player=new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            player.setDataSource(this,ringtone);player.setLooping(true);
            player.setOnErrorListener((mp,what,extra)->{Log.w(LOG_TAG,"Ringtone playback failed: "+what+"/"+extra);clearAudioAndTimeout();return true;});
            player.prepare();player.start();
        } catch(Exception error){Log.w(LOG_TAG,"Could not play the device ringtone.",error);clearAudioAndTimeout();}
    }
    private void stopMatching(String sid,String bid) {
        String s=value(sid),b=value(bid); boolean unscoped=s.isEmpty()&&b.isEmpty();
        boolean matches=(!s.isEmpty()&&s.equals(sessionId))||(!b.isEmpty()&&b.equals(bookingId));
        if(unscoped||matches)stopRingingNow();
    }
    public static void stopFor(Context context,String sessionId,String bookingId) {
        IncomingCallRingtoneService active=instance;
        if(active!=null){active.stopMatching(sessionId,bookingId);return;}
        context.stopService(new Intent(context,IncomingCallRingtoneService.class));
    }
    private void stopRingingNow() {
        handler.removeCallbacks(ringTimeout);clearPlayer();
        if(activeNotificationId>=0){android.app.NotificationManager nm=(android.app.NotificationManager)getSystemService(NOTIFICATION_SERVICE);if(nm!=null)nm.cancel(activeNotificationId);}
        if(foregroundStarted){if(Build.VERSION.SDK_INT>=24)stopForeground(STOP_FOREGROUND_REMOVE);else stopForeground(true);foregroundStarted=false;}
        activeNotificationId=-1;sessionId="";bookingId="";stopSelf();
    }
    private void clearAudioAndTimeout(){handler.removeCallbacks(ringTimeout);clearPlayer();}
    private void clearPlayer(){if(player!=null){try{if(player.isPlaying())player.stop();}catch(Exception ignored){}try{player.reset();player.release();}catch(Exception ignored){}player=null;}}
    private static String value(Intent intent,String key){String v=intent==null?null:intent.getStringExtra(key);return v==null?"":v.trim();}
    private static String value(String value){return value==null?"":value.trim();}
    @Override public void onDestroy(){clearAudioAndTimeout();if(activeNotificationId>=0){android.app.NotificationManager nm=(android.app.NotificationManager)getSystemService(NOTIFICATION_SERVICE);if(nm!=null)nm.cancel(activeNotificationId);}if(foregroundStarted){if(Build.VERSION.SDK_INT>=24)stopForeground(STOP_FOREGROUND_REMOVE);else stopForeground(true);}if(instance==this)instance=null;super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
