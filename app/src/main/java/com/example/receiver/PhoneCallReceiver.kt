package com.example.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log
import com.example.service.CallAnnouncerService

class PhoneCallReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        if (intent.action == TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

            Log.d("PhoneCallReceiver", "Received phone state change: $stateStr number: $incomingNumber")

            val serviceIntent = Intent(context, CallAnnouncerService::class.java).apply {
                action = CallAnnouncerService.ACTION_PROCESS_CALL_STATE
                putExtra(CallAnnouncerService.EXTRA_CALL_STATE, stateStr)
                putExtra(CallAnnouncerService.EXTRA_INCOMING_NUMBER, incomingNumber)
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } catch (e: Exception) {
                Log.e("PhoneCallReceiver", "Failed to start CallAnnouncerService", e)
            }
        }
    }
}
