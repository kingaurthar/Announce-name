package com.example.ui

import android.Manifest
import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.AnnouncementLog
import com.example.data.AppDatabase
import com.example.data.AppSettings
import com.example.data.AppSettingsManager
import com.example.service.BluetoothDeviceInfo
import com.example.service.BluetoothHelper
import com.example.service.CallAnnouncerService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class BluetoothAnnouncerViewModel(application: Application) : AndroidViewModel(application) {

    private val settingsManager = AppSettingsManager(application)
    private val database = AppDatabase.getDatabase(application)

    val settings: StateFlow<AppSettings> = settingsManager.settings

    private val _bluetoothInfo = MutableStateFlow(
        BluetoothHelper.checkBluetoothHeadphoneStatus(application)
    )
    val bluetoothInfo: StateFlow<BluetoothDeviceInfo> = _bluetoothInfo.asStateFlow()

    private val _recentLogs = MutableStateFlow<List<AnnouncementLog>>(emptyList())
    val recentLogs: StateFlow<List<AnnouncementLog>> = _recentLogs.asStateFlow()

    private val _permissionStatusMap = MutableStateFlow<Map<String, Boolean>>(emptyMap())
    val permissionStatusMap: StateFlow<Map<String, Boolean>> = _permissionStatusMap.asStateFlow()

    private val _isIgnoringBatteryOptimizations = MutableStateFlow(true)
    val isIgnoringBatteryOptimizations: StateFlow<Boolean> = _isIgnoringBatteryOptimizations.asStateFlow()

    private var announcerService: CallAnnouncerService? = null
    private val _isServiceBound = MutableStateFlow(false)
    val isServiceBound: StateFlow<Boolean> = _isServiceBound.asStateFlow()

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as? CallAnnouncerService.LocalBinder
            announcerService = binder?.getService()
            _isServiceBound.value = true
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            announcerService = null
            _isServiceBound.value = false
        }
    }

    init {
        checkPermissions()
        refreshBluetoothStatus()
        checkBatteryOptimizationStatus()
        observeDatabaseLogs()
        bindServiceIfEnabled()
    }

    fun refreshBluetoothStatus() {
        _bluetoothInfo.value = BluetoothHelper.checkBluetoothHeadphoneStatus(getApplication())
        checkBatteryOptimizationStatus()
    }

    fun checkBatteryOptimizationStatus() {
        val context = getApplication<Application>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isIgnoring = powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: true
            _isIgnoringBatteryOptimizations.value = isIgnoring
        } else {
            _isIgnoringBatteryOptimizations.value = true
        }
    }

    fun requestIgnoreBatteryOptimizations(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                try {
                    val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(fallbackIntent)
                } catch (ex: Exception) {
                    ex.printStackTrace()
                }
            }
        }
    }

    fun checkPermissions() {
        val context = getApplication<Application>()
        val map = mutableMapOf<String, Boolean>()

        map[Manifest.permission.READ_PHONE_STATE] = ContextCompat.checkSelfPermission(
            context, Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED

        map[Manifest.permission.READ_CONTACTS] = ContextCompat.checkSelfPermission(
            context, Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            map[Manifest.permission.BLUETOOTH_CONNECT] = ContextCompat.checkSelfPermission(
                context, Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            map[Manifest.permission.BLUETOOTH] = ContextCompat.checkSelfPermission(
                context, Manifest.permission.BLUETOOTH
            ) == PackageManager.PERMISSION_GRANTED
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            map[Manifest.permission.POST_NOTIFICATIONS] = ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        }

        _permissionStatusMap.value = map
    }

    private fun observeDatabaseLogs() {
        viewModelScope.launch {
            database.announcementDao().getAllLogs().collectLatest { logs ->
                _recentLogs.value = logs
            }
        }
    }

    fun toggleServiceEnabled(enable: Boolean) {
        settingsManager.updateServiceEnabled(enable)
        val context = getApplication<Application>()

        if (enable) {
            startAndBindService(context)
        } else {
            unbindAndStopService(context)
        }
    }

    private fun bindServiceIfEnabled() {
        if (settings.value.isServiceEnabled) {
            startAndBindService(getApplication())
        }
    }

    fun startAndBindService(context: Context) {
        val intent = Intent(context, CallAnnouncerService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun unbindAndStopService(context: Context) {
        if (_isServiceBound.value) {
            try {
                context.unbindService(serviceConnection)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            _isServiceBound.value = false
        }
        val intent = Intent(context, CallAnnouncerService::class.java)
        context.stopService(intent)
    }

    fun testTTSAnnouncement(customText: String) {
        announcerService?.triggerTestAnnouncement(customText)
    }

    fun simulateCall(number: String, name: String? = null) {
        announcerService?.processIncomingCall(
            rawNumber = number.ifBlank { "+15550192834" },
            simulatedName = name?.ifBlank { null },
            isSimulated = true
        )
    }

    fun updatePrefix(prefix: String) = settingsManager.updatePrefix(prefix)
    fun updateRepeatCount(count: Int) = settingsManager.updateRepeatCount(count)
    fun updateSpeakUnknownNumbers(speak: Boolean) = settingsManager.updateSpeakUnknownNumbers(speak)
    fun updateSpeechRate(rate: Float) = settingsManager.updateSpeechRate(rate)
    fun updateSpeechPitch(pitch: Float) = settingsManager.updateSpeechPitch(pitch)
    fun updateOnlyWhenBluetoothConnected(onlyBt: Boolean) = settingsManager.updateOnlyWhenBluetoothConnected(onlyBt)

    fun clearLogs() {
        viewModelScope.launch {
            database.announcementDao().clearLogs()
        }
    }

    override fun onCleared() {
        super.onCleared()
        if (_isServiceBound.value) {
            try {
                getApplication<Application>().unbindService(serviceConnection)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
