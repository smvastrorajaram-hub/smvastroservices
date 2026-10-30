package in.smvastroservices.smvastro;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
public final class IncomingCallActivity extends Activity {
    private String sessionId="",bookingId="",type="",mode="",title="",body="";
    private int notificationId=-1;
    @Override protected void onCreate(Bundle state){super.onCreate(state);prepareLockScreen();readIntent(getIntent());showIncomingView();}
    private void prepareLockScreen(){
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON|
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED|WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true);}
        getWindow().setStatusBarColor(Color.rgb(36,16,63));getWindow().setNavigationBarColor(Color.rgb(36,16,63));
    }
    private void readIntent(Intent intent){
        sessionId=value(intent==null?null:intent.getStringExtra(NativeCallNotifications.EXTRA_SESSION_ID));
        bookingId=value(intent==null?null:intent.getStringExtra(NativeCallNotifications.EXTRA_BOOKING_ID));
        type=value(intent==null?null:intent.getStringExtra(NativeCallNotifications.EXTRA_TYPE));
        mode=value(intent==null?null:intent.getStringExtra(NativeCallNotifications.EXTRA_MODE));
        title=value(intent==null?null:intent.getStringExtra(NativeCallNotifications.EXTRA_TITLE));
        body=value(intent==null?null:intent.getStringExtra(NativeCallNotifications.EXTRA_BODY));
        notificationId=intent==null?-1:intent.getIntExtra(NativeCallNotifications.EXTRA_NOTIFICATION_ID,-1);
    }
    private void showIncomingView(){
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER);
        root.setPadding(dp(28),dp(32),dp(28),dp(32));root.setBackgroundColor(Color.rgb(36,16,63));
        TextView brand=new TextView(this);brand.setText("SMV ASTRO");brand.setTextColor(Color.rgb(240,224,190));brand.setTextSize(15f);brand.setGravity(Gravity.CENTER);root.addView(brand,fullWidth());
        TextView headline=new TextView(this);headline.setText(title.isEmpty()?incomingLabel():title);headline.setTextColor(Color.WHITE);headline.setTextSize(28f);
        headline.setGravity(Gravity.CENTER);headline.setPadding(0,dp(36),0,dp(14));root.addView(headline,fullWidth());
        TextView description=new TextView(this);description.setText((body.isEmpty()?"A Customer is waiting. Open SMV ASTRO to respond.":body)+
            "\n\nOpen SMV ASTRO and tap ACCEPT to respond to this request.");
        description.setTextColor(Color.rgb(235,229,242));description.setTextSize(16f);description.setGravity(Gravity.CENTER);root.addView(description,fullWidth());
        Button open=new Button(this);open.setText("OPEN SMV ASTRO");open.setOnClickListener(v->openAstro());
        LinearLayout.LayoutParams p=fullWidth();p.topMargin=dp(34);root.addView(open,p);
        Button silence=new Button(this);silence.setText("SILENCE RING");silence.setOnClickListener(v->silenceOnly());
        LinearLayout.LayoutParams sp=fullWidth();sp.topMargin=dp(12);root.addView(silence,sp);
        TextView note=new TextView(this);note.setText("Silencing stops the sound only. The request remains pending until it is accepted, rejected, or times out.");
        note.setTextColor(Color.rgb(211,198,226));note.setTextSize(12f);note.setGravity(Gravity.CENTER);note.setPadding(0,dp(20),0,0);root.addView(note,fullWidth());
        setContentView(root);
    }
    private String incomingLabel(){String m=mode.isEmpty()?"":" "+mode.toUpperCase(java.util.Locale.US);return "live_booking".equals(type)?"Incoming Live"+m+" Booking":"Incoming Live"+m;}
    private void openAstro(){IncomingCallRingtoneService.stopFor(this,sessionId,bookingId);cancelIncomingNotification();startActivity(NativeCallNotifications.mainIntent(this,sessionId,bookingId));finish();}
    private void silenceOnly(){IncomingCallRingtoneService.stopFor(this,sessionId,bookingId);cancelIncomingNotification();finish();}
    private void cancelIncomingNotification(){if(notificationId<0)return;android.app.NotificationManager nm=(android.app.NotificationManager)getSystemService(NOTIFICATION_SERVICE);if(nm!=null)nm.cancel(notificationId);}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);readIntent(intent);showIncomingView();}
    private LinearLayout.LayoutParams fullWidth(){return new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,LinearLayout.LayoutParams.WRAP_CONTENT);}
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private static String value(String value){return value==null?"":value.trim();}
}
