package com.example.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.R
import com.example.data.AnnouncementLog
import com.example.data.AppDatabase
import com.example.data.AppSettingsManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CallAnnouncerService : Service() {

    private val binder = LocalBinder()
    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())
    private var announcementJob: Job? = null

    private lateinit var ttsAnnouncer: TTSAnnouncer
    private lateinit var settingsManager: AppSettingsManager
    private lateinit var database: AppDatabase

    private val _serviceRunningState = MutableStateFlow(false)
    val serviceRunningState: StateFlow<Boolean> = _serviceRunningState.asStateFlow()

    private val _lastAnnouncedCall = MutableStateFlow<String?>(null)
    val lastAnnouncedCall: StateFlow<String?> = _lastAnnouncedCall.asStateFlow()

    inner class LocalBinder : Binder() {
        fun getService(): CallAnnouncerService = this@CallAnnouncerService
    }

    override fun onCreate() {
        super.onCreate()
        ttsAnnouncer = TTSAnnouncer(this)
        settingsManager = AppSettingsManager(this)
        database = AppDatabase.getDatabase(this)
        _serviceRunningState.value = true

        startForegroundServiceWithNotification()
        Log.d("CallAnnouncerService", "Service created and foreground active")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val incomingNumber = intent?.getStringExtra(EXTRA_INCOMING_NUMBER)
        val stateStr = intent?.getStringExtra(EXTRA_CALL_STATE)

        if (action == ACTION_PROCESS_CALL_STATE && stateStr != null) {
            handleCallStateChange(stateStr, incomingNumber)
        } else if (action == ACTION_STOP_SERVICE) {
            stopSelf()
        }

        return START_STICKY
    }

    private fun handleCallStateChange(stateStr: String, incomingNumber: String?) {
        val settings = settingsManager.settings.value

        if (!settings.isServiceEnabled) {
            Log.d("CallAnnouncerService", "Service disabled in settings, ignoring call state change")
            return
        }

        when (stateStr) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                Log.d("CallAnnouncerService", "Phone Ringing: $incomingNumber")
                processIncomingCall(incomingNumber ?: "")
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK, TelephonyManager.EXTRA_STATE_IDLE -> {
                Log.d("CallAnnouncerService", "Phone Call Ended / Answered ($stateStr). Stopping TTS.")
                stopCurrentAnnouncement()
            }
        }
    }

    fun processIncomingCall(rawNumber: String, simulatedName: String? = null, isSimulated: Boolean = false) {
        stopCurrentAnnouncement() // Stop any previous ongoing speech

        announcementJob = serviceScope.launch {
            val settings = settingsManager.settings.value
            val btInfo = BluetoothHelper.checkBluetoothHeadphoneStatus(this@CallAnnouncerService)

            val contactName = simulatedName?.ifBlank { null }
                ?: ContactHelper.getContactName(this@CallAnnouncerService, rawNumber)

            // Strictly check bluetooth headphones condition if enabled
            if (settings.onlyWhenBluetoothConnected && !btInfo.isConnected && !isSimulated) {
                Log.d("CallAnnouncerService", "Bluetooth headphones not connected. Skipping announcement.")
                // Log skipped call to database
                database.announcementDao().insertLog(
                    AnnouncementLog(
                        phoneNumber = rawNumber,
                        callerName = contactName ?: "Unknown",
                        announcedMessage = "Skipped (Bluetooth Headphones Disconnected)",
                        bluetoothDeviceName = null,
                        wasAnnounced = false
                    )
                )
                return@launch
            }

            val deviceLabel = if (isSimulated) "Simulated Test Device" else (btInfo.deviceName ?: btInfo.deviceType)

            // Check if user configured to only announce saved contact numbers
            if (!settings.speakUnknownNumbers && contactName.isNullOrBlank()) {
                Log.d("CallAnnouncerService", "Caller not in saved contacts list and speakUnknownNumbers is false. Skipping announcement.")
                database.announcementDao().insertLog(
                    AnnouncementLog(
                        phoneNumber = rawNumber.ifBlank { "Unknown" },
                        callerName = "Unknown Caller",
                        announcedMessage = "Skipped (Filter: Known Contacts Only)",
                        bluetoothDeviceName = deviceLabel,
                        wasAnnounced = false
                    )
                )
                return@launch
            }

            // Always announce ONLY the contact name when available, never the phone number
            val displayName = when {
                !contactName.isNullOrBlank() -> contactName
                settings.speakUnknownNumbers && rawNumber.isNotBlank() -> ContactHelper.formatPhoneNumberForSpeech(rawNumber)
                else -> "Unknown caller"
            }

            val announcementText = "${settings.announcePrefix} $displayName"

            _lastAnnouncedCall.value = displayName

            // Log event in database
            database.announcementDao().insertLog(
                AnnouncementLog(
                    phoneNumber = rawNumber.ifBlank { "Unknown" },
                    callerName = contactName ?: "Unknown",
                    announcedMessage = announcementText,
                    bluetoothDeviceName = deviceLabel,
                    wasAnnounced = true
                )
            )

            // Wait configured delay (e.g. 1 second) before speaking
            delay(settings.announceDelayMs)

            val repeatTimes = if (settings.repeatCount <= 0) 10 else settings.repeatCount
            for (i in 0 until repeatTimes) {
                var speechCompleted = false
                ttsAnnouncer.speak(
                    text = announcementText,
                    rate = settings.speechRate,
                    pitch = settings.speechPitch,
                    onDone = { speechCompleted = true }
                )

                // Wait for speech to complete or loop interval
                var waitedMs = 0
                while (!speechCompleted && waitedMs < 6000) {
                    delay(200)
                    waitedMs += 200
                }
                delay(1200) // Pause between repeated announcements
            }
        }
    }

    fun triggerTestAnnouncement(customText: String) {
        stopCurrentAnnouncement()
        serviceScope.launch {
            val settings = settingsManager.settings.value
            ttsAnnouncer.speak(
                text = customText,
                rate = settings.speechRate,
                pitch = settings.speechPitch
            )
        }
    }

    private fun stopCurrentAnnouncement() {
        announcementJob?.cancel()
        announcementJob = null
        ttsAnnouncer.stop()
    }

    private fun startForegroundServiceWithNotification() {
        val channelId = "caller_announcer_channel"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Bluetooth Caller Announcer",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notification when Bluetooth Caller Announcer is monitoring incoming calls"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val openAppIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Caller Announcer Active")
            .setContentText("Listening for incoming calls when Bluetooth headphones are connected")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCurrentAnnouncement()
        ttsAnnouncer.shutdown()
        _serviceRunningState.value = false
        Log.d("CallAnnouncerService", "Service destroyed")
    }

    override fun onBind(intent: Intent?): IBinder = binder

    companion object {
        const val NOTIFICATION_ID = 1001
        const val ACTION_PROCESS_CALL_STATE = "com.example.service.PROCESS_CALL_STATE"
        const val ACTION_STOP_SERVICE = "com.example.service.STOP_SERVICE"
        const val EXTRA_INCOMING_NUMBER = "extra_incoming_number"
        const val EXTRA_CALL_STATE = "extra_call_state"
    }
}
